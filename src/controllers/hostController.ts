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

    // Check for required fields
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

    // Create new host
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

    // Save host and create items in a single transaction
    const session = await Host.startSession();
    await session.withTransaction(async () => {
      await newHost.save({ session });

      if (Array.isArray(items) && items.length > 0) {
        const itemDocuments = items.map((item) => ({
          ...item,
          host_id: newHost._id,
        }));

        const insertedItems = await Item.insertMany(itemDocuments, { session });
        newHost.items = insertedItems.map((item) => item._id);
        await newHost.save({ session });
      }
    });
    session.endSession();

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
    const host_id = req.query.id as string;

    // Validate host_id
    if (!host_id || !ObjectId.isValid(host_id)) {
      return res.status(400).json({
        status: "fail",
        message: "Valid host ID is required to delete a host.",
      });
    }

    // Use findOneAndDelete to get the host and delete it in one operation
    const deletedHost = await Host.findOneAndDelete({ _id: host_id });

    if (!deletedHost) {
      return res.status(404).json({
        status: "fail",
        message: `No host found with ID: ${host_id}.`,
      });
    }

    // Delete associated items
    if (
      deletedHost.items &&
      Array.isArray(deletedHost.items) &&
      deletedHost.items.length > 0
    ) {
      await Item.deleteMany({ _id: { $in: deletedHost.items } });
    }

    res.status(200).json({
      status: "success",
      message: `Host with ID: ${host_id} and its associated items deleted successfully.`,
    });
  } catch (err) {
    res.status(500).json({
      status: "error",
      message: "Failed to delete host.",
      error: err instanceof Error ? err.message : "Unknown error",
    });
  }
};
