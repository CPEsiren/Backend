// src/routes/Details.ts
import { Router, Request, Response } from "express";
import prisma from "../prismaClient";

const router = Router();

router.get("/", async (req: Request, res: Response) => {
  try {
    const devices = await prisma.device.findMany({
      select: {
        DName: true,
        Room: true,
        Status: true,
      },
    });
    res.json(devices);
  } catch (error) {
    console.error("Error fetching device details:", error);
    res.status(500).json({ error: "Internal Server Error", details: error });
  }
});

export default router;
