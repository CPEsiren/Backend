// In your routes file (e.g., actionRoutes.ts)
import express from "express";
import {
  getAction,
  getActions,
  createAction,
  updateAction,
  deleteAction,
} from "../controllers/actionController";

const router = express.Router();

router.get("/", getActions);
router.get("/:id", getAction);
router.post("/", createAction);
router.put("/:id", updateAction);
router.delete("/:id", deleteAction);

export default router;
