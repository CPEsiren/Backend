import { addLog } from "../services/logService";
import { Request, Response } from "express";
import Event from "../models/Event";

const getEvent = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const event = await Event.findById(id);
    if (!event) {
      await addLog("WARNING", "Event not found", false);
      return res.status(404).json({ message: "Event not found" });
    }

    await addLog("INFO", "Event retrieved successfully", false);
    res.status(200).json(event);
  } catch (error) {
    await addLog("ERROR", "Error retrieving event: " + error, false);
    res.status(500).json({ message: "Internal server error" });
  }
};

const getEvents = async (req: Request, res: Response) => {
  try {
    const events = await Event.find();

    await addLog("INFO", "Events retrieved successfully", false);
    res.status(200).json({ message: "Events retrieved successfully", events });
  } catch (error) {
    await addLog("ERROR", "Error retrieving events: " + error, false);
    res.status(500).json({ message: "Internal server error" });
  }
};

export { getEvent, getEvents };
