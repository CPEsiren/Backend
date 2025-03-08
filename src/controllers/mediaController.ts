import { Request, Response } from "express";
import { User } from "../models/User";
import Media from "../models/Media";
import mongoose from "mongoose";

const getMedia = async (req: Request, res: Response) => {
  try {
    const media = await Media.find().select("-__v").lean().exec();

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
    console.error("Error fetching media: ", error);
    res
      .status(500)
      .json({ status: "fail", message: `Internal server error : ${error}` });
  }
};

const getMediaUser = async (req: Request, res: Response) => {
  try {
    const { user_id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(user_id)) {
      return res.status(400).json({
        status: "fail",
        message: "Invalid user ID format.",
      });
    }

    const media = await Media.find({ user_id })
      .select("-__v -recipient.send_to")
      .lean()
      .exec();

    if (media.length === 0) {
      return res.status(404).json({
        status: "fail",
        message: "No media found for this user.",
      });
    }

    res.status(200).json({
      status: "success",
      data: media,
    });
  } catch (error) {
    console.error("Error fetching user media: ", error);
    res
      .status(500)
      .json({ status: "fail", message: `Internal server error : ${error}` });
  }
};

const createMedia = async (req: Request, res: Response) => {
  try {
    const {
      user_id,
      type,
      recipient,
      problem_title,
      problem_body,
      recovery_title,
      recovery_body,
    } = req.body;

    const requiredFields = [
      "user_id",
      "type",
      "recipient",
      "problem_title",
      "problem_body",
      "recovery_title",
      "recovery_body",
    ];

    const missingFields = requiredFields.filter((field) => !req.body[field]);

    if (missingFields.length > 0) {
      return res.status(400).json({
        status: "fail",
        message: "Missing required fields.",
        requiredFields: missingFields,
      });
    }

    if (!mongoose.Types.ObjectId.isValid(user_id)) {
      return res.status(400).json({
        status: "fail",
        message: "Invalid user ID format.",
      });
    }

    const user = await User.findById(user_id);

    if (!user) {
      return res
        .status(404)
        .json({ status: "fail", message: "User not found" });
    }

    const mediaAlreadyExists = await Media.findOne({
      recipient,
    });

    if (mediaAlreadyExists) {
      return res.status(400).json({
        status: "fail",
        message: "Media already exists",
      });
    }

    const newMedia = new Media({
      user_id,
      type,
      recipient,
      problem_title,
      problem_body,
      recovery_title,
      recovery_body,
    });

    await newMedia.save();

    res.status(201).json({
      status: "success",
      message: `Media [${type}] of user [${user_id}] created successfully`,
      data: newMedia,
    });
  } catch (error) {
    console.error("Error creating media: ", error);
    res.status(500).json({ status: "fail", message: error });
  }
};

const updateMedia = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        status: "fail",
        message: "Invalid media ID format.",
      });
    }

    const updateFields = [
      "problem_title",
      "problem_body",
      "recovery_title",
      "recovery_body",
      "enabled",
    ];
    const updateData: { [key: string]: any } = {};

    updateFields.forEach((field) => {
      if (field in req.body) {
        updateData[field] = req.body[field];
      }
    });

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        status: "fail",
        message: "No valid update fields provided.",
      });
    }

    const updatedMedia = await Media.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    }).lean();

    if (!updatedMedia) {
      return res.status(404).json({
        status: "fail",
        message: "Media not found",
      });
    }

    res.status(200).json({
      status: "success",
      message: `Media [${id}] updated successfully`,
      data: updatedMedia,
    });
  } catch (error) {
    console.error("Error updating media: ", error);
    res.status(500).json({ status: "fail", message: error });
  }
};

const deleteMedia = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        status: "fail",
        message: "Invalid media ID format.",
      });
    }

    const deletedMedia = await Media.findByIdAndDelete(id).lean();

    if (!deletedMedia) {
      return res.status(404).json({
        status: "fail",
        message: "Media not found",
      });
    }

    res.status(200).json({
      status: "success",
      message: `Media [${deletedMedia.type}] of user [${deletedMedia.user_id}] deleted successfully`,
    });
  } catch (error) {
    console.error("Error deleting media:", error);
    res.status(500).json({ status: "fail", message: error });
  }
};

export { getMedia, getMediaUser, createMedia, updateMedia, deleteMedia };
