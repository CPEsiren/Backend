import { Router } from "express";
import {
  createTemplate,
  deleteTemplate,
  getAllTemplate,
  updateTemplate
} from "../controllers/templateController";

const router = Router();

router.get("/", getAllTemplate);

router.post("/", createTemplate);

router.put("/edit/:id", updateTemplate);

router.delete("/:id", deleteTemplate);

export default router;
