// import { Log } from "../models/Log";
// import path from "path";
// import fs from "fs";

// export let logFile = "";

export async function createTime(): Promise<string> {
  const date = new Date().toLocaleString("en-US", {
    timeZone: "Asia/Bangkok",
    hour12: false,
  });
  return date;
}

// export async function createFileLog() {
//   // Create logs directory if it doesn't exist
//   const logsDir = path.join(process.cwd(), "logs");
//   if (!fs.existsSync(logsDir)) {
//     fs.mkdirSync(logsDir);
//   }

//   // Create log file with timestamp in Thai timezone
//   const namefile = new Date().toLocaleString("en-US", {
//     timeZone: "Asia/Bangkok",
//   });

//   // Format the date as YYYY-MM-DD
//   const formattedDate = new Date(namefile).toISOString().split("T")[0];

//   logFile = path.join(logsDir, `${formattedDate}.log`);
//   fs.appendFileSync(
//     logFile,
//     `[${await createTime()}] : [INFO] Application started. \n`
//   );

//   console.log(`Log file created: ${logFile}`);
// }

// export async function addLog(level: string, message: string, addDB: boolean) {
//   const date = await createTime();
//   const log = `[${date}] : [${level}] ${message}\n`;
//   fs.appendFileSync(logFile, log);
//   if (addDB) {
//     // Add log to database
//     const log = new Log({ timestamp: date, level, message });
//     await log.save();
//   }
// }
