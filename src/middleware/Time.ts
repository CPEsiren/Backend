export async function createTime(): Promise<string> {
  const date = new Date().toLocaleString("en-US", {
    timeZone: "Asia/Bangkok",
    hour12: false,
  });
  return date;
}
