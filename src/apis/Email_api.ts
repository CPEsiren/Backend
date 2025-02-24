import express from "express";
import { sendOTP, verifyOTP } from "../controllers/emailController";

const router = express.Router();

router.post("/", sendOTP);

router.post("/verify", verifyOTP);

export default router;
