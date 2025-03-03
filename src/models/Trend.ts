import mongoose, { Schema, Document } from "mongoose";

export interface ITrend extends Document {
  min_value: number;
  max_value: number;
  avg_value: number;
  num_values: number;
  timestamp: Date;
  metadata: {
    host_id: mongoose.Types.ObjectId;
    item_id: mongoose.Types.ObjectId;
    isBandwidth: boolean;
  };
}

const trendSchema: Schema<ITrend> = new mongoose.Schema(
  {
    min_value: { type: Number, required: true },
    max_value: { type: Number, required: true },
    avg_value: { type: Number, required: true },
    num_values: { type: Number, required: true },
    timestamp: { type: Date, required: true },
    metadata: {
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
      isBandwidth: { type: Boolean, required: true },
    },
  },
  {
    timeseries: {
      timeField: "timestamp",
      metaField: "metadata",
      granularity: "minutes",
    },
    expireAfterSeconds: 15778463,
  }
);

export default mongoose.model<ITrend>("Trend", trendSchema);
