import { Router, Request, Response } from "express";
import { sendMail } from "../controllers/mailController";

const router = Router();

router.post("/", sendMail);

export default router;
