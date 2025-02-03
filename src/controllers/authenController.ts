import { Request, Response } from "express";
import { verifyToken } from "../services/authenService";
import { User } from "../models/User";
import { addLog } from "../services/logService";

export const signupUser = async (req: Request, res: Response) => {
  try {
    const { token } = req.body;

    const userInfo = await verifyToken(token);

    if (!userInfo?.email_verified) {
      return res.status(400).json({ error: "Email not verified" });
    }

    let user = await User.findOne({ email: userInfo.email });
    if (user) {
      return res.status(400).json({ error: "User already exists" });
    }

    const newUser = new User({
      username: userInfo.name,
      email: userInfo.email,
      picture: userInfo.picture,
      token: token,
    });

    const resUser = await newUser.save();

    await addLog(
      "INFO",
      `User [${newUser.username}]created successfully`,
      true
    );
    res.status(201).json({
      message: `User [${newUser.username}]created successfully`,
      user: resUser,
    });
  } catch (error) {
    await addLog("WARNING", `Invalid token: ${error}`, false);
    res.status(400).json({ error: "Invalid token" });
  }
};
