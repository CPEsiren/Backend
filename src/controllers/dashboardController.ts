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
    const hostCount = await Host.countDocuments();
    const itemCount = await Item.countDocuments();
    const userCount = await User.countDocuments();
    const triggerCount = await Trigger.countDocuments();
    const eventCount = await Event.countDocuments();
    const templateCount = await Template.countDocuments();

    // Count hosts with status 0 and 1
    const hostDisabledCount = await Host.countDocuments({ status: 0 });
    const hostEnabledCount = await Host.countDocuments({ status: 1 });

    // Count items with status 0 and 1
    const itemDisabledCount = await Item.countDocuments({ status: 0 });
    const itemEnabledCount = await Item.countDocuments({ status: 1 });

    //Count triggers with enabled true and false
    const triggerDisabledCount = await Trigger.countDocuments({
      enabled: false,
    });
    const triggerEnabledCount = await Trigger.countDocuments({ enabled: true });

    // Count users with isActive true and false
    const userOnlineCount = await User.countDocuments({ isActive: true });
    const userOfflineCount = await User.countDocuments({ isActive: false });

    //Count events with status "PROBLEM" and "RESOLVED"
    const problemEventCount = await Event.countDocuments({ status: "PROBLEM" });
    const resolvedEventCount = await Event.countDocuments({
      status: "RESOLVED",
    });

    const counts = {
      hosts: {
        total: hostCount,
        disabled: hostDisabledCount,
        enabled: hostEnabledCount,
      },
      items: {
        total: itemCount,
        disabled: itemDisabledCount,
        enabled: itemEnabledCount,
      },
      users: {
        total: userCount,
        online: userOnlineCount,
        offline: userOfflineCount,
      },
      triggers: {
        total: triggerCount,
        disabled: triggerDisabledCount,
        enabled: triggerEnabledCount,
      },
      events: {
        total: eventCount,
        problem: problemEventCount,
        resolved: resolvedEventCount,
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
    const dashboards = await Dashboard.find();

    if (!dashboards) {
      return res
        .status(404)
        .json({ status: "fail", error: "No dashboards found" });
    }

    res.status(200).json({ status: "success", dashboards });
  } catch (error) {
    res
      .status(500)
      .json({ status: "fail", error: "Failed to fetch dashboards" });
  }
}

export async function getDashboardsUser(req: Request, res: Response) {
  try {
    const dashboards = await Dashboard.find({ user_id: req.params.id });

    if (!dashboards) {
      return res
        .status(404)
        .json({ status: "fail", error: "No dashboards found" });
    }

    res.status(200).json({ status: "success", dashboards });
  } catch (error) {
    res
      .status(500)
      .json({ status: "fail", error: "Failed to fetch dashboards" });
  }
}

export async function getDashboardsViewer(req: Request, res: Response) {
  try {
    const dashboards = await Dashboard.find({ isViewer: true });

    if (!dashboards) {
      return res
        .status(404)
        .json({ status: "fail", error: "No dashboards found" });
    }

    res.status(200).json({ status: "success", dashboards });
  } catch (error) {
    res
      .status(500)
      .json({ status: "fail", error: "Failed to fetch dashboards" });
  }
}

export async function createDashboard(req: Request, res: Response) {
  try {
    const { dashboard_name, user_id, isDefault, components, isViewer } =
      req.body;

    const requiredFields = [
      "dashboard_name",
      "user_id",
      "isDefault",
      "components",
    ];
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
      isDefault,
      components,
      isViewer,
    });

    const savedDashboard = await newDashboard.save();

    res.status(201).json({ status: "success", savedDashboard });
  } catch (error) {
    res
      .status(500)
      .json({ status: "fail", error: `Failed to create dashboard: ${error}` });
  }
}

export async function updateDashboard(req: Request, res: Response) {
  try {
    const { dashboard_name, user_id, isDefault, components, isViewer } =
      req.body;

    const dashboard = await Dashboard.findByIdAndUpdate(req.params.id, {
      dashboard_name,
      user_id,
      isDefault,
      components,
      isViewer,
    });

    if (!dashboard) {
      return res
        .status(404)
        .json({ status: "fail", error: "Dashboard not found" });
    }

    const newDashboard = await Dashboard.findById(req.params.id);

    res.status(200).json({ status: "success", newDashboard });
  } catch (error) {
    res
      .status(500)
      .json({ status: "fail", error: `Failed to update dashboard: ${error}` });
  }
}

export async function deleteDashboard(req: Request, res: Response) {
  try {
    const dashboard = await Dashboard.findByIdAndDelete(req.params.id);

    if (!dashboard) {
      return res
        .status(404)
        .json({ status: "fail", error: "Dashboard not found" });
    }

    res
      .status(200)
      .json({ status: "success", message: "Dashboard deleted", dashboard });
  } catch (error) {
    res
      .status(500)
      .json({ status: "fail", error: `Failed to delete dashboard: ${error}` });
  }
}
