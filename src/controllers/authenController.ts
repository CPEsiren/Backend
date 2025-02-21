import { Request, Response } from "express";
import { verifyToken } from "../services/authenService";
import { IUser, User } from "../models/User";

export const loginUser = async (req: Request, res: Response) => {
  const { token } = req.body;

  try {
    const userInfo = await verifyToken(token);

    if (!userInfo || !userInfo.email_verified) {
      return res.status(401).json({ error: "Invalid or unverified token" });
    }

    let user = await User.findOneAndUpdate(
      { email: userInfo.email },
      {
        username: userInfo.name,
        email: userInfo.email,
        picture: userInfo.picture,
        token,
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    res.status(200).json({
      message: `User [${user.username}] logged in successfully`,
      user: {
        _id: user._id,
        email: user.email,
        role: user.role,
        username: user.username,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "An error occurred during login" });
  }
};
