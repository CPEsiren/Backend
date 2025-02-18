import mongoose, { Schema } from "mongoose";

interface IDashboard extends Document {
  dashboard_name: string;
  user_id: mongoose.Types.ObjectId;
  isDefault: {
    type: Boolean;
    default: false;
  };
  components: [
    {
      id: string;
      position: number;
      componentType: string;
      graphSelection: {
        graphID: string;
      };
      settings: Schema.Types.Mixed;
    }
  ];
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
    isDefault: {
      type: Boolean,
      default: false,
    },
    components: [
      {
        id: {
          type: String,
          required: true,
        },
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
          graphId: String,
        },
        settings: {
          type: Map,
          of: Schema.Types.Mixed,
          default: {},
        },
      },
    ],
  },
  {
    timestamps: { createdAt: true, updatedAt: true },
  }
);

export default mongoose.model("Dashboard", dashboardSchema);
