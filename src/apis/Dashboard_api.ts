import { Router } from "express";
import {
  createDashboard,
  deleteDashboard,
  getDashboardCounts,
  getDashboards,
  getDashboardsUser,
  getDashboardsViewer,
  updateDashboard,
} from "../controllers/dashboardController";
import { auth } from "../middleware/auth";

const router = Router();

router.get("/count", getDashboardCounts);

router.get("/", auth, getDashboards);

router.get("/viewer", getDashboardsViewer);

router.get("/user/:id", getDashboardsUser);

router.post("/", createDashboard);

router.put("/:id", updateDashboard);

router.delete("/:id", deleteDashboard);

export default router;
