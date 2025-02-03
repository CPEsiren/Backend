import { Request, Response } from "express";

export const signupUser = async (req: Request, res: Response) => {
  try {
    // const { token } = req.body;
    // const userInfo = await verifyToken(token);

    // if (!userInfo.email_verified) {
    //   return res.status(400).json({ error: "Email not verified" });
    // }

    // // ตรวจสอบว่ามีบัญชีนี้อยู่แล้วหรือไม่
    // let user = await User.findOne({ email: userInfo.email });
    // if (user) {
    //   return res.status(400).json({ error: "User already exists" });
    // }

    // บันทึกข้อมูลผู้ใช้ใหม่ลง Database
    // user = await User.create({
    //   email: userInfo.email,
    //   name: userInfo.name,
    //   picture: userInfo.picture,
    //   provider: "google",
    // });

    // สร้าง Access Token เพื่อให้ผู้ใช้เข้าสู่ระบบทันที
    // const accessToken = jwt.sign({ userId: user._id }, "YOUR_SECRET_KEY", {
    //   expiresIn: "7d",
    // });

    res.json({ message: "Signup success", data: req.body });
  } catch (error) {
    res.status(400).json({ error: "Invalid token" });
  }
};
