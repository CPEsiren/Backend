import mongoose, { Schema } from "mongoose";

interface IDashboard extends Document {
  dashboard_name: string;
  widget: [
    {
      index: number;
      id: string;
      type: string;
    }
  ];
  isAdmin: boolean;
}

const dashboardSchema = new Schema({
  dashboard_name: { type: String, required: true },
  widget: [
    {
      _id: false,
      index: { type: Number, required: true },
      id: { type: String, required: true },
      type: { type: String, required: true },
    },
  ],
});

export default mongoose.model("Dashboard", dashboardSchema);
