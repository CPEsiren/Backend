import { Router } from "express";
import {
  getAllData,
  getHostBetween,
  getItemBetween,
} from "../controllers/dataController";
import { auth } from "../middleware/auth";

const router = Router();

router.get("/", auth, getAllData);

router.get("/host/between", auth, getHostBetween);

router.get("/item/between", auth, getItemBetween);

export default router;
