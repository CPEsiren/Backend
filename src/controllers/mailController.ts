import { Request, Response } from "express";
import { send } from "../services/mailService";

export const sendMail = async (req: Request, res: Response) => {
  try {
    const { to, subject, message } = req.body;

    if (!to || !subject || !message) {
      return res.status(400).json({
        status: "fail",
        message: "Missing required fields.",
        requiredFields: ["to", "subject", "message"],
      });
    }

    const sent: boolean = await send({
      message: message,
      to: to,
      subject,
    });

    res.status(201).json({
      status: "success",
      message: "Send successfully.",
      data: sent,
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Error creating data.",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};
