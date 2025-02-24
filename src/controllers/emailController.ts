import { Request, Response } from "express";
import OTP from "../models/OTP";
import { sendEmail } from "../services/mailService";

export const sendOTP = async (req: Request, res: Response) => {
  const { user_id, email } = req.body;

  const requiredFields = ["user_id", "email"];
  const missingFields = requiredFields.filter((field) => !req.body[field]);

  if (missingFields.length > 0) {
    return res.status(400).json({
      status: "fail",
      message: "Missing required fields.",
      requiredFields: missingFields,
    });
  }
  const otp_random = Math.floor(100000 + Math.random() * 900000);

  try {
    const otpinDB = await OTP.findOne({ user_id: user_id, email: email });
    let otp = otpinDB ? otpinDB.otp : otp_random;

    if (!otpinDB) {
      OTP.create({
        user_id: user_id,
        email: email,
        otp,
      });
    }

    const htmlMessage = `<html>
  <head>
    <style>
      body {
        font-family: Arial, sans-serif;
        line-height: 1.6;
        color: #333;
        max-width: 600px;
        margin: 0 auto;
        padding: 20px;
      }
      h1 {
        color: #007bff;
        border-bottom: 2px solid #007bff;
        padding-bottom: 10px;
        text-align: center;
      }
      div.container {
        background-color: rgb(235, 235, 235);
        width: 500px;
        padding: 50px;
        margin: 20px;
      }
      div.otp {
        font-size: 32px;
        font-weight: bold;
        color: #28a745;
        padding: 10px 15px;
        border-radius: 5px;
        display: flex;
        justify-content: center;
      }
      div.footer {
        margin-top: 20px;
        font-size: 12px;
        color: #6c757d;
        text-align: center;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <h1>Email Verification OTP</h1>
      <p>Your OTP for email verification is:</p>
      <div class="otp">${otp}</div>
      <p>Please use this OTP to complete your email verification process.</p>
      <p>If you didn't request this OTP, please ignore this email.</p>
      <div class="footer">
        This is an automated message. Please do not reply to this email.
      </div>
    </div>
  </body>
</html>
`;

    // send email
    // const isSuccess = await sendEmail(
    //   email,
    //   "OTP for email verification",
    //   htmlMessage
    // );
    // if (!isSuccess) {
    //   throw new Error(`Failed to send ${email}.`);
    // }

    res.status(200).json({
      status: "success",
      message: "OTP sent successfully.",
    });
  } catch (error) {
    console.error(`Failed to send OTP : ${error}`);
    return res.status(500).json({
      status: "fail",
      message: `Failed to send OTP : ${error}`,
    });
  }
};

export const verifyOTP = async (req: Request, res: Response) => {
  const { user_id, email, otp } = req.body;

  const requiredFields = ["user_id", "email", "otp"];
  const missingFields = requiredFields.filter((field) => !req.body[field]);

  if (missingFields.length > 0) {
    return res.status(400).json({
      status: "fail",
      message: "Missing required fields.",
      requiredFields: missingFields,
    });
  }

  try {
    const otpInDB = await OTP.findOne({ user_id, email });
    if (!otpInDB) {
      return res.status(404).json({
        status: "fail",
        message: "OTP expired. Please request a new OTP.",
      });
    }

    if (otpInDB.otp !== otp) {
      return res.status(400).json({
        status: "fail",
        message: "Invalid OTP. Please try again.",
      });
    }

    await OTP.deleteOne({ user_id, email });
    res.status(200).json({
      status: "success",
      message: "OTP verified successfully.",
    });
  } catch (error) {
    console.error(`Failed to verify OTP : ${error}`);
    return res.status(500).json({
      status: "fail",
      message: error,
    });
  }
};
