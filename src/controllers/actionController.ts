import { Request, Response } from "express";
import Action from "../models/Action";
import { createTime } from "../middleware/Time";
import Media from "../models/Media";
import mongoose from "mongoose";

const getActionUser = async (req: Request, res: Response) => {
  const { user_id } = req.params;

  try {
    const actions = await Action.find({ user_id })
      .select("-user_id -__v -createdAt -updatedAt")
      .populate({
        path: "media_ids",
        model: "Media",
        select: "type -_id",
      })
      .lean()
      .exec();

    if (actions.length === 0) {
      res
        .status(404)
        .json({ status: "fail", message: `User ${user_id} has no actions` });
      return;
    }

    res.status(200).json({
      status: "success",
      data: actions,
    });
  } catch (error) {
    console.error("Error fetching user actions:", error);
    res.status(500).json({ status: "fail", message: "Internal server error" });
  }
};

const getActions = async (req: Request, res: Response) => {
  try {
    const actions = await Action.find().select("-__v").lean().exec();

    if (actions.length === 0) {
      res.status(404).json({ status: "fail", message: "No actions found" });
      return;
    }

    res.status(200).json({
      status: "success",
      data: actions,
    });
  } catch (error) {
    console.error("Error fetching actions:", error);
    res.status(500).json({ status: "fail", message: "Internal server error" });
  }
};

const createAction = async (req: Request, res: Response) => {
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
      return res.status(400).json({
        status: "fail",
        message: "Missing required fields.",
        requiredFields: missingFields,
      });
    }

    const media_ids = await getMediaIds(user_id, media);

    if (!media_ids) {
      res.status(404).json({
        status: "fail",
        message: `Media ${media} not found`,
      });
      return;
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
    });

    await newAction.save();

    res.status(201).json({
      status: "success",
      message: "Action created successfully",
      data: newAction,
    });
  } catch (error) {
    console.error("Error creating action:", error);
    res.status(500).json({ status: "fail", message: "Internal server error" });
  }
};

async function getMediaIds(
  user_id: string,
  media: string
): Promise<mongoose.Types.ObjectId[] | null> {
  switch (media) {
    case "email":
      const mediaEmail = await Media.findOne({ user_id, type: "email" });
      return mediaEmail ? [mediaEmail._id as mongoose.Types.ObjectId] : null;
    case "line":
      const mediaLine = await Media.findOne({ type: "line" });
      return mediaLine ? [mediaLine._id as mongoose.Types.ObjectId] : null;
    case "all media":
      const [emailMedia, lineMedia] = await Promise.all([
        Media.findOne({ user_id, type: "email" }),
        Media.findOne({ type: "line" }),
      ]);
      return emailMedia && lineMedia
        ? [
            emailMedia._id as mongoose.Types.ObjectId,
            lineMedia._id as mongoose.Types.ObjectId,
          ]
        : null;
    default:
      return null;
  }
}

const updateAction = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
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

    const media_ids = await getMediaIds(user_id, media);

    if (!media_ids) {
      res.status(404).json({
        status: "fail",
        message: `Media ${media} not found`,
      });
      return;
    }

    const updatedAction = await Action.findByIdAndUpdate(
      id,
      {
        action_name,
        user_id,
        media_ids,
        subjectProblemTemplate,
        messageProblemTemplate,
        subjectRecoveryTemplate,
        messageRecoveryTemplate,
        duration,
        enabled,
      },
      { new: true, runValidators: true }
    );

    if (!updatedAction) {
      res.status(404).json({ status: "fail", message: "Action not found" });
      return;
    }

    res.status(200).json({
      status: "success",
      message: "Action updated successfully",
      data: updatedAction,
    });
  } catch (error) {
    console.error("Error updating action:", error);
    res.status(500).json({ status: "fail", message: "Internal server error" });
  }
};

const deleteAction = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const deletedAction = await Action.findByIdAndDelete(id).lean().exec();

    if (!deletedAction) {
      res.status(404).json({
        status: "fail",
        message: "Action not found",
      });
      return;
    }

    res.status(200).json({
      status: "success",
      message: `Action '${deletedAction.action_name}' deleted successfully`,
    });
  } catch (error) {
    console.error("Error deleting action:", error);
    res.status(500).json({
      status: "fail",
      message: "Internal server error",
    });
  }
};

export { getActionUser, getActions, createAction, updateAction, deleteAction };
