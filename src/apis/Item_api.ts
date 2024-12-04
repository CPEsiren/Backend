import { Router, Request, Response } from "express";
import {
  createItem,
  deleteItem,
  getAllItem,
  updateItem,
} from "../controllers/itemController";

const router = Router();

router.get("/", getAllItem);

router.post("/", createItem);

router.put("/edit/:id", updateItem);

router.delete("/:id", deleteItem);

export default router;
