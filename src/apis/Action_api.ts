import express from "express";
import {
  getActions,
  createAction,
  updateAction,
  deleteAction,
  getActionUser,
} from "../controllers/actionController";
import { authAdmin } from "../middleware/auth";

const router = express.Router();

router.get("/", authAdmin, getActions);

router.get("/user/:user_id", authAdmin, getActionUser);

router.post("/", authAdmin, createAction);

router.put("/:id", authAdmin, updateAction);

router.delete("/:id", authAdmin, deleteAction);

export default router;
