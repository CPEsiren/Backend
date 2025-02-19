import { Request, Response } from "express";
import Event from "../models/Event";

const getEvent = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const event = await Event.findById(id);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    res.status(200).json(event);
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};

const getEvents = async (req: Request, res: Response) => {
  try {
    const events = await Event.find().lean().exec();

    if (!events.length) {
      return res.status(404).json({
        status: "fail",
        message: "No events found",
      });
    }

    res.status(200).json({
      status: "success",
      message: "Events retrieved successfully",
      data: events,
    });
  } catch (error) {
    console.error("Failed to retrieve events:", error);
    res.status(500).json({ status: "fail", message: "Internal server error" });
  }
};

export { getEvent, getEvents };
