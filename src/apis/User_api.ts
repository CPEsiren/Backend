import express from "express";
import {
  getUser,
  getUsers,
  deleteUser,
  getRole,
} from "../controllers/userController";

const router = express.Router();

router.get("/", getUsers);

router.get("/:id", getUser);

router.get("/role/:id", getRole);

router.delete("/:id", deleteUser);

export default router;
