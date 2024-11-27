import { Router } from "express";
import {
  createHost,
  deleteHost,
  getAllHosts,
} from "../controllers/hostController";

const router = Router();

router.get("/", getAllHosts);

router.post("/", createHost);

router.delete("/", deleteHost);

export default router;
