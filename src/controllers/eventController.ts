import { Request, Response } from "express";
import Event from "../models/Event";

const getEvent = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const event = await Event.findById(id);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    res.json(event);
  } catch (error) {
    console.error("Error retrieving event:", error);
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

    res.json({
      events,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
    });
  } catch (error) {
    console.error("Error retrieving events:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const createEvent = async (req: Request, res: Response) => {
  try {
    const { triggerId, message, status } = req.body;

    if (!triggerId || !message) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const newEvent = new Event({
      triggerId,
      message,
      status: status || "open",
      timestamp: new Date(),
    });

    await newEvent.save();

    res.status(201).json({
      message: "Event created successfully",
      event: newEvent,
    });
  } catch (error) {
    console.error("Error creating event:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const updateEvent = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, message } = req.body;

    const event = await Event.findById(id);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    if (status) event.status = status;
    if (message) event.message = message;

    await event.save();

    res.json({
      message: "Event updated successfully",
      event,
    });
  } catch (error) {
    console.error("Error updating event:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const deleteEvent = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const event = await Event.findByIdAndDelete(id);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    res.json({ message: "Event deleted successfully" });
  } catch (error) {
    console.error("Error deleting event:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export { createEvent, updateEvent, deleteEvent, getEvent, getEvents };
