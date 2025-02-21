import { Router } from "express";
import { getAllData, getBetween } from "../controllers/dataController";
import { auth } from "../middleware/auth";

const router = Router();

router.get("/", auth, getAllData);

router.get("/between", auth, getBetween);

export default router;
