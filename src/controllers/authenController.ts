import { Request, Response } from "express";
import { verifyToken } from "../services/authenService";
import { IUser, User } from "../models/User";

export const loginUser = async (req: Request, res: Response) => {
  const { token } = req.body;
  let user: IUser | null;

  try {
    const userInfo = await verifyToken(token);

    if (!userInfo || !userInfo.email_verified) {
      return res.status(400).json({ error: "Invalid token" });
    }

    user = await User.findOne({ email: userInfo.email });

    if (!user) {
      user = new User({
        username: userInfo.name,
        email: userInfo.email,
        picture: userInfo.picture,
        token,
      });
    } else {
      user.token = token;
    }

    const savedUser = await user.save();

    res.status(201).json({
      message: `User [${savedUser.username}] logged in successfully`,
      user: savedUser,
    });
  } catch (error) {
    res.status(400).json({ error: "Invalid token" });
  }
};
