import mongoose, { Schema } from "mongoose";

const templateSchema = new mongoose.Schema({
  name_template: { type: String, required: true, unique: true },
  items: [
    {
      name_item: { type: String },
      oid: { type: String },
      type: { type: String },
      unit: { type: String },
    },
  ],
  description: { type: String },
});

export default mongoose.model("Template", templateSchema);
