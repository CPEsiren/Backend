import { Router } from "express";
import {
  createHost,
  deleteHost,
  getAllHosts,
  getHostById,
  updateHost,
} from "../controllers/hostController";
import { auth, authAdmin } from "../middleware/auth";

const router = Router();

router.get("/", authAdmin, getAllHosts);

router.get("/:id", authAdmin, getHostById);

router.post("/", authAdmin, createHost);

router.put("/edit/:id", authAdmin, updateHost);

router.delete("/:id", authAdmin, deleteHost);

export default router;
