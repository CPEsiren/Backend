import { Router, Request, Response } from "express";
import {
  createItem,
  deleteItem,
  getAllItem,
} from "../controllers/itemController";

const router = Router();

router.get("/", getAllItem);

router.post("/", createItem);

router.delete("/:id", deleteItem);

export default router;
