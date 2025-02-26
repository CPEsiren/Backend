import { Router } from "express";
import {
  createTemplate,
  deleteTemplate,
  getAllTemplate,
  updateTemplate,
} from "../controllers/templateController";
import { authAdmin } from "../middleware/auth";

const router = Router();

router.get("/", authAdmin, getAllTemplate);

router.post("/", authAdmin, createTemplate);

router.put("/edit/:id", authAdmin, updateTemplate);

router.delete("/:id", authAdmin, deleteTemplate);

export default router;
