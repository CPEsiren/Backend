// In your routes file (e.g., mediaRoutes.ts)
import express from "express";
import {
  getMedia,
  getMediaList,
  createMedia,
  updateMedia,
  deleteMedia,
} from "../controllers/mediaController";

const router = express.Router();

router.get("/", getMediaList);
router.get("/:id", getMedia);
router.post("/", createMedia);
router.put("/:id", updateMedia);
router.delete("/:id", deleteMedia);

export default router;
