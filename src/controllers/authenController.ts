import { Request, Response } from "express";
import { verifyToken } from "../services/authenService";
import { User } from "../models/User";
import { addLog } from "../middleware/log";

export const loginUser = async (req: Request, res: Response) => {
  try {
    const { token } = req.body;

    const userInfo = await verifyToken(token);

    if (!userInfo?.email_verified) {
      return res.status(400).json({ error: "Email not verified" });
    }

    const user = await User.findOne({ email: userInfo.email });
    if (!user) {
      const newUser = new User({
        username: userInfo.name,
        email: userInfo.email,
        picture: userInfo.picture,
        token: token,
      });
      const resUser = await newUser.save();
      await addLog(
        "INFO",
        `User [${resUser.username}]created and login successfully`,
        true
      );
      res.status(201).json({
        message: `User [${resUser.username}]created and login successfully`,
        user: resUser,
      });
    } else {
      user.token = token;
      const resUser = await user.save();
      await addLog(
        "INFO",
        `User [${resUser.username}] created and login successfully`,
        true
      );
      res.status(201).json({
        message: `User [${resUser.username}] login successfully`,
        user: resUser,
      });
    }
  } catch (error) {
    await addLog("WARNING", `Invalid token: ${error}`, false);
    res.status(400).json({ error: "Invalid token" });
  }
};
