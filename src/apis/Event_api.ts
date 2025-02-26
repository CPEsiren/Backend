import express from "express";
import { getEvent, getEvents } from "../controllers/eventController";
import { authAdmin } from "../middleware/auth";

const router = express.Router();

router.get("/", authAdmin, getEvents);

router.get("/:id", authAdmin, getEvent);

export default router;
