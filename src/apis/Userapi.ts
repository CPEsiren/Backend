// // src/routes/userRoutes.ts
// import { Router, Request, Response } from "express";
// import prisma from "../prismaClient";

// const router = Router();

// router.get("/", async (req: Request, res: Response) => {
//   try {
//     const users = await prisma.user.findMany();
//     res.json(users);
//   } catch (error) {
//     console.error("Error fetching users:", error);
//     res.status(500).json({ error: "Internal Server Error", details: error });
//   }
// });

// export default router;
