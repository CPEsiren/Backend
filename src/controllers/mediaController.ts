import { Request, Response } from "express";
import Media from "../models/Media";

const getMedia = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const media = await Media.findById(id).populate("userId");
    if (!media) {
      return res.status(404).json({ message: "Media not found" });
    }

    res.json(media);
  } catch (error) {
    console.error("Error retrieving media:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const getMediaList = async (req: Request, res: Response) => {
  try {
    const { type, user_id, limit = 10, page = 1 } = req.query;

    const query: any = {};
    if (type) query.type = type;
    if (user_id) query.user_id = user_id;

    const skip = (Number(page) - 1) * Number(limit);

    const mediaList = await Media.find(query)
      // .populate("userId")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await Media.countDocuments(query);

    res.json({
      mediaList,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
    });
  } catch (error) {
    console.error("Error retrieving media list:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const createMedia = async (req: Request, res: Response) => {
  try {
    const { type, details, user_id } = req.body;

    if (!type || !details || !user_id) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const newMedia = new Media({
      type,
      details,
      user_id,
    });

    await newMedia.save();

    res.status(201).json({
      message: "Media created successfully",
      media: newMedia,
    });
  } catch (error) {
    console.error("Error creating media:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const updateMedia = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { type, details } = req.body;

    const media = await Media.findById(id);
    if (!media) {
      return res.status(404).json({ message: "Media not found" });
    }

    if (type) media.type = type;
    if (details) media.details = details;

    await media.save();

    res.json({
      message: "Media updated successfully",
      media,
    });
  } catch (error) {
    console.error("Error updating media:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const deleteMedia = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const media = await Media.findByIdAndDelete(id);
    if (!media) {
      return res.status(404).json({ message: "Media not found" });
    }

    res.json({ message: "Media deleted successfully" });
  } catch (error) {
    console.error("Error deleting media:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export { getMedia, getMediaList, createMedia, updateMedia, deleteMedia };
