import mongoose, { Schema } from "mongoose";

const dataSchema: Schema = new mongoose.Schema(
  {
    value: { type: String, required: true },
    Simple_change: { type: String, required: true },
    Change_per_second: { type: String, required: true },
    timestamp: { type: Date, required: true, default: Date.now() },
    metadata: {
      host_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Host",
        required: true,
      },
      item_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Item",
        required: true,
      },
    },
  },
  {
    timeseries: {
      timeField: "timestamp",
      metaField: "metadata",
      granularity: "seconds",
    },
    expireAfterSeconds: 86400,
  }
);

export default mongoose.model("Data", dataSchema);
