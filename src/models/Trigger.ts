import mongoose, { Schema, Document } from "mongoose";

export interface ITrigger extends Document {
  trigger_name: string;
  host_id: mongoose.Types.ObjectId;
  severity:
    | "not classified"
    | "information"
    | "warning"
    | "average"
    | "high"
    | "disaster";
  expression: string;
  logicExpression: string[];
  isExpressionValid: boolean;
  items: [string, mongoose.Types.ObjectId][];
  ok_event_generation: "expression" | "recovery expression" | "none";
  recovery_expression: string;
  logicRecoveryExpression: string[];
  isRecoveryExpressionValid: boolean;
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
    expression: {
      type: String,
      required: true,
    },
    logicExpression: {
      type: [String],
      default: [],
    },
    isExpressionValid: {
      type: Boolean,
      default: false,
    },
    items: {
      type: [[String, Schema.Types.ObjectId]],
      default: [],
    },
    ok_event_generation: {
      type: String,
      enum: ["expression", "recovery expression", "none"],
      required: true,
    },
    recovery_expression: {
      type: String,
    },
    logicRecoveryExpression: {
      type: [String],
      default: [],
    },
    isRecoveryExpressionValid: {
      type: Boolean,
      default: true,
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

export default mongoose.model<ITrigger>("Trigger", TriggerSchema);
