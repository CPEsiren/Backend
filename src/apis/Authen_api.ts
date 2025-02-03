import { Router } from "express";
import { loginUser } from "../controllers/authenController";

const router = Router();

router.post("/login", loginUser);

export default router;
