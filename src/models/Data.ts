import mongoose, { Schema, Document } from "mongoose";

export interface IData extends Document {
  value: string;
  Change_per_second: string;
  timestamp: Date;
  metadata: {
    host_id: mongoose.Types.ObjectId;
    item_id: mongoose.Types.ObjectId;
    item_type: string;
  };
}

const dataSchema: Schema<IData> = new mongoose.Schema(
  {
    value: { type: String, required: true },
    Change_per_second: { type: String, required: true },
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
      granularity: "seconds",
    },
    expireAfterSeconds: 86400,
  }
);

export default mongoose.model<IData>("Data", dataSchema);
