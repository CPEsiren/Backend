import mongoose, { Schema, Document } from "mongoose";

export interface IEvent extends Document {
  trigger_id: mongoose.Types.ObjectId;
  type: "item" | "host";
  severity: "warning" | "critical" | "disaster";
  hostname: string;
  status: "PROBLEM" | "RESOLVED";
  message: string;
  createdAt: Date;
  updatedAt: Date;
}

const EventSchema: Schema<IEvent> = new mongoose.Schema(
  {
    trigger_id: {
      type: Schema.Types.ObjectId,
      ref: "Trigger",
    },
    type: {
      type: String,
      enum: ["item", "host"],
      required: true,
    },
    severity: {
      type: String,
      enum: ["warning", "critical", "disaster"],
      required: true,
    },
    hostname: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["PROBLEM", "RESOLVED"],
    },
    message: { type: String, required: true },
  },
  {
    timestamps: { createdAt: true, updatedAt: true },
  }
);

// Compound index for efficient querying
EventSchema.index({ trigger_id: 1, timestamp: -1 });

export default mongoose.model<IEvent>("Event", EventSchema);
