// FILEPATH: d:/CPE-Siren/Backend/src/controllers/LogUserController.ts

import { Request, Response } from "express";
import LogUser from "../models/LogUser";

// Get all logs
export const getLogUser = async (req: Request, res: Response) => {
  try {
    const logs = await LogUser.find().sort({ createdAt: -1 }).lean().exec();

    if (logs.length === 0) {
      return res.status(404).json({ message: "No logs found" });
    }

    return res.status(200).json({
      status: "success",
      message: "Logs retrieved successfully",
      logs,
    });
  } catch (error) {
    console.error("Error get log user : ", error);
    return res.status(500).json({ message: error });
  }
};

// Create a new log entry
export const createLogUser = async (req: Request, res: Response) => {
  try {
    const { username, role, activity } = req.body;

    // Validate required fields
    if (!username || !role || !activity) {
      return res.status(400).json({
        message:
          "Missing required fields. username, role, and activity are required.",
      });
    }

    // Create new log
    const newLog = new LogUser({
      username,
      role,
      activity,
    });

    // Save to database
    await newLog.save();

    return res.status(201).json({
      status: "success",
      message: "Log created successfully",
      log: newLog,
    });
  } catch (error) {
    console.error("Error creating log: ", error);
    return res.status(500).json({ message: error });
  }
};

// Helper function to create logs from other controllers
export const createActivityLog = async (
  username: string,
  role: string,
  activity: string
) => {
  try {
    const newLog = new LogUser({
      username,
      role,
      activity,
    });

    await newLog.save();
    return true;
  } catch (error) {
    console.error("Error creating activity log: ", error);
    return false;
  }
};
