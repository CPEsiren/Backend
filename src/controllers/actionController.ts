// FILEPATH: /d:/CPE-Siren/Backend/src/controllers/actionController.ts

import { Request, Response } from "express";
import Action from "../models/Action";

const getAction = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const action = await Action.findById(id).populate("triggerId mediaId");
    if (!action) {
      return res.status(404).json({ message: "Action not found" });
    }

    res.json(action);
  } catch (error) {
    console.error("Error retrieving action:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const getActions = async (req: Request, res: Response) => {
  try {
    const { media_id, enabled, limit = 10, page = 1 } = req.query;

    const query: any = {};
    if (media_id) query.media_id = media_id;
    if (enabled !== undefined) query.enabled = enabled === "true";

    const skip = (Number(page) - 1) * Number(limit);

    const actions = await Action.find(query)
      // .populate("media_id")
      .sort({ name: 1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await Action.countDocuments(query);

    res.json({
      actions,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
    });
  } catch (error) {
    console.error("Error retrieving actions:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const createAction = async (req: Request, res: Response) => {
  try {
    const { action_name, media_id, messageTemplate } = req.body;

    if (!action_name || !media_id || !messageTemplate) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const newAction = new Action({
      action_name,
      media_id,
      messageTemplate,
      enabled: true, // Default to enabled
    });

    await newAction.save();

    res.status(201).json({
      message: "Action created successfully",
      action: newAction,
    });
  } catch (error) {
    console.error("Error creating action:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const updateAction = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, media_id, messageTemplate, enabled } = req.body;

    const action = await Action.findById(id);
    if (!action) {
      return res.status(404).json({ message: "Action not found" });
    }

    if (name) action.action_name = name;
    if (media_id) action.media_id = media_id;
    if (messageTemplate) action.messageTemplate = messageTemplate;
    if (enabled !== undefined) action.enabled = enabled;

    await action.save();

    res.json({
      message: "Action updated successfully",
      action,
    });
  } catch (error) {
    console.error("Error updating action:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const deleteAction = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const action = await Action.findByIdAndDelete(id);
    if (!action) {
      return res.status(404).json({ message: "Action not found" });
    }

    res.json({ message: "Action deleted successfully" });
  } catch (error) {
    console.error("Error deleting action:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export { getAction, getActions, createAction, updateAction, deleteAction };
