import { Router, Request, Response } from "express";
import {
  createItem,
  deleteItem,
  getAllItem,
  scanInterface,
  updateItem,
} from "../controllers/itemController";

const router = Router();

router.get("/", getAllItem);

router.post("/", createItem);

router.get("/interface/", scanInterface);

router.put("/edit/:id", updateItem);

router.delete("/:id", deleteItem);

export default router;
