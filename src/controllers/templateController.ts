import { Request, Response } from "express";
import Template from "../models/Template";
import mongoose from "mongoose";

export const getAllTemplate = async (req: Request, res: Response) => {
  try {
    const template = await Template.find().lean().exec();

    if (!template.length) {
      return res.status(404).json({
        status: "fail",
        message: "No template found.",
      });
    }
    res.status(200).json({
      status: "success",
      message: "Template fetched successfully.",
      data: template,
    });
  } catch (err) {
    res.status(500).json({
      status: "error",
      message: "Error fetching template.",
      error: err instanceof Error ? err.message : "Unknown error",
    });
  }
};

export const createTemplate = async (req: Request, res: Response) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { name_template, items, description } = req.body;

    if (!name_template || !description) {
      return res.status(400).json({
        status: "fail",
        message: "Missing required fields.",
        requiredFields: ["name_template", "description"],
      });
    }

    const newTemplate = new Template({
      name_template,
      items,
      description,
    });

    await newTemplate.save({ session });

    await session.commitTransaction();
    session.endSession();

    res.status(201).json({
      status: "success",
      message: "Template created successfully.",
      data: newTemplate,
    });
  } catch (error) {
    await session.abortTransaction();
    res.status(500).json({
      status: "error",
      message: "Error creating template.",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const deleteTemplate = async (req: Request, res: Response) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const templateId = req.query.id as string;

    if (!templateId || !mongoose.Types.ObjectId.isValid(templateId)) {
      return res.status(400).json({
        status: "fail",
        message: "Valid template ID is required.",
      });
    }

    const deletedTemplate = await Template.findByIdAndDelete(
      templateId
    ).session(session);

    if (!deletedTemplate) {
      await session.abortTransaction();
      return res.status(404).json({
        status: "fail",
        message: "Template not found.",
      });
    }

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({
      status: "success",
      message: "Template deleted successfully.",
      data: deletedTemplate,
    });
  } catch (error) {
    await session.abortTransaction();
    res.status(500).json({
      status: "error",
      message: "Error deleting template.",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};
