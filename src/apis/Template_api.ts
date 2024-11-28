import { Router, Request, Response } from "express";
import {
  createTemplate,
  deleteTemplate,
  getAllTemplate,
} from "../controllers/templateController";

const router = Router();

router.get("/", getAllTemplate);

router.post("/", createTemplate);

router.delete("/", deleteTemplate);

export default router;
