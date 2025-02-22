import { addLog } from "../services/logService";
import { Request, Response } from "express";
import { User } from "../models/User";
import Media from "../models/Media";

const getMedia = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const media = await Media.findById(id).populate("userId");
    if (!media) {
      await addLog("WARNING", `No media found with ID: ${id}`, false);
      return res.status(404).json({ message: "Media not found" });
    }

    const user = await User.findById(media.user_id);

    await addLog(
      "INFO",
      `Media with [${media.type}] of user [${user?.username}] retrieved successfully`,
      false
    );
    res.status(200).json(media);
  } catch (error) {
    await addLog("ERROR", `Error retrieving media: ${error}`, false);
    res.status(500).json({ message: "Internal server error" });
  }
};

const getMediaList = async (req: Request, res: Response) => {
  try {
    const { type, user_id } = req.query;

    const query: any = {};
    if (type) query.type = type;
    if (user_id) query.user_id = user_id;

    const mediaList = await Media.find(query);

    const total = await Media.countDocuments(query);

    await addLog("INFO", "Media list retrieved successfully", false);
    res.status(200).json({
      mediaList,
      total,
    });
  } catch (error) {
    await addLog("ERROR", `Error retrieving media list: ${error}`, false);
    res.status(500).json({ message: "Internal server error" });
  }
};

const createMedia = async (req: Request, res: Response) => {
  try {
    const { type, details, user_id } = req.body;

    if (!type || !details || !user_id) {
      await addLog("WARNING", "Missing required fields", false);
      return res.status(400).json({ message: "Missing required fields" });
    }

    const newMedia = new Media({
      type,
      details,
      user_id,
    });

    await newMedia.save();

    const user = await User.findById(user_id);

    await addLog(
      "INFO",
      `Media [${type}] of user [${user?.username}] created successfully`,
      true
    );
    res.status(201).json({
      message: `Media [${type}] of user [${user?.username}] created successfully`,
      media: newMedia,
    });
  } catch (error) {
    await addLog("ERROR", `Error creating media: ${error}`, false);
    res.status(500).json({ message: `Error creating media: ${error}` });
  }
};

const updateMedia = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { type, details } = req.body;

    const media = await Media.findById(id);
    if (!media) {
      await addLog("WARNING", `No media found with ID: ${id}`, false);
      return res.status(404).json({ message: "Media not found" });
    }

    if (type) media.type = type;
    if (details) media.details = details;

    await media.save();

    const user = await User.findById(media.user_id);

    await addLog(
      "INFO",
      `Media [${media.type}] of user [${user?.username}] updated successfully`,
      true
    );
    res.status(200).json({
      message: `Media [${media.type}] of user [${user?.username}] updated successfully`,
      media,
    });
  } catch (error) {
    await addLog("ERROR", `Error updating media: ${error}`, false);
    res.status(500).json({ message: `Error updating media: ${error}` });
  }
};

const deleteMedia = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const media = await Media.findByIdAndDelete(id);
    if (!media) {
      await addLog("WARNING", `No media found with ID: ${id}`, false);
      return res.status(404).json({ message: "Media not found" });
    }

    const user = await User.findById(media.user_id);

    await addLog(
      "INFO",
      `Media [${media.type}] of user [${user?.username}] deleted successfully`,
      true
    );
    res.status(200).json({
      message: `Media [${media.type}] of user [${user?.username}] deleted successfully`,
    });
  } catch (error) {
    await addLog("ERROR", `Error deleting media: ${error}`, false);
    res.status(500).json({ message: `Error deleting media: ${error}` });
  }
};

export { getMedia, getMediaList, createMedia, updateMedia, deleteMedia };
