import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

export async function sendEmail(to: string, subject: string, message: string) {
  var transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    auth: {
      user: process.env.GOOGLE_MAIL_APP_EMAIL,
      pass: process.env.GOOGLE_MAIL_APP_PASSWORD,
    },
  });

  var mailOptions = {
    from: process.env.GOOGLE_MAIL_APP_EMAIL,
    to,
    subject,
    html: message,
  };

  try {
    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    return false;
  }
}
