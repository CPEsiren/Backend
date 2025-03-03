import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

export async function sendEmail(to: string, subject: string, message: string) {
  const htmlBody = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${subject}</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          background-color: #f4f4f4;
        }
        .container {
          max-width: 600px;
          margin: 20px auto;
          padding: 20px;
          background-color: #fff;
          border: 1px solid #ddd;
          border-radius: 5px;
          box-shadow: 0 0 10px rgba(0,0,0,0.1);
        }
        h1 {
          color: #444;
          border-bottom: 2px solid #444;
          padding-bottom: 10px;
        }
        .alert-info {
          background-color: #e8f4fd;
          border-left: 5px solid #2196F3;
          padding: 10px;
          margin-bottom: 10px;
        }
        .alert-info strong {
          color: #0c5460;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>${subject}</h1>
        <div class="alert-info">
          ${message.replace(/\n/g, "<br>")}
        </div>
      </div>
    </body>
    </html>
  `;

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
    html: htmlBody,
  };

  try {
    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    return false;
  }
}
