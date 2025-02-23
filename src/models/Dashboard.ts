import mongoose, { Schema } from "mongoose";

interface IDashboard extends Document {
  dashboard_name: string;
  user_id: mongoose.Types.ObjectId;
  components: [
    {
      position: number;
      componentType: string;
      graphSelection: {
        itemId: mongoose.Types.ObjectId;
        hostId: mongoose.Types.ObjectId;
      };
    }
  ];
  isViewer: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const dashboardSchema: Schema<IDashboard> = new Schema(
  {
    dashboard_name: {
      type: String,
      required: true,
    },
    user_id: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    components: [
      {
        position: {
          type: Number,
          required: true,
        },
        componentType: {
          type: String,
          required: true,
          enum: [
            "digitalClock",
            "analogClock",
            "table",
            "graph",
            "calendar",
            "eventblock",
          ],
        },
        graphSelection: {
          itemId: {
            type: Schema.Types.ObjectId,
            ref: "Item",
          },
          hostId: {
            type: Schema.Types.ObjectId,
            ref: "Host",
          },
        },
      },
    ],
    isViewer: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: true },
  }
);

export default mongoose.model("Dashboard", dashboardSchema);
