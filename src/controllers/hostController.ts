import { clearSchedule, scheduleItem } from "../services/schedulerService";
import { fetchDetailHost } from "../services/snmpService";
import { Request, Response } from "express";
import Host from "../models/Host";
import Item from "../models/Item";
import Data from "../models/Data";
import mongoose from "mongoose";
import Trend from "../models/Trend";
import Trigger, { ITrigger } from "../models/Trigger";
import { createActivityLog } from "../controllers/LogUserController";
import {
  parseExpressionDetailed,
  parseExpressionToItems,
} from "../services/parserService";

export const getAllHosts = async (req: Request, res: Response) => {
  try {
    const hosts = await Host.find()
      .select("-__v")
      .populate({
        path: "items",
        select: "-__v -host_id",
      })
      .lean()
      .exec();

    if (!hosts.length) {
      return res.status(404).json({
        status: "fail",
        message: "No hosts found.",
      });
    }

    res.status(200).json({
      status: "success",
      message: "Hosts fetched successfully.",
      data: hosts,
    });
  } catch (error) {
    console.error("Error fetching hosts:", error);
    res.status(500).json({ status: "fail", message: error });
  }
};

export const getHostById = async (req: Request, res: Response) => {
  try {
    const host_id = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(host_id)) {
      return res.status(400).json({
        status: "fail",
        message: "Invalid host ID format.",
      });
    }

    const host = await Host.findById(host_id)
      .select("-__v")
      .populate({
        path: "items",
        select: "-__v -host_id -isBandwidth",
      })
      .lean()
      .exec();

    if (!host) {
      return res.status(404).json({
        status: "fail",
        message: `No host found with ID: ${host_id}`,
      });
    }

    res.status(200).json({
      status: "success",
      message: "Host fetched successfully.",
      data: host,
    });
  } catch (error) {
    console.error("Error fetching host:", error);
    res.status(500).json({ status: "fail", message: error });
  }
};

export const createHost = async (req: Request, res: Response) => {
  try {
    const {
      hostname,
      ip_address,
      snmp_port,
      snmp_version,
      snmp_community,
      hostgroup,
      template_name,
      details,
      items,
      triggers,
      authenV3,
    } = req.body;

    const requiredFields = [
      "hostname",
      "ip_address",
      "snmp_port",
      "snmp_version",
      "hostgroup",
    ];
    const missingFields = requiredFields.filter((field) => !req.body[field]);

    if (missingFields.length > 0) {
      return res.status(400).json({
        status: "fail",
        message: "Missing required fields.",
        requiredFields: missingFields,
      });
    }

    if (["SNMPv1", "SNMPv2"].includes(snmp_version) && !snmp_community) {
      return res.status(400).json({
        status: "fail",
        message: "SNMP community is required for SNMPv1 and SNMPv2.",
      });
    }

    if (snmp_version === "SNMPv3" && !authenV3) {
      return res.status(400).json({
        status: "fail",
        message: "Authentication details are required for SNMPv3.",
      });
    }

    const detailsHost = await fetchDetailHost(
      ip_address,
      snmp_community,
      snmp_port,
      snmp_version,
      authenV3
    );

    const newHost = new Host({
      hostname,
      ip_address,
      snmp_port,
      snmp_version,
      snmp_community,
      hostgroup,
      template_name,
      interfaces: detailsHost?.interfaces,
      details: { ...details, ...detailsHost?.details },
      status: detailsHost?.status,
      authenV3,
    });

    await newHost.save();

    let itemDocuments = [
      {
        item_name: "Total Inbound Traffic",
        oid: "1.3.6.1.2.1.2.2.1.10",
        type: "counter",
        unit: "bit",
        interval: 60,
        isOverview: true,
        host_id: newHost._id,
      },
      {
        item_name: "Total Outbound Traffic",
        oid: "1.3.6.1.2.1.2.2.1.16",
        type: "counter",
        unit: "bit",
        interval: 60,
        isOverview: true,
        host_id: newHost._id,
      },
    ];

    if (Array.isArray(items) && items.length > 0) {
      const item = items.map((item) => ({
        ...item,
        type: item.type.toLowerCase(),
        host_id: newHost._id,
      }));

      itemDocuments = [...itemDocuments, ...item];
    }

    const insertedItems = await Item.insertMany(itemDocuments);
    insertedItems.forEach((item) => scheduleItem(item));
    newHost.items = insertedItems.map((item) => item._id);
    await newHost.save();

    const createdHost = await Host.findById(newHost._id).lean();

    if (triggers.length > 0) {
      triggers.forEach(async (trigger: ITrigger) => {
        const items: [string, mongoose.Types.ObjectId][] = [];
        const valueItem: number[] = [];
        const addedItemNames = new Set<string>();

        //parse expression
        const parsedItemsExp = new Set(
          parseExpressionToItems(trigger.expression)
        );

        const logicExpression = parseExpressionDetailed(trigger.expression).map(
          (item) => {
            if (Array.isArray(item) && item.length === 3) {
              return "false"; // แทนที่เงื่อนไขด้วย 'false'
            }
            return item[0].toLowerCase(); // คงค่า 'or' หรือ 'and' ไว้
          }
        );

        if (trigger.recovery_expression) {
          const parsedRecoveryItems = parseExpressionToItems(
            trigger.recovery_expression
          );
          parsedRecoveryItems.forEach((item) => parsedItemsExp.add(item));
        }

        if (parsedItemsExp.size === 0) {
          return;
        }

        const logicRecoveryExpression = parseExpressionDetailed(
          trigger.recovery_expression
        ).map((item) => {
          if (Array.isArray(item) && item.length === 3) {
            return "false"; // แทนที่เงื่อนไขด้วย 'false'
          }
          return item[0].toLowerCase(); // คงค่า 'or' หรือ 'and' ไว้
        });

        let type = "item";
        for (const itemName of parsedItemsExp) {
          if (!addedItemNames.has(itemName)) {
            const item = await Item.findOne({
              item_name: itemName,
              host_id: newHost._id,
            });
            if (item) {
              items.push([itemName, item._id]);
              valueItem.push(0);
              addedItemNames.add(itemName);
            }
          }
        }

        const newTrigger = new Trigger({
          trigger_name: trigger.trigger_name,
          type,
          host_id: newHost._id,
          severity: trigger.severity,
          expression: trigger.expression,
          logicExpression,
          items,
          ok_event_generation: trigger.ok_event_generation,
          recovery_expression: trigger.recovery_expression,
          logicRecoveryExpression,
          enabled: true,
          expressionPart: trigger.expressionPart,
          expressionRecoveryPart: trigger.expressionRecoveryPart,
          thresholdDuration: trigger.thresholdDuration,
        });

        // Save the trigger
        await newTrigger.save();
      });
    }

    // Log for activity
    const username = req.body.userName || "system";
    const role = req.body.userRole || "system";
    await createActivityLog(username, role, `Created host: ${hostname}`);

    res.status(201).json({
      status: "success",
      message: `Host [${newHost.hostname}] created successfully.`,
      data: createdHost,
    });
  } catch (error) {
    await Host.findOneAndDelete({
      hostname: req.body.hostname,
      ip_address: req.body.ip_address,
      snmp_port: req.body.snmp_port,
      snmp_version: req.body.snmp_version,
      snmp_community: req.body.snmp_community,
      hostgroup: req.body.hostgroup,
    });
    console.error("Error creating host:", error);
    res.status(500).json({ status: "fail", message: error });
  }
};

export const deleteHost = async (req: Request, res: Response) => {
  const host_id = req.params.id;
  const hostname = req.body.hostname;

  if (!mongoose.Types.ObjectId.isValid(host_id)) {
    return res.status(400).json({
      status: "fail",
      message: "Invalid host ID format.",
    });
  }
  try {
    const deletedHost = await Host.findByIdAndDelete(host_id);

    if (!deletedHost) {
      return res.status(404).json({
        status: "fail",
        message: `No host found with ID: ${host_id}`,
      });
    }

    if (deletedHost.items && deletedHost.items.length > 0) {
      deletedHost.items.forEach((itemId) => clearSchedule(itemId.toString()));

      await Item.deleteMany({
        _id: { $in: deletedHost.items },
      });
    }

    await Promise.all([
      Trigger.deleteMany({
        host_id: new mongoose.Types.ObjectId(host_id),
      }),
      Data.deleteMany({
        "metadata.host_id": new mongoose.Types.ObjectId(host_id),
      }),
      Trend.deleteMany({
        "metadata.host_id": new mongoose.Types.ObjectId(host_id),
      }),
      Trigger.deleteMany({
        host_id: new mongoose.Types.ObjectId(host_id),
      }),
    ]);
    // Log for activity
    const username = req.body.userName || "system";
    const role = req.body.userRole || "system";
    await createActivityLog(username, role, `Deleted host: ${hostname}`);

    res.status(200).json({
      status: "success",
      message: `Host with ID: ${host_id} and its associated items deleted successfully.`,
    });
  } catch (error) {
    console.error("Failed to delete host:", error);
    res.status(500).json({ status: "fail", message: error });
  }
};

export const updateHost = async (req: Request, res: Response) => {
  try {
    const host_id = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(host_id)) {
      return res.status(400).json({
        status: "fail",
        message: "Invalid host ID format.",
      });
    }

    // Get the original host data for logging purposes
    const originalHost: any = await Host.findById(host_id).lean();
    if (!originalHost) {
      return res.status(404).json({
        status: "fail",
        message: `No host found with ID: ${host_id}`,
      });
    }

    const updateFields = [
      "hostname",
      "ip_address",
      "snmp_port",
      "snmp_version",
      "snmp_community",
      "hostgroup",
      "template_name",
      "details",
      "authenV3",
    ];
    const updateData: { [key: string]: any } = {};

    updateFields.forEach((field) => {
      if (field in req.body) {
        updateData[field] = req.body[field];
      }
    });

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        status: "fail",
        message: "No valid update fields provided.",
      });
    }

    if ("snmp_version" in updateData) {
      if (
        ["SNMPv1", "SNMPv2"].includes(updateData.snmp_version) &&
        !updateData.snmp_community
      ) {
        return res.status(400).json({
          status: "fail",
          message: "SNMP community is required for SNMPv1 and SNMPv2.",
        });
      }
      if (updateData.snmp_version === "SNMPv3" && !updateData.authenV3) {
        return res.status(400).json({
          status: "fail",
          message: "Authentication details are required for SNMPv3.",
        });
      }
    }

    const updatedHost = await Host.findByIdAndUpdate(host_id, updateData, {
      new: true,
      runValidators: true,
      lean: true,
    });

    if (!updatedHost) {
      return res.status(404).json({
        status: "fail",
        message: `No host found with ID: ${host_id}`,
      });
    }

    // Generate the change summary for logging
    const changes = Object.keys(updateData)
      .filter(
        (key) =>
          JSON.stringify(updateData[key]) !==
          JSON.stringify(originalHost[key as keyof typeof originalHost])
      )
      .map(
        (key) =>
          `${key}: ${JSON.stringify(
            originalHost[key as keyof typeof originalHost]
          )} → ${JSON.stringify(updateData[key])}`
      )
      .join(", ");

    // Log activity
    const username = req.body.userName || "system";
    const role = req.body.userRole || "system";
    await createActivityLog(
      username,
      role,
      `Updated host: ${updatedHost.hostname} (${updatedHost.ip_address}). Changes: ${changes}`
    );

    res.status(200).json({
      status: "success",
      message: `Host [${updatedHost.hostname}] updated successfully.`,
      data: updatedHost,
    });
  } catch (error) {
    console.error("Failed to update host:", error);
    res.status(500).json({ status: "fail", message: error });
  }
};
