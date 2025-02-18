import { Router, Request, Response } from "express";
import {
  createItem,
  deleteItem,
  getAllItem,
  scanInterface,
  updateItem,
} from "../controllers/itemController";

import { auth } from "../middleware/auth";

const router = Router();

router.get("/", auth, getAllItem);

router.post("/", createItem);

router.post("/interface/", scanInterface);

router.put("/edit/:id", updateItem);

router.delete("/:id", deleteItem);

export default router;
