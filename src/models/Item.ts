import mongoose, { Schema } from "mongoose";

const itemSchema = new mongoose.Schema({
  host_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Host",
    required: true,
  },
  name_item: { type: String, required: true },
  oid: { type: String, required: true },
  type: { type: String, required: true },
  unit: { type: String, required: true },
  interval: { type: Number, default: 60 },
  status: { type: Number, default: 0 },
  createAt: {
    type: Date,
    default: Date.now(),
  },
  updateAt: {
    type: Date,
    default: Date.now(),
  },
});

export default mongoose.model("Item", itemSchema);
