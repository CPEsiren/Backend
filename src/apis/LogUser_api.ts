import { Router } from "express";

import { authAdmin } from "../middleware/auth";
import { getLogUser } from "../controllers/LogUserController";

const router = Router();

router.get("/", authAdmin, getLogUser);

export default router;
