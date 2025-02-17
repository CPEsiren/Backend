import mongoose, { Schema, Document } from "mongoose";

export interface IEvent extends Document {
  trigger_id: mongoose.Types.ObjectId;
  type: "item" | "host";
  severity:
    | "not classified"
    | "information"
    | "warning"
    | "average"
    | "high"
    | "disaster";
  hostname: string;
  status: "PROBLEM" | "RESOLVED";
  value_alerted: number;
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
      enum: [
        "not classified",
        "information",
        "warning",
        "average",
        "high",
        "disaster",
      ],
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
    value_alerted: { type: Number, required: true },
    message: { type: String, required: true },
  },
  {
    timestamps: { createdAt: true, updatedAt: true },
  }
);

// Compound index for efficient querying
EventSchema.index({ triggerId: 1, timestamp: -1 });

export default mongoose.model<IEvent>("Event", EventSchema);
