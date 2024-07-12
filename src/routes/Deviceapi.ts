import { Router, Request, Response } from "express";
import prisma from "../prismaClient";

const router = Router();

router.get("/", async (req: Request, res: Response) => {
  try {
    const devices = await prisma.device.findMany();
    res.json(devices);
  } catch (error) {
    console.error("Error fetching devices:", error);
    res.status(500).json({ error: "Internal Server Error", details: error });
  }
});

// Add a route to get a single device by DMACaddress
router.get("/:dmacAddress", async (req: Request, res: Response) => {
  const { dmacAddress } = req.params;
  try {
    const device = await prisma.device.findUnique({
      where: { DMACaddress: dmacAddress },
    });
    if (device) {
      res.json(device);
    } else {
      res.status(404).json({ error: "Device not found" });
    }
  } catch (error) {
    console.error("Error fetching device:", error);
    res.status(500).json({ error: "Internal Server Error", details: error });
  }
});

export default router;