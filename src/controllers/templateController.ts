import { addLog } from "../middleware/log";
import { Request, Response } from "express";
import Template from "../models/Template";
import mongoose from "mongoose";

export const getAllTemplate = async (req: Request, res: Response) => {
  try {
    const template = await Template.find().lean().exec();

    if (!template.length) {
      await addLog("WARNING", "No template found.", false);
      return res.status(404).json({
        status: "fail",
        message: "No template found.",
      });
    }

    await addLog("INFO", "Template fetched successfully.", false);
    res.status(200).json({
      status: "success",
      message: "Template fetched successfully.",
      data: template,
    });
  } catch (err) {
    await addLog("ERROR", "Error fetching template.", false);
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
    const { template_name, items, description } = req.body;

    if (!template_name || !description) {
      await addLog("WARNING", "Missing required fields.", false);
      return res.status(400).json({
        status: "fail",
        message: "Missing required fields.",
        requiredFields: ["name_template", "description"],
      });
    }

    const newTemplate = new Template({
      template_name,
      items,
      description,
    });

    await newTemplate.save({ session });

    await session.commitTransaction();
    session.endSession();

    await addLog(
      "INFO",
      `Template [${newTemplate.template_name}] created successfully.`,
      true
    );
    res.status(201).json({
      status: "success",
      message: `Template [${newTemplate.template_name}] created successfully.`,
      data: newTemplate,
    });
  } catch (error) {
    await session.abortTransaction();
    await addLog("ERROR", "Error creating template.", false);
    res.status(500).json({
      status: "error",
      message: "Error creating template.",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const updateTemplate = async (req: Request, res: Response) => {
  try {
    const template_id = req.params.id;

    if (!template_id) {
      await addLog("WARNING", "Invalid template ID.", false);
      return res.status(400).json({
        status: "fail",
        message: "template ID is required to update an template.",
      });
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const updatedItem = await Template.findByIdAndUpdate(
        template_id,
        { $set: req.body },
        { new: true, session }
      );

      if (!updatedItem) {
        throw new Error(`No template found with ID: ${template_id}`);
      }

      await session.commitTransaction();
      session.endSession();

      const template = await Template.findById(updatedItem._id);

      await addLog(
        "INFO",
        `Template with ID: [${updatedItem.template_name}] of host [${template?.template_name}] updated successfully.`,
        true
      );
      res.status(200).json({
        status: "success",
        message: `Template with ID: [${updatedItem.template_name}] of template [${template?.template_name}] updated successfully.`,
        data: updateTemplate,
      });
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  } catch (error) {
    await addLog("ERROR", `Failed to update template: ${error}`, false);
    res.status(500).json({
      status: "error",
      message: "Failed to update template.",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const deleteTemplate = async (req: Request, res: Response) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const templateId = req.params.id;

    if (!templateId || !mongoose.Types.ObjectId.isValid(templateId)) {
      await addLog("WARNING", "Invalid template ID.", false);
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
      await addLog("WARNING", "Template not found.", false);
      return res.status(404).json({
        status: "fail",
        message: "Template not found.",
      });
    }

    await session.commitTransaction();
    session.endSession();

    await addLog(
      "INFO",
      `Template [${deletedTemplate.template_name}] deleted successfully.`,
      true
    );
    res.status(200).json({
      status: "success",
      message: "Template deleted successfully.",
      data: deletedTemplate,
    });
  } catch (error) {
    await session.abortTransaction();
    await addLog("ERROR", "Error deleting template.", false);
    res.status(500).json({
      status: "error",
      message: "Error deleting template.",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};
