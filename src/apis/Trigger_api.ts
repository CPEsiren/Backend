import express from "express";
import {
  createTrigger,
  updateTrigger,
  deleteTrigger,
  getTrigger,
  getTriggers,
} from "../controllers/triggerController";
import { authAdmin } from "../middleware/auth";

const router = express.Router();

router.get("/", authAdmin, getTriggers);
router.get("/:id", authAdmin, getTrigger);
router.post("/", authAdmin, createTrigger);
router.put("/:id", authAdmin, updateTrigger);
router.delete("/:id", authAdmin, deleteTrigger);

export default router;
