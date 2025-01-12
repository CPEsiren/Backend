import mongoose, { Document, Schema } from "mongoose";
import { createTime } from "../services/logService";

// Interface for the Log document
export interface ILog extends Document {
  timestamp: Date;
  level: string;
  message: string;
  metadata?: Record<string, any>;
}

// Schema for the Log model
const LogSchema: Schema = new Schema(
  {
    timestamp: {
      type: Date,
      default: createTime(),
    },
    level: {
      type: String,
      required: true,
      enum: ["INFO", "WARN", "ERROR", "DEBUG"],
    },
    message: {
      type: String,
      required: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
    },
  },
  {
    timestamps: false, // Disable automatic timestamps
    versionKey: false, // Disable the version key
  }
);

// Explicitly set no index
LogSchema.set("autoIndex", false);

// Create and export the model
export const Log = mongoose.model<ILog>("Log", LogSchema);
