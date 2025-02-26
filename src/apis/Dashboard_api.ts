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
import { auth, authAdmin } from "../middleware/auth";

const router = Router();

router.get("/count", auth, getDashboardCounts);

router.get("/", auth, getDashboards);

router.get("/viewer", auth, getDashboardsViewer);

router.get("/user/:id", authAdmin, getDashboardsUser);

router.post("/", authAdmin, createDashboard);

router.put("/:id", authAdmin, updateDashboard);

router.delete("/:id", authAdmin, deleteDashboard);

export default router;
