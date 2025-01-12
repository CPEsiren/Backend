import { addLog } from "../services/logService";
import { Request, Response } from "express";
import Alert from "../models/Alert";

export const getAllAlerts = async (req: Request, res: Response) => {
  try {
    const alerts = await Alert.find().lean().exec();

    if (!alerts.length) {
      await addLog("WARNNING", "No alerts found.", false);
      return res.status(404).json({
        status: "fail",
        message: "No alerts found.",
      });
    }

    await addLog("INFO", "Alerts fetched successfully.", false);
    res.status(200).json({
      status: "success",
      message: "Alerts fetched successfully.",
      data: alerts,
    });
  } catch (error) {
    await addLog("ERROR", "Error fetching alerts.", false);
    res.status(500).json({
      status: "error",
      message: "Error fetching alerts.",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};
