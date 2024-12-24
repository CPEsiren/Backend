import mongoose, { Schema, Document } from "mongoose";

export interface IEvent extends Document {
  trigger_id: mongoose.Types.ObjectId;
  timestamp: Date;
  status: "PROBLEM" | "RESOLVED";
  message: string;
}

const EventSchema: Schema<IEvent> = new mongoose.Schema(
  {
    trigger_id: {
      type: Schema.Types.ObjectId,
      ref: "Trigger",
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
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
EventSchema.index({ triggerId: 1, timestamp: -1 });

export default mongoose.model<IEvent>("Event", EventSchema);
