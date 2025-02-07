import { Request, Response } from "express";
import Alert from "../models/Alert";

export const getAllAlerts = async (req: Request, res: Response) => {
  try {
    const alerts = await Alert.find().lean().exec();

    if (!alerts.length) {
      return res.status(404).json({
        status: "fail",
        message: "No alerts found.",
      });
    }

    res.status(200).json({
      status: "success",
      message: "Alerts fetched successfully.",
      data: alerts,
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Error fetching alerts.",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};
