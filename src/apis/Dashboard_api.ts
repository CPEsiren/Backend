import { Router } from "express";
import { getDashboardCounts } from "../controllers/dashboardController";

const router = Router();

router.get("/count", getDashboardCounts);

export default router;
