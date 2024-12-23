import mongoose, { Schema, Document } from "mongoose";

export interface IAction extends Document {
  action_name: string;
  media_id: mongoose.Types.ObjectId;
  messageTemplate: string;
  enabled: boolean;
}

const ActionSchema: Schema<IAction> = new mongoose.Schema({
  action_name: {
    type: String,
    required: true,
  },
  media_id: {
    type: Schema.Types.ObjectId,
    ref: "Media",
    required: true,
  },
  messageTemplate: {
    type: String,
    required: true,
  },
  enabled: {
    type: Boolean,
    default: true,
  },
});

// Compound index for efficient querying
ActionSchema.index({ triggerId: 1, mediaId: 1 });

export default mongoose.model<IAction>("Action", ActionSchema);
