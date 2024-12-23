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

    // console.log("Message sent successfully:", response.data);
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      console.error("Error sending message via LINE API:", {
        status: error.response.status,
        data: error.response.data,
      });
      throw new Error(
        `LINE API Error: ${error.response.status} - ${JSON.stringify(
          error.response.data
        )}`
      );
    } else {
      console.error("Unexpected error:", error);
      throw error;
    }
  }
}
