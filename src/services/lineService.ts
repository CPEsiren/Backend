import dotenv from "dotenv";
import axios from "axios";

dotenv.config();

const LINE_BOT_API = "https://api.line.me/v2/bot/message/push";

const headers = {
  "Content-Type": "application/json",
  Authorization: `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
};

export async function sendLine(userId: string, message: string): Promise<void> {
  try {
    const requestBody = {
      to: userId,
      messages: [{ type: "text", text: message }],
    };
    await axios.post(LINE_BOT_API, requestBody, { headers });
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
    } else {
    }
  }
}
