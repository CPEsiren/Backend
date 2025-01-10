import { addLog } from "./logService";
import axios from "axios";

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
    const response = await axios.post(LINE_BOT_API, requestBody, { headers });
    await addLog("INFO", `Message sent successfully: ${response.data}`, false);
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      await addLog(
        "ERROR",
        `Error sending message via LINE API: ${error}`,
        false
      );
    } else {
      await addLog("ERROR", `Unexpected error: ${error}`, false);
    }
  }
}
