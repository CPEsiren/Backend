// FILEPATH: d:/CPE-Siren/Backend/src/controllers/LogUserController.ts

import { Request, Response } from "express";
import LogUser from "../models/LogUser";

export const getLogUser = async (req: Request, res: Response) => {
  try {
    const logs = await LogUser.find({});

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
    return res.status(500).json({ message: "Internal Server Error" });
  }
};
