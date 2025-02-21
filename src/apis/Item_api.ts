import { Router, Request, Response } from "express";
import {
  createItem,
  deleteItem,
  getAllItem,
  scanInterface,
  updateItem,
} from "../controllers/itemController";

import { authAdmin } from "../middleware/auth";

const router = Router();

router.get("/", authAdmin, getAllItem);

router.post("/", authAdmin, createItem);

router.post("/interface/", authAdmin, scanInterface);

router.put("/edit/:id", authAdmin, updateItem);

router.delete("/:id", authAdmin, deleteItem);

export default router;
