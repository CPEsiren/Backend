import mongoose from "mongoose";

const templateSchema = new mongoose.Schema({
  template_name: { type: String, required: true, unique: true },
  items: [
    {
      item_name: { type: String },
      oid: { type: String },
      type: { type: String },
      unit: { type: String },
      interval: { type: Number },
    },
  ],
  description: { type: String },
});

export default mongoose.model("Template", templateSchema);
