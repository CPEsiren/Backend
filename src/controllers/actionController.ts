import { Request, Response } from "express";
import Action from "../models/Action";
import { createTime } from "../middleware/Time";
import Media from "../models/Media";
import mongoose from "mongoose";

const getActionById = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  try {
    const action = await Action.findById(id);

    if (!action) {
      res.status(404).json({ status: "fail", message: "Action not found" });
      return;
    }

    res.status(200).json({ status: "success", data: action });
  } catch (error) {
    res.status(500).json({ status: "fail", message: "Internal server error" });
  }
};

const getActionUser = async (req: Request, res: Response) => {
  const { user_id } = req.params;

  try {
    const actions = await Action.find({ user_id }).select(
      "-user_id -__v -createdAt -updatedAt"
    );

    if (actions.length === 0) {
      res
        .status(404)
        .json({ status: "fail", message: `User ${user_id} has no actions` });
      return;
    }

    await Media.populate(actions, {
      path: "media_id",
      model: "Media",
      select: "type -_id",
    });

    res.status(200).json({
      status: "success",
      data: actions,
    });
  } catch (error) {
    res.status(500).json({ status: "fail", message: "Internal server error" });
  }
};

const getActions = async (req: Request, res: Response) => {
  try {
    const actions = await Action.find();

    if (!actions) {
      res.status(404).json({ status: "fail", message: "Actions not found" });
      return;
    }

    res.status(200).json({
      status: "success",
      data: actions,
    });
  } catch (error) {
    res.status(500).json({ status: "fail", message: "Internal server error" });
  }
};

const createAction = async (req: Request, res: Response) => {
  const session = await Action.startSession();
  session.startTransaction();

  try {
    const {
      action_name,
      user_id,
      media,
      subjectProblemTemplate,
      messageProblemTemplate,
      subjectRecoveryTemplate,
      messageRecoveryTemplate,
      duration,
      enabled,
    } = req.body;

    const requiredFields = [
      "action_name",
      "user_id",
      "media",
      "subjectProblemTemplate",
      "messageProblemTemplate",
      "subjectRecoveryTemplate",
      "messageRecoveryTemplate",
      "duration",
      "enabled",
    ];
    const missingFields = requiredFields.filter((field) => !req.body[field]);

    if (missingFields.length > 0) {
      await session.abortTransaction();
      session.endSession();

      return res.status(400).json({
        status: "fail",
        message: "Missing required fields.",
        requiredFields: missingFields,
      });
    }

    const media_ids: mongoose.Types.ObjectId[] = [];

    if (media === "email") {
      const mediaEmail = await Media.findOne({
        user_id: user_id,
        type: "email",
      });

      if (!mediaEmail) {
        await session.abortTransaction();
        session.endSession();

        return res.status(404).json({
          status: "fail",
          message: "Media Email not found",
        });
      }

      media_ids.push(mediaEmail._id as mongoose.Types.ObjectId);
    }

    if (media === "line") {
      const mediaLine = await Media.findOne({ type: "line" });

      if (!mediaLine) {
        await session.abortTransaction();
        session.endSession();

        return res.status(404).json({
          status: "fail",
          message: "Media Line not found",
        });
      }

      media_ids.push(mediaLine._id as mongoose.Types.ObjectId);
    }

    if (media === "all media") {
      const mediaLine = await Media.findOne({ type: "line" });
      const mediaEmail = await Media.findOne({ type: "email" });

      if (!mediaLine) {
        await session.abortTransaction();
        session.endSession();

        return res.status(404).json({
          status: "fail",
          message: "Media Line not found",
        });
      } else if (!mediaEmail) {
        await session.abortTransaction();
        session.endSession();

        return res.status(404).json({
          status: "fail",
          message: "Media Email not found",
        });
      }

      media_ids.push(mediaLine._id as mongoose.Types.ObjectId);
      media_ids.push(mediaEmail._id as mongoose.Types.ObjectId);
    }

    const newAction = new Action({
      action_name,
      user_id,
      media_ids,
      subjectProblemTemplate,
      messageProblemTemplate,
      subjectRecoveryTemplate,
      messageRecoveryTemplate,
      duration,
      enabled,
      createdAt: await createTime(), // Default to enabled
    });

    await newAction.save({ session });

    await session.commitTransaction();
    session.endSession();

    res.status(201).json({
      status: "success",
      message: "Action created successfully",
      data: newAction,
    });
  } catch (error) {
    console.log("Internal server error", error);
    await session.abortTransaction();
    session.endSession();

    res.status(500).json({ status: "fail", message: "Internal server error" });
  }
};

const updateAction = async (req: Request, res: Response) => {
  const session = await Action.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;
    const {
      action_name,
      user_id,
      media_id,
      messageProblemTemplate,
      messageRecoveryTemplate,
      duration,
      enabled,
    } = req.body;

    const action = await Action.findByIdAndUpdate(id, {
      action_name,
      user_id,
      media_id,
      messageProblemTemplate,
      messageRecoveryTemplate,
      duration,
      enabled,
    }).session(session);

    if (!action) {
      await session.abortTransaction();
      session.endSession();
      return res
        .status(404)
        .json({ status: "fail", message: "Action not found" });
    }

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({
      status: "success",
      message: "Action updated successfully",
      data: action,
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    res.status(500).json({ status: "fail", message: "Internal server error" });
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
      return res
        .status(404)
        .json({ status: "fail", message: "Action not found" });
    }

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({
      status: "success",
      message: `Action ${action.action_name} deleted successfully`,
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();

    res.status(500).json({ status: "fail", message: "Internal server error" });
  }
};

export {
  getActionById,
  getActionUser,
  getActions,
  createAction,
  updateAction,
  deleteAction,
};
