import express from "express";
import {
  getActionById,
  getActions,
  createAction,
  updateAction,
  deleteAction,
} from "../controllers/actionController";

const router = express.Router();

router.get("/", getActions);
router.get("/:id", getActionById);
router.post("/", createAction);
router.put("/:id", updateAction);
router.delete("/:id", deleteAction);

export default router;
