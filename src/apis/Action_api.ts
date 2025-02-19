import express from "express";
import {
  getActions,
  createAction,
  updateAction,
  deleteAction,
  getActionUser,
} from "../controllers/actionController";

const router = express.Router();

router.get("/", getActions);

router.get("/user/:user_id", getActionUser);

router.post("/", createAction);

router.put("/:id", updateAction);

router.delete("/:id", deleteAction);

export default router;
