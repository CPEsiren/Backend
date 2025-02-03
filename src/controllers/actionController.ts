import { addLog } from "../middleware/log";
import { Request, Response } from "express";
import Action from "../models/Action";

const getAction = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const action = await Action.findById(id).populate("triggerId mediaId");
    if (!action) {
      await addLog("WARNNING", `Action with id ${id} not found`, false);
      return res.status(404).json({ message: "Action not found" });
    }

    res.status(200).json(action);
  } catch (error) {
    await addLog("ERROR", `Error retrieving action: ${error}`, false);
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

    await addLog("INFO", `Fetched ${actions.length} actions`, false);
    res.status(200).json({
      actions,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
    });
  } catch (error) {
    await addLog("ERROR", `Error retrieving actions: ${error}`, false);
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
      await addLog(
        "WARNING",
        `Missing required fields for creating action ${action_name}`,
        false
      );
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

    await addLog("INFO", `Action ${action_name} created successfully`, true);

    res.status(201).json({
      message: "Action created successfully",
      action: newAction,
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("Error creating action:", error);
    await addLog("ERROR", `Error creating action: ${error}`, false);
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
      await addLog("WARNING", `Action with id ${id} not found`, false);
      return res.status(404).json({ message: "Action not found" });
    }

    if (name) action.action_name = name;
    if (media_id) action.media_id = media_id;
    if (messageTemplate) action.messageTemplate = messageTemplate;
    if (enabled !== undefined) action.enabled = enabled;

    await action.save({ session });

    await session.commitTransaction();
    session.endSession();
    await addLog(
      "INFO",
      `Action ${action.action_name} updated successfully`,
      true
    );
    res.status(200).json({
      message: "Action updated successfully",
      action,
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    await addLog("ERROR", `Error updating action: ${error}`, false);
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
      await addLog("WARNING", `Action with id ${id} not found`, false);
      return res.status(404).json({ message: "Action not found" });
    }

    await session.commitTransaction();
    session.endSession();

    await addLog(
      "INFO",
      `Action [${action.action_name}] deleted successfully`,
      true
    );
    res
      .status(200)
      .json({ message: `Action ${action.action_name} deleted successfully` });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();

    await addLog("ERROR", `Error deleting action: ${error}`, false);
    res.status(500).json({ message: "Internal server error" });
  }
};

export { getAction, getActions, createAction, updateAction, deleteAction };
