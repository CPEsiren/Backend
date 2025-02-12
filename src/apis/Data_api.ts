import { Router } from "express";
import { getAllData, getBetween } from "../controllers/dataController";

const router = Router();

router.get("/", getAllData);

router.get("/between", getBetween);

export default router;
