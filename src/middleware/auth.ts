import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../services/authenService";
import { User } from "../models/User";

export const auth = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers["authorization"];

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res
      .status(401)
      .json({ message: "Bearer token is required for authentication" });
  }

  const token = authHeader.split(" ")[1];

  try {
    await verifyToken(token);
    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid token" });
  }
};

export const authAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers["authorization"];

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res
      .status(401)
      .json({ message: "Bearer token is required for authentication" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const userInfo = await verifyToken(token);

    const user = await User.findOne({ email: userInfo?.email, role: "admin" });

    if (!user)
      return res
        .status(401)
        .json({ message: "You are not authorized to access this resource" });
    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid token" });
  }
};

export default verifyToken;
