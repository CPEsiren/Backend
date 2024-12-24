import express from "express";
import {
  createTrigger,
  updateTrigger,
  deleteTrigger,
  getTrigger,
  getTriggers,
} from "../controllers/triggerController";

const router = express.Router();

router.get("/", getTriggers);
router.get("/:id", getTrigger);
router.post("/", createTrigger);
router.put("/:id", updateTrigger);
router.delete("/:id", deleteTrigger);

export default router;
