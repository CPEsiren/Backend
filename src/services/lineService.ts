import dotenv from "dotenv";
import axios from "axios";
import { body } from "express-validator";

dotenv.config();

const LINE_BOT_API = "https://api.line.me/v2/bot/message/push";

const headers = {
  "Content-Type": "application/json",
  Authorization: `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
};

export async function sendLine(
  userId: string,
  title: string,
  message: string
): Promise<void> {
  try {
    const messageline = {
      type: "flex",
      altText: title,
      contents: {
        type: "bubble",
        body: {
          type: "box",
          layout: "vertical",
          contents: [
            {
              type: "text",
              text: title,
              wrap: true,
              weight: "bold",
              size: "xl",
            },
            {
              type: "text",
              text: message,
              wrap: true,
              color: "#666666",
              size: "sm",
              flex: 5,
            },
          ],
        },
      },
    };
    const requestBody = {
      to: userId,
      messages: [messageline],
    };
    await axios.post(LINE_BOT_API, requestBody, { headers });
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      console.error("LINE API Error:", error.response.data);
    } else {
      console.error("Error sending message to LINE:", error);
    }
  }
}
