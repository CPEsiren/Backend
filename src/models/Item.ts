import mongoose, { Schema, Document } from "mongoose";

interface IItem extends Document {
  host_id: mongoose.Types.ObjectId;
  name_item: string;
  oid: string;
  type: string;
  unit: string;
  interval: number;
  status: number;
  createAt: Date;
  updateAt: Date;
}

const itemSchema: Schema<IItem> = new mongoose.Schema(
  {
    host_id: {
      type: Schema.Types.ObjectId,
      ref: "Host",
      required: true,
      index: true,
    },
    name_item: { type: String, required: true, index: true },
    oid: { type: String, required: true, index: true },
    type: { type: String, required: true },
    unit: { type: String, required: true },
    interval: { type: Number, default: 10 },
    status: { type: Number, default: 0, index: true },
  },
  {
    timestamps: { createdAt: "createAt", updatedAt: "updateAt" },
  }
);

itemSchema.index({ host_id: 1, name_item: 1 }, { unique: true });

export default mongoose.model<IItem>("Item", itemSchema);
