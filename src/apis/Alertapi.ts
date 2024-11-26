// // src/routes/deviceRoutes.ts
// import { Router, Request, Response } from "express";
// import prisma from "../prismaClient";

// const router = Router();

// router.get("/", async (req: Request, res: Response) => {
//   try {
//     const alerts = await prisma.alert.findMany();
//     res.json(alerts);
//   } catch (error) {
//     console.error("Error fetching alert:", error);
//     res.status(500).json({ error: "Internal Server Error", details: error });
//   }
// });

// export default router;
