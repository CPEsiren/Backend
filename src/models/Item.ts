import mongoose, { Schema, Document } from "mongoose";

export interface IItem extends Document {
  _id: mongoose.Types.ObjectId;
  host_id: mongoose.Types.ObjectId;
  item_name: string;
  oid: string;
  type: "counter" | "integer";
  unit: string;
  interval: number;
  isBandwidth: boolean;
  isOverview: boolean;
}

const itemSchema: Schema<IItem> = new mongoose.Schema(
  {
    host_id: {
      type: Schema.Types.ObjectId,
      ref: "Host",
      required: true,
    },
    item_name: { type: String, required: true },
    oid: { type: String, required: true },
    type: { type: String, required: true, enum: ["counter", "integer"] },
    unit: { type: String, required: true },
    interval: { type: Number, default: 10 },
    isBandwidth: { type: Boolean, default: false },
    isOverview: { type: Boolean, default: false },
  },
  {
    timestamps: { createdAt: "createAt", updatedAt: "updateAt" },
  }
);

itemSchema.index({ host_id: 1, item_name: 1 }, { unique: true });

export default mongoose.model<IItem>("Item", itemSchema);
