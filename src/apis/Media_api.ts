import express from "express";
import {
  getMediaUser,
  createMedia,
  updateMedia,
  deleteMedia,
  getMedia,
} from "../controllers/mediaController";

const router = express.Router();

router.get("/", getMedia);
router.get("/:user_id", getMediaUser);
router.post("/", createMedia);
router.put("/:id", updateMedia);
router.delete("/:id", deleteMedia);

export default router;
