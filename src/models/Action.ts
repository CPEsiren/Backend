import mongoose, { Schema, Document } from "mongoose";

export interface IAction extends Document {
  action_name: string;
  user_id: mongoose.Types.ObjectId;
  media_ids: mongoose.Types.ObjectId[];
  subjectProblemTemplate: string;
  messageProblemTemplate: string;
  subjectRecoveryTemplate: string;
  messageRecoveryTemplate: string;
  duration: string;
  enabled: boolean;
  createdAt: Date;
}

const ActionSchema: Schema<IAction> = new mongoose.Schema(
  {
    action_name: {
      type: String,
      required: true,
    },
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    media_ids: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Media",
      },
    ],
    subjectProblemTemplate: {
      type: String,
      required: true,
    },
    messageProblemTemplate: {
      type: String,
      required: true,
    },
    subjectRecoveryTemplate: {
      type: String,
      required: true,
    },
    messageRecoveryTemplate: {
      type: String,
      required: true,
    },
    duration: {
      type: String,
      default: "30m",
    },
    enabled: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: true },
  }
);

// Compound index for efficient querying
ActionSchema.index({ triggerId: 1, mediaId: 1 });

export default mongoose.model<IAction>("Action", ActionSchema);
