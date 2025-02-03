import express from "express";
import { getUser, getUsers, deleteUser } from "../controllers/userController";

const router = express.Router();

router.get("/", getUsers);

router.get("/:id", getUser);

router.delete("/:id", deleteUser);

export default router;
