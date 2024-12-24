import mongoose, { Schema, Document } from "mongoose";

export interface ITrigger extends Document {
  trigger_name: string;
  host_id: mongoose.Types.ObjectId;
  item_id: mongoose.Types.ObjectId;
  ComparisonOperator: string;
  valuetrigger: number;
  severity: "warning" | "critical";
  enabled: boolean;
  createdAt: Date;
}

const TriggerSchema: Schema<ITrigger> = new Schema(
  {
    trigger_name: {
      type: String,
      required: true,
      trim: true,
    },
    host_id: {
      type: Schema.Types.ObjectId,
      ref: "Host",
      required: true,
    },
    item_id: {
      type: Schema.Types.ObjectId,
      ref: "Item",
      required: true,
    },
    ComparisonOperator: {
      type: String,
      required: true,
      enum: ["<", "<=", "=", ">=", ">", "!="], // Add valid operators
    },
    valuetrigger: {
      type: Number,
      required: true,
    },
    severity: {
      type: String,
      enum: ["warning", "critical"],
      required: true,
    },
    enabled: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// Compound indexes for efficient querying
TriggerSchema.index({ name: 1, severity: 1 });
TriggerSchema.index({ host_id: 1, item_id: 1 });

export default mongoose.model<ITrigger>("Trigger", TriggerSchema);
