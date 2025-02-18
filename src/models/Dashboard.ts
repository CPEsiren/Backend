import mongoose, { Schema } from "mongoose";

interface IDashboard extends Document {
  dashboard_name: string;
  user_id: mongoose.Types.ObjectId;
  widget: [
    {
      index: number;
      id: string;
      type: string;
    }
  ];
  isViewer: boolean;
}

const dashboardSchema: Schema<IDashboard> = new Schema({
  dashboard_name: { type: String, required: true },
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  widget: [
    {
      _id: false,
      index: { type: Number, required: true },
      id: { type: String, required: true },
      type: { type: String, required: true },
    },
  ],
  isViewer: { type: Boolean, default: false },
});

export default mongoose.model("Dashboard", dashboardSchema);
