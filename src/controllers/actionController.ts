import { Request, Response } from "express";
import Action from "../models/Action";

const getActionById = async (
  request: Request,
  response: Response
): Promise<void> => {
  const { id } = request.params;

  try {
    console.log(`Attempting to find action with id ${id}`);
    const action = await Action.findById(id).populate("triggerId mediaId");

    if (!action) {
      console.log(`Action not found with id ${id}`);
      response.status(404).json({ message: "Action not found" });
      return;
    }

    console.log(`Found action with id ${id}`);
    response.status(200).json(action);
  } catch (error) {
    console.log(`Error finding action with id ${id}: ${error}`);
    response.status(500).json({ message: "Internal server error" });
  }
};

const getActions = async (req: Request, res: Response) => {
  try {
    const actions = await Action.find();
    const total = await Action.countDocuments();

    res.status(200).json({
      actions,
      total,
    });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};

const createAction = async (req: Request, res: Response) => {
  const session = await Action.startSession();
  session.startTransaction();

  try {
    const { action_name, media_id, messageTemplate } = req.body;

    if (!action_name || !media_id || !messageTemplate) {
      await session.abortTransaction();
      session.endSession();

      return res.status(400).json({ message: "Missing required fields" });
    }

    const newAction = new Action({
      action_name,
      media_id,
      messageTemplate,
      enabled: true, // Default to enabled
    });

    await newAction.save({ session });

    await session.commitTransaction();
    session.endSession();

    res.status(201).json({
      message: "Action created successfully",
      action: newAction,
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("Error creating action:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const updateAction = async (req: Request, res: Response) => {
  const session = await Action.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;
    const { name, media_id, messageTemplate, enabled } = req.body;

    const action = await Action.findById(id).session(session);
    if (!action) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: "Action not found" });
    }

    if (name) action.action_name = name;
    if (media_id) action.media_id = media_id;
    if (messageTemplate) action.messageTemplate = messageTemplate;
    if (enabled !== undefined) action.enabled = enabled;

    await action.save({ session });

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({
      message: "Action updated successfully",
      action,
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    res.status(500).json({ message: "Internal server error" });
  }
};

const deleteAction = async (req: Request, res: Response) => {
  const session = await Action.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;

    const action = await Action.findByIdAndDelete(id).session(session);
    if (!action) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: "Action not found" });
    }

    await session.commitTransaction();
    session.endSession();

    res
      .status(200)
      .json({ message: `Action ${action.action_name} deleted successfully` });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();

    res.status(500).json({ message: "Internal server error" });
  }
};

export { getActionById, getActions, createAction, updateAction, deleteAction };
