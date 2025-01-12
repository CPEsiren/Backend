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
    const { status, trigger_id, limit = 10, page = 1 } = req.query;

    const query: any = {};
    if (status) query.status = status;
    if (trigger_id) query.trigger_id = trigger_id;

    const skip = (Number(page) - 1) * Number(limit);

    const events = await Event.find(query)
      .populate({
        path: "trigger_id",
        select: "host_id",
        populate: {
          path: "host_id",
          select: "hostname",
        },
      })
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await Event.countDocuments(query);

    await addLog("INFO", "Events retrieved successfully", false);
    res.status(200).json({
      events,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
    });
  } catch (error) {
    await addLog("ERROR", "Error retrieving events: " + error, false);
    res.status(500).json({ message: "Internal server error" });
  }
};

export { getEvent, getEvents };
