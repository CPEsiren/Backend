import mongoose, { Schema, Document } from "mongoose";

export interface ITrend extends Document {
  value_min: number;
  value_max: number;
  value_avg: number;
  timestamp: Date;
  metadata: {
    host_id: mongoose.Types.ObjectId;
    item_id: mongoose.Types.ObjectId;
    item_type: string;
  };
}

const trendSchema: Schema<ITrend> = new mongoose.Schema(
  {
    value_min: { type: Number, required: true },
    value_max: { type: Number, required: true },
    value_avg: { type: Number, required: true },
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
      item_type: { type: String },
    },
  },
  {
    timeseries: {
      timeField: "timestamp",
      metaField: "metadata",
      granularity: "minutes",
    },
    expireAfterSeconds: 31556926,
  }
);

export default mongoose.model<ITrend>("Trend", trendSchema);
