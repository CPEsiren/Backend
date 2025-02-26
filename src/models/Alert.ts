import mongoose, { Schema } from "mongoose";

export interface IAlert extends Document {
  action_id: mongoose.Types.ObjectId;
  event_id: mongoose.Types.ObjectId;
  status: "success" | "failed";
  sendLastAt: Date;
}

const alertSchema: Schema<IAlert> = new mongoose.Schema({
  action_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Action",
    required: true,
  },
  event_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Event",
    required: true,
  },
  status: {
    type: String,
    enum: ["success", "failed"],
  },
  sendLastAt: {
    type: Date,
    required: true,
  },
});

export default mongoose.model("Alert", alertSchema);
