import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../services/authenService";

export const auth = async (req: Request, res: Response, next: NextFunction) => {
  const token =
    req.body.token || req.query.token || req.headers["x-access-token"];

  if (!token) {
    return res
      .status(403)
      .json({ message: "A token is required for authentication" });
  }

  try {
    const decoded = await verifyToken(token); // ตรวจสอบว่าฟังก์ชันนี้รองรับ async/await
    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid token" });
  }
};

export default verifyToken;
