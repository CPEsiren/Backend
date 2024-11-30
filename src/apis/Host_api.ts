import { Router } from "express";
import {
  createHost,
  deleteHost,
  getAllHosts,
  updateHost,
} from "../controllers/hostController";

const router = Router();

router.get("/", getAllHosts);

router.post("/", createHost);

router.post("/edit", updateHost);

router.delete("/", deleteHost);

export default router;
