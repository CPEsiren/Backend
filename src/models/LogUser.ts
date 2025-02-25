import mongoose, { Document, Schema } from "mongoose";

// Interface for the Log document
export interface ILog extends Document {
  image: string;
  username: string;
  role: string;
  activity: string;
  createdAt: Date;
}

// Schema for the Log model
const LogSchema: Schema = new Schema(
  {
    username: { type: String, required: true },
    role: { type: String, required: true },
    activity: { type: String, required: true },
  },
  {
    timestamps: { createdAt: true },
    expireAfterSeconds: 31556926,
  }
);

// Explicitly set no index
LogSchema.set("autoIndex", false);

// Create and export the model
export const Log = mongoose.model<ILog>("Log", LogSchema);
