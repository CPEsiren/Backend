import Host from "../models/Host";
import Item from "../models/Item";
import { Request, Response } from "express";
import { ObjectId } from "mongodb";

export const getAllHosts = async (req: Request, res: Response) => {
  try {
    const hosts = await Host.find();

    if (hosts.length === 0) {
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
  } catch (err) {
    res.status(500).json({
      status: "error",
      message: "Error fetching hosts.",
      error: err instanceof Error ? err.message : "Unknown error",
    });
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
      templates,
      details,
      items,
    } = req.body;

    if (
      !hostname ||
      !ip_address ||
      !snmp_port ||
      !snmp_version ||
      !snmp_community ||
      !hostgroup
    ) {
      return res.status(400).json({
        status: "fail",
        message: "Missing required fields.",
        requiredFields: [
          "hostname",
          "ip_address",
          "snmp_port",
          "snmp_version",
          "snmp_community",
          "hostgroup",
        ],
      });
    }

    const newHost = new Host({
      hostname,
      ip_address,
      snmp_port,
      snmp_version,
      snmp_community,
      hostgroup,
      templates,
      details,
    });
    await newHost.save();

    if (Array.isArray(items) && items.length > 0) {
      const itemDocument = items.map((item) => ({
        ...item,
        host_id: newHost._id,
      }));

      const insertedItems = await Item.insertMany(itemDocument);
      const itemIds = insertedItems.map((item) => item._id);

      newHost.items = itemIds;

      await newHost.save();
    }
    res.status(201).json({
      status: "success",
      message: "Host created successfully.",
      data: newHost,
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Error creating host.",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const deleteHost = async (req: Request, res: Response) => {
  try {
    const host_id = req.query.id;

    if (!host_id) {
      return res.status(400).json({
        status: "fail",
        message: "Host ID is required to delete a host.",
      });
    }

    const host = await Host.findById(host_id);

    if (!host) {
      return res.status(404).json({
        status: "fail",
        message: `No host found with ID: ${host_id}.`,
      });
    }

    const itemIds = host.items;

    const result = await Host.deleteOne({ _id: host_id });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        status: "fail",
        message: `Failed to delete host with ID: ${host_id}.`,
      });
    }

    await Item.deleteMany({ _id: { $in: itemIds } });

    res.status(200).json({
      status: "success",
      message: `Host with ID: ${host_id} deleted successfully.`,
    });
  } catch (err) {
    res.status(500).json({
      status: "error",
      message: "Failed to delete host.",
      error: err instanceof Error ? err.message : "Unknown error",
    });
  }
};
