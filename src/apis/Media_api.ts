import express from "express";
import {
  getMediaUser,
  createMedia,
  updateMedia,
  deleteMedia,
  getMedia,
} from "../controllers/mediaController";
import { authAdmin } from "../middleware/auth";

const router = express.Router();

router.get("/", authAdmin, getMedia);
router.get("/:user_id", authAdmin, getMediaUser);
router.post("/", authAdmin, createMedia);
router.put("/:id", authAdmin, updateMedia);
router.delete("/:id", authAdmin, deleteMedia);

export default router;
