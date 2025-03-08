import { Request, Response } from "express";
import Template from "../models/Template";
import mongoose from "mongoose";
import { createActivityLog } from "./LogUserController";

export const getAllTemplate = async (req: Request, res: Response) => {
  try {
    const templates = await Template.find().select("-__v").lean().exec();

    if (templates.length === 0) {
      return res.status(404).json({
        status: "fail",
        message: "No templates found.",
      });
    }

    res.status(200).json({
      status: "success",
      message: "Template fetched successfully.",
      data: templates,
    });
  } catch (err) {
    console.error("Error fetching templates:", err);
    res.status(500).json({ status: "fail", message: err });
  }
};

export const createTemplate = async (req: Request, res: Response) => {
  try {
    const { template_name, items, triggers, description } = req.body;

    const requiredFields = ["template_name"];
    const missingFields = requiredFields.filter((field) => !req.body[field]);

    if (missingFields.length > 0) {
      return res.status(400).json({
        status: "fail",
        message: "Missing required fields.",
        requiredFields: missingFields,
      });
    }

    const newTemplate = new Template({
      template_name,
      items,
      triggers,
      description,
    });

    await newTemplate.save();

    // Log for activity
    const username = req.body.userName || "system";
    const role = req.body.userRole || "system";
    await createActivityLog(
      username,
      role,
      `Created template: ${template_name}`
    );

    res.status(201).json({
      status: "success",
      message: `Template [${newTemplate.template_name}] created successfully.`,
      data: newTemplate,
    });
  } catch (error) {
    console.error("Error creating template: ", error);
    res.status(500).json({ status: "fail", message: error });
  }
};

export const updateTemplate = async (req: Request, res: Response) => {
  try {
    const template_id = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(template_id)) {
      return res.status(400).json({
        status: "fail",
        message: "Invalid template ID format.",
      });
    }

    const originalTemplate: any = await Template.findById(template_id).lean();
    if (!originalTemplate) {
      return res.status(404).json({
        status: "fail",
        message: `No template found with ID: ${template_id}`,
      });
    }

    const updateFields = ["template_name", "items", "description", "triggers"];
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

    const updatedTemplate = await Template.findByIdAndUpdate(
      template_id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).lean();

    if (!updatedTemplate) {
      return res.status(404).json({
        status: "fail",
        message: `No template found with ID: ${template_id}`,
      });
    }

    // Log for activity
    const username = req.body.userName || "system";
    const role = req.body.userRole || "system";
    await createActivityLog(
      username,
      role,
      `Updated host: ${updatedTemplate.template_name}.`
    );

    res.status(200).json({
      status: "success",
      message: `Template [${updatedTemplate.template_name}] updated successfully.`,
      data: { template: updatedTemplate },
    });
  } catch (error) {
    console.error("Error updating template: ", error);
    res.status(500).json({ status: "fail", message: error });
  }
};

export const deleteTemplate = async (req: Request, res: Response) => {
  try {
    const templateId = req.params.id;
    const template_name = req.body.template_name;

    if (!mongoose.Types.ObjectId.isValid(templateId)) {
      return res.status(400).json({
        status: "fail",
        message: "Invalid template ID format.",
      });
    }

    const deletedTemplate = await Template.findByIdAndDelete(templateId).lean();

    if (!deletedTemplate) {
      return res.status(404).json({
        status: "fail",
        message: "Template not found.",
      });
    }

    // Log for activity
    const username = req.body.userName || "system";
    const role = req.body.userRole || "system";
    await createActivityLog(
      username,
      role,
      `Deleted template: ${template_name}`
    );

    res.status(200).json({
      status: "success",
      message: "Template deleted successfully.",
      data: { template: deletedTemplate },
    });
  } catch (error) {
    console.error("Error deleting template: ", error);
    res.status(500).json({ status: "fail", message: error });
  }
};
