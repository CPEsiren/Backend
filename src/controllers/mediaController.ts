import { Request, Response } from "express";
import { User } from "../models/User";
import Media from "../models/Media";
import { createTime } from "../middleware/Time";

const getMedia = async (req: Request, res: Response) => {
  try {
    const media = await Media.find();

    if (media.length === 0) {
      return res
        .status(404)
        .json({ status: "fail", message: "No media found." });
    }

    res.status(200).json({
      status: "success",
      data: media,
    });
  } catch (error) {
    res.status(500).json({ status: "fail", message: "Internal server error" });
  }
};

const getMediaUser = async (req: Request, res: Response) => {
  try {
    const { user_id } = req.params;

    const media = await Media.find({ user_id: user_id });

    if (media.length === 0) {
      return res
        .status(404)
        .json({ status: "fail", message: "User has no media." });
    }

    res.status(200).json({
      status: "success",
      data: media,
    });
  } catch (error) {
    res.status(500).json({ status: "fail", message: "Internal server error" });
  }
};

const createMedia = async (req: Request, res: Response) => {
  try {
    const { user_id, type, recipients, disciption, enabled } = req.body;

    const requiredFields = ["user_id", "type", "recipients", "enabled"];

    const missingFields = requiredFields.filter((field) => !req.body[field]);

    if (missingFields.length > 0) {
      return res.status(400).json({
        status: "fail",
        message: "Missing required fields.",
        requiredFields: missingFields,
      });
    }

    const user = await User.findById(user_id);

    if (!user) {
      return res
        .status(404)
        .json({ status: "fail", message: "User not found" });
    }

    const newMedia = new Media({
      user_id,
      type,
      recipients,
      disciption,
      enabled,
      createdAt: await createTime(),
    });

    await newMedia.save();

    res.status(201).json({
      status: "success",
      message: `Media [${type}] of user [${user_id}] created successfully`,
      data: newMedia,
    });
  } catch (error) {
    res
      .status(500)
      .json({ status: "fail", message: `Error creating media: ${error}` });
  }
};

const updateMedia = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const media = Media.findById(id);

    if (!media) {
      return res
        .status(404)
        .json({ status: "fail", message: "Media not found" });
    }

    const { user_id, type, recipients, disciption, enabled } = req.body;

    const updateMedia = await Media.findByIdAndUpdate(id, {
      user_id,
      type,
      recipients,
      disciption,
      enabled,
      updatedAt: await createTime(),
    });

    res.status(200).json({
      status: "success",
      message: `Media [${id}] of user [${updateMedia?.user_id}] updated successfully`,
      data: media,
    });
  } catch (error) {
    res
      .status(500)
      .json({ status: "fail", message: `Error updating media: ${error}` });
  }
};

const deleteMedia = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const media = await Media.findByIdAndDelete(id);
    if (!media) {
      return res
        .status(404)
        .json({ status: "fail", message: "Media not found" });
    }

    res.status(200).json({
      status: "success",
      message: `Media [${media.type}] of user [${media.user_id}] deleted successfully`,
    });
  } catch (error) {
    res
      .status(500)
      .json({ status: "fail", message: `Error deleting media: ${error}` });
  }
};

export { getMedia, getMediaUser, createMedia, updateMedia, deleteMedia };
