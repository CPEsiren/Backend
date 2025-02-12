import { Router } from "express";
import { loginUser } from "../controllers/authenController";

const router = Router();

router.post("/signup", loginUser);

export default router;
