import { Router } from "express";
import {
  createHost,
  deleteHost,
  getAllHosts,
  getHostById,
  updateHost,
} from "../controllers/hostController";

const router = Router();

router.get("/", getAllHosts);

router.get("/:id", getHostById);

router.post("/", createHost);

router.post("/edit/:id", updateHost);

router.delete("/:id", deleteHost);

export default router;
