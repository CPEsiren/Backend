import mongoose, { Schema, Document } from "mongoose";

export interface ITrigger extends Document {
  trigger_name: string;
  type: "item" | "host";
  host_id: mongoose.Types.ObjectId;
  severity: "warning" | "critical" | "disaster";
  expression: string;
  logicExpression: string[];
  isExpressionValid: boolean;
  items: [string, mongoose.Types.ObjectId][];
  valueItem: number[];
  ok_event_generation: "expression" | "resolved expression" | "none";
  recovery_expression: string;
  logicRecoveryExpression: string[];
  isRecoveryExpressionValid: boolean;
  thresholdDuration: number;
  enabled: boolean;
  createdAt: Date;
  expressionPart: {
    item: string;
    operation: string;
    value: string;
    operator: string;
    functionofItem: string;
    duration: string;
  }[];
  expressionRecoveryPart: {
    item: string;
    operation: string;
    value: string;
    operator: string;
    functionofItem: string;
    duration: string;
  }[];
}

const TriggerSchema: Schema<ITrigger> = new Schema(
  {
    trigger_name: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ["item", "host"],
      required: true,
    },
    host_id: {
      type: Schema.Types.ObjectId,
      ref: "Host",
      required: true,
    },
    severity: {
      type: String,
      enum: ["warning", "critical", "disaster"],
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
    valueItem: {
      type: [Number],
      default: [],
    },
    ok_event_generation: {
      type: String,
      enum: ["expression", "resolved expression", "none"],
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
    thresholdDuration: {
      type: Number,
      default: 0,
    },
    enabled: {
      type: Boolean,
      default: true,
    },
    expressionPart: {
      type: [
        {
          item: String,
          operation: String,
          value: String,
          operator: String,
          functionofItem: String,
          duration: String,
        },
      ],
      default: [],
    },
    expressionRecoveryPart: {
      type: [
        {
          item: String,
          operation: String,
          value: String,
          operator: String,
          functionofItem: String,
          duration: String,
        },
      ],
      default: [],
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

TriggerSchema.index(
  {
    trigger_name: 1,
    severity: 1,
    host_id: 1,
  },
  { unique: true }
);

export default mongoose.model<ITrigger>("Trigger", TriggerSchema);
