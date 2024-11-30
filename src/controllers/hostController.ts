import mongoose from "mongoose";
import Host from "../models/Host";
import Item from "../models/Item";
import { Request, Response } from "express";
import { ObjectId } from "mongodb";

export const getAllHosts = async (req: Request, res: Response) => {
  try {
    const hosts = await Host.find().lean().exec();

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
      name_template,
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

    const newHost = new Host({
      hostname,
      ip_address,
      snmp_port,
      snmp_version,
      snmp_community,
      hostgroup,
      name_template,
      details,
    });

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

    await session.commitTransaction();
    session.endSession();

    res.status(201).json({
      status: "success",
      message: "Host created successfully.",
      data: newHost,
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
    const host_id = req.query.id as string;

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
      await Item.deleteMany({ _id: { $in: deletedHost.items } }).session(
        session
      );
    }

    await session.commitTransaction();
    session.endSession();

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
    const host_id = req.query.id as string;

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
      items,
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

    // Update items
    if (Array.isArray(items)) {
      // Remove existing items
      await Item.deleteMany({ host_id: updatedHost._id }).session(session);

      // Add new items
      if (items.length > 0) {
        const itemDocuments = items.map((item) => ({
          ...item,
          host_id: updatedHost._id,
        }));

        const insertedItems = await Item.insertMany(itemDocuments, { session });
        updatedHost.items = insertedItems.map((item) => item._id);
        await updatedHost.save({ session });
      } else {
        updatedHost.items = [];
        await updatedHost.save({ session });
      }
    }

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({
      status: "success",
      message: "Host updated successfully.",
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
