import { Request, Response } from "express";
import Event, { IEvent } from "../models/Event";

const getEvent = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const event = await Event.findById(id);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    res.status(200).json(event);
  } catch (error) {
    res.status(500).json({ status: "fail", message: error });
  }
};

const getEvents = async (req: Request, res: Response) => {
  try {
    const events = await Event.find().sort({ createdAt: -1 }).lean().exec();

    const eventproblems: any[] = [];
    const evetohter: any[] = [];

    events.map((event) => {
      if (event.status === "PROBLEM") {
        eventproblems.push(event);
      } else {
        evetohter.push(event);
      }
    });

    if (!events.length) {
      return res.status(404).json({
        status: "fail",
        message: "No events found",
      });
    }

    res.status(200).json({
      status: "success",
      message: "Events retrieved successfully",
      data: [...eventproblems, ...evetohter],
    });
  } catch (error) {
    console.error("Failed to retrieve events:", error);
    res.status(500).json({ status: "fail", message: error });
  }
};

export { getEvent, getEvents };
