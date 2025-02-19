import Host from "../models/Host";
import Item from "../models/Item";
import Trigger from "../models/Trigger";
import Event from "../models/Event";
import { User } from "../models/User";
import { Request, Response } from "express";
import Template from "../models/Template";
import Dashboard from "../models/Dashboard";

export async function getDashboardCounts(req: Request, res: Response) {
  try {
    const [
      hostCount,
      itemCount,
      userCount,
      triggerCount,
      eventCount,
      templateCount,
      hostDisabledCount,
      itemDisabledCount,
      triggerDisabledCount,
      userOnlineCount,
      problemEventCount,
    ] = await Promise.all([
      Host.countDocuments(),
      Item.countDocuments(),
      User.countDocuments(),
      Trigger.countDocuments(),
      Event.countDocuments(),
      Template.countDocuments(),
      Host.countDocuments({ status: 0 }),
      Item.countDocuments({ status: 0 }),
      Trigger.countDocuments({ enabled: false }),
      User.countDocuments({ isActive: true }),
      Event.countDocuments({ status: "PROBLEM" }),
    ]);

    const counts = {
      hosts: {
        total: hostCount,
        disabled: hostDisabledCount,
        enabled: hostCount - hostDisabledCount,
      },
      items: {
        total: itemCount,
        disabled: itemDisabledCount,
        enabled: itemCount - itemDisabledCount,
      },
      users: {
        total: userCount,
        online: userOnlineCount,
        offline: userCount - userOnlineCount,
      },
      triggers: {
        total: triggerCount,
        disabled: triggerDisabledCount,
        enabled: triggerCount - triggerDisabledCount,
      },
      events: {
        total: eventCount,
        problem: problemEventCount,
        resolved: eventCount - problemEventCount,
      },
      templates: {
        total: templateCount,
      },
    };

    res.status(200).json(counts);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch dashboard counts" });
  }
}

export async function getDashboards(req: Request, res: Response) {
  try {
    const dashboards = await Dashboard.find().lean();

    if (!dashboards.length) {
      return res
        .status(404)
        .json({ status: "fail", error: "No dashboards found" });
    }

    res.status(200).json({ status: "success", dashboards });
  } catch (error) {
    console.error("Error fetching dashboards:", error);
    res.status(500).json({ status: "fail", message: "Internal server error" });
  }
}

export async function getDashboardsUser(req: Request, res: Response) {
  try {
    const userId = req.params.id;
    const dashboards = await Dashboard.find({ user_id: userId }).lean();

    if (!dashboards.length) {
      return res.status(404).json({
        status: "fail",
        error: "No dashboards found for this user",
      });
    }

    res.status(200).json({ status: "success", dashboards });
  } catch (error) {
    console.error("Failed to fetch user dashboards:", error);
    res.status(500).json({ status: "fail", message: "Internal server error" });
  }
}

export async function getDashboardsViewer(req: Request, res: Response) {
  try {
    const dashboards = await Dashboard.find({ isViewer: true }).lean();

    if (!dashboards.length) {
      return res.status(404).json({
        status: "fail",
        error: "No viewer dashboards found",
      });
    }

    res.status(200).json({ status: "success", dashboards });
  } catch (error) {
    console.error("Failed to fetch viewer dashboards:", error);

    res.status(500).json({ status: "fail", message: "Internal server error" });
  }
}

export async function createDashboard(req: Request, res: Response) {
  try {
    const { dashboard_name, user_id, components } = req.body;
    const requiredFields = ["dashboard_name", "user_id", "components"];
    const missingFields = requiredFields.filter((field) => !req.body[field]);

    if (missingFields.length > 0) {
      return res.status(400).json({
        status: "fail",
        message: "Missing required fields.",
        requiredFields: missingFields,
      });
    }

    const newDashboard = new Dashboard({
      dashboard_name,
      user_id,
      components,
    });

    const savedDashboard = await newDashboard.save();

    res.status(201).json({ status: "success", savedDashboard });
  } catch (error) {
    console.error("Failed to create dashboard:", error);
    res.status(500).json({ status: "fail", message: "Internal server error" });
  }
}

export async function updateDashboard(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { dashboard_name, user_id, isDefault, components, isViewer } =
      req.body;

    const updatedDashboard = await Dashboard.findByIdAndUpdate(
      id,
      { dashboard_name, user_id, isDefault, components, isViewer },
      { new: true, runValidators: true }
    );

    if (!updatedDashboard) {
      return res.status(404).json({
        status: "fail",
        error: "Dashboard not found",
      });
    }

    res.status(200).json({
      status: "success",
      dashboard: updatedDashboard,
    });
  } catch (error) {
    console.error("Failed to update dashboard:", error);
    res.status(500).json({ status: "fail", message: "Internal server error" });
  }
}

export async function deleteDashboard(req: Request, res: Response) {
  const { id } = req.params;

  try {
    const deletedDashboard = await Dashboard.findByIdAndDelete(id).lean();

    if (!deletedDashboard) {
      return res.status(404).json({
        status: "fail",
        error: "Dashboard not found",
      });
    }

    res.status(200).json({
      status: "success",
      message: "Dashboard deleted successfully",
      dashboardId: deletedDashboard._id,
    });
  } catch (error) {
    console.error("Failed to delete dashboard:", error);
    res.status(500).json({ status: "fail", message: "Internal server error" });
  }
}
