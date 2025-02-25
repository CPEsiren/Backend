import { Router } from "express";

import { authAdmin } from "../middleware/auth";

const router = Router();

router.get("/", authAdmin, async (req, res) => {});

export default router;
