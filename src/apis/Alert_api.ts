import { Router } from "express";
import { getAllAlerts } from "../controllers/alertController";

const router = Router();

router.get("/", getAllAlerts);

export default router;
