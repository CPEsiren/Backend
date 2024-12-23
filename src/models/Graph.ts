import mongoose, { Schema } from "mongoose";

interface IGraph extends Document {
  host_id: mongoose.Types.ObjectId;
  item_id: mongoose.Types.ObjectId;
  createAt: Date;
  updateAt: Date;
}

const graphSchema = new Schema(
  {
    host_id: {
      type: Schema.Types.ObjectId,
      ref: "Host",
      required: true,
    },
    item_id: [
      {
        type: Schema.Types.ObjectId,
        ref: "Item",
        required: true,
      },
    ],
    createAt: {
      type: Date,
      default: Date.now,
    },
    updateAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: { createdAt: "createAt", updatedAt: "updateAt" } }
);

export default mongoose.model("Graph", graphSchema);
