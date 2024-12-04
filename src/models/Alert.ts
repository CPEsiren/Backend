import { time } from "console";
import mongoose, { Schema } from "mongoose";

const alertSchema: Schema = new mongoose.Schema(
  {
    problem: { type: String, required: true },
    pDetail: { type: String },
    hostId: { type: String, required: true },
    area: { type: String },
    startDate: { type: Date, required: true },
    startTime: { type: String, required: true }, //Time is not type in mongoose then store like HH:mm:ss
    endDate: { type: Date },
    endTime: { type: String }, //Time is not type in mongoose
    pStatus: { type: Number, default: 0 },
  },
  {
    timestamps: true, // Automatically adds `createdAt` and `updatedAt`
  }
);

export default mongoose.model("Alert", alertSchema);
