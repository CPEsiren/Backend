import mongoose from "mongoose";

interface ITemplate {
  template_name: string;
  items: {
    item_name: string;
    oid: string;
    type: "counter" | "integer";
    unit: string;
    interval: number;
  }[];
  triggers: {
    trigger_name: string;
    severity: "warning" | "critical" | "disaster";
    expression: string;
    ok_event_generation: "expression" | "recovery expression" | "none";
    recovery_expression: string;
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
  }[];
  description: string;
}

const templateSchema = new mongoose.Schema({
  template_name: { type: String, required: true, unique: true },
  items: [
    {
      item_name: { type: String },
      oid: { type: String },
      type: { type: String, enum: ["counter", "integer"] },
      unit: { type: String },
      interval: { type: Number },
    },
  ],
  triggers: [
    {
      trigger_name: { type: String },
      severity: { type: String, enum: ["warning", "critical", "disaster"] },
      expression: { type: String },
      ok_event_generation: {
        type: String,
        enum: ["expression", "recovery expression", "none"],
      },
      recovery_expression: { type: String },
      expressionPart: [
        {
          item: { type: String },
          operation: { type: String },
          value: { type: String },
          operator: { type: String },
          functionofItem: { type: String },
          duration: { type: String },
        },
      ],
      expressionRecoveryPart: [
        {
          item: { type: String },
          operation: { type: String },
          value: { type: String },
          operator: { type: String },
          functionofItem: { type: String },
          duration: { type: String },
        },
      ],
    },
  ],
  description: { type: String },
});

export default mongoose.model("Template", templateSchema);
