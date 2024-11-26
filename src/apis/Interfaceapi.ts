// // src/routes/deviceRoutes.ts
// import { Router, Request, Response } from "express";
// import prisma from "../prismaClient";

// const router = Router();

// router.get("/", async (req: Request, res: Response) => {
//   try {
//     const interfaces = await prisma.interface.findMany();
//     res.json(interfaces);
//   } catch (error) {
//     console.error("Error fetching Interfaces:", error);
//     res.status(500).json({ error: "Internal Server Error", details: error });
//   }
// });

// export default router;
