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
    const events = await Event.find();

    res.status(200).json({ message: "Events retrieved successfully", events });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};

export { getEvent, getEvents };
