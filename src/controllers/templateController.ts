import { Request, Response } from "express";
import Template from "../models/Template";

export const getAllTemplate = async (req: Request, res: Response) => {
  try {
    const template = await Template.find();

    if (template.length === 0) {
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
  try {
    const { name_template, description } = req.body;

    if (!name_template || !description) {
      return res.status(400).json({
        status: "fail",
        message: "Missing required fields.",
        requiredFields: ["name_template", "description"],
      });
    }

    const newTemplate = new Template({
      name_template,
      description,
    });
    await newTemplate.save();

    res.status(201).json({
      status: "success",
      message: "Template created successfully.",
      data: newTemplate,
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Error creating template.",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const deleteTemplate = async (req: Request, res: Response) => {
  try {
    const template_id = req.query.id;

    if (!template_id) {
      return res.status(400).json({
        status: "fail",
        message: "Template ID is required to delete a host.",
      });
    }

    const result = await Template.deleteOne({ _id: template_id });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        status: "fail",
        message: `No host found with ID: ${template_id}.`,
      });
    }
    res.status(200).json({
      status: "success",
      message: `Template with ID: ${template_id} deleted successfully.`,
    });
  } catch (err) {
    res.status(500).json({
      status: "error",
      message: "Failed to delete template.",
      error: err instanceof Error ? err.message : "Unknown error",
    });
  }
};
