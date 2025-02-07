import Host from "../models/Host";
import Item from "../models/Item";
import Trigger from "../models/Trigger";
import Event from "../models/Event";
import { User } from "../models/User";
import { Request, Response } from "express";
import Template from "../models/Template";

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
