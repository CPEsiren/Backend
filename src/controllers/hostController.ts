import { clearSchedule, scheduleItem } from "../services/schedulerService";
import { fetchDetailHost } from "../services/snmpService";
import { Request, Response } from "express";
import Host from "../models/Host";
import Item from "../models/Item";
import Data from "../models/Data";
import mongoose from "mongoose";
import Trend from "../models/Trend";

export const getAllHosts = async (req: Request, res: Response) => {
  try {
    const hosts = await Host.find().populate("items").lean().exec();

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
    res.status(500).json({
      status: "error",
      message: "Error fetching hosts.",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const getHostById = async (req: Request, res: Response) => {
  try {
    const host_id = req.params.id;

    if (!host_id || !mongoose.Types.ObjectId.isValid(host_id)) {
      return res.status(400).json({
        status: "fail",
        message: "Invalid host ID is required.",
      });
    }

    const host = await Host.findById(host_id).populate("items").lean().exec();

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
    res.status(500).json({
      status: "error",
      message: "Error fetching host.",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const createHost = async (req: Request, res: Response) => {
  const session = await mongoose.startSession();
  session.startTransaction();

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
    } = req.body;

    const requiredFields = [
      "hostname",
      "ip_address",
      "snmp_port",
      "snmp_version",
      "snmp_community",
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

    const detailsHost = await fetchDetailHost(
      ip_address,
      snmp_community,
      snmp_port,
      snmp_version
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
    });

    await newHost.save({ session });

    let itemDocuments: any[] = [];

    if (Array.isArray(items) && items.length > 0) {
      items.forEach((item: any) => {
        item.type = item.type.toLocaleLowerCase();
        itemDocuments.push({
          ...item,
          host_id: newHost._id,
        });
      });
    }

    if (itemDocuments.length > 0) {
      const insertedItems = await Item.insertMany(itemDocuments, { session });
      insertedItems.forEach((item) => scheduleItem(item));
      newHost.items = insertedItems.map(
        (item) => item._id
      ) as mongoose.Types.ObjectId[];
      await newHost.save({ session });
    }

    await session.commitTransaction();
    session.endSession();

    const createdHost = await Host.findById(newHost._id);

    res.status(201).json({
      status: "success",
      message: `Host [${newHost.hostname}] created successfully.`,
      data: createdHost,
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();

    res.status(500).json({
      status: "error",
      message: "Error creating host.",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const deleteHost = async (req: Request, res: Response) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const host_id = req.params.id;

    if (!host_id || !mongoose.Types.ObjectId.isValid(host_id)) {
      return res.status(400).json({
        status: "fail",
        message: "Valid host ID is required to delete a host.",
      });
    }

    const deletedHost = await Host.findByIdAndDelete(host_id).session(session);

    if (!deletedHost) {
      throw new Error(`No host found with ID: ${host_id}`);
    }

    if (
      deletedHost.items &&
      Array.isArray(deletedHost.items) &&
      deletedHost.items.length > 0
    ) {
      deletedHost.items.forEach((itemId) => {
        clearSchedule(itemId.toString());
      });

      await Item.deleteMany({
        _id: { $in: deletedHost.items },
      }).session(session);
    }

    await session.commitTransaction();
    session.endSession();

    await Data.deleteMany({
      "metadata.host_id": new mongoose.Types.ObjectId(host_id),
    });

    await Trend.deleteMany({
      "metadata.host_id": new mongoose.Types.ObjectId(host_id),
    });

    res.status(200).json({
      status: "success",
      message: `Host with ID: ${host_id} and its associated items deleted successfully.`,
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();

    if (error instanceof Error && error.message.startsWith("No host found")) {
      return res.status(404).json({
        status: "fail",
        message: error.message,
      });
    }

    res.status(500).json({
      status: "error",
      message: "Failed to delete host.",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const updateHost = async (req: Request, res: Response) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const host_id = req.params.id;

    if (!host_id || !mongoose.Types.ObjectId.isValid(host_id)) {
      return res.status(400).json({
        status: "fail",
        message: "Valid host ID is required to update a host.",
      });
    }

    const {
      hostname,
      ip_address,
      snmp_port,
      snmp_version,
      snmp_community,
      hostgroup,
      name_template,
      details,
    } = req.body;

    const updatedHost = await Host.findByIdAndUpdate(
      host_id,
      {
        hostname,
        ip_address,
        snmp_port,
        snmp_version,
        snmp_community,
        hostgroup,
        name_template,
        details,
      },
      { new: true, session }
    );

    if (!updatedHost) {
      throw new Error(`No host found with ID: ${host_id}`);
    }

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({
      status: "success",
      message: `Host [${updatedHost.hostname}] updated successfully.`,
      data: updatedHost,
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();

    if (error instanceof Error && error.message.startsWith("No host found")) {
      return res.status(404).json({
        status: "fail",
        message: error.message,
      });
    }

    res.status(500).json({
      status: "error",
      message: "Failed to update host.",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};
