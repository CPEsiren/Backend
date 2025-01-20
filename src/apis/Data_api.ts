import { Router } from "express";
import { getAllData, getBetween, getData } from "../controllers/dataController";

const router = Router();

router.get("/", getAllData);

router.get("/between", getBetween);

router.get("/:id", getData);

export default router;
