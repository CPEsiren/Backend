import express from "express";
import {
  getUser,
  getUsers,
  deleteUser,
  getRole,
  updateUserRole,
} from "../controllers/userController";
import { auth, authAdmin } from "../middleware/auth";

const router = express.Router();

router.get("/", auth, getUsers);

router.get("/:id", auth, getUser);

router.get("/role/:id", auth, getRole);

router.put("/editrole/:id", auth, updateUserRole);

router.delete("/:id", authAdmin, deleteUser);

export default router;
