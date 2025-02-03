import { Router } from "express";
import { signupUser } from "../controllers/authenController";

const router = Router();

router.post("/signup", signupUser);

export default router;
