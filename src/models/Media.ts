// FILEPATH: /d:/CPE-Siren/Backend/src/models/Media.ts

import mongoose, { Schema, Document } from "mongoose";

export interface IMedia extends Document {
  user_id: mongoose.Types.ObjectId;
  type: "email" | "line";
  recipient: {
    name: string;
    send_to: string;
  };
  problem_title: string;
  problem_body: string;
  recovery_title: string;
  recovery_body: string;
  enabled: boolean;
  createdAt: Date;
}

const MediaSchema: Schema<IMedia> = new Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: ["email", "line"],
      required: true,
    },
    recipient: {
      name: {
        type: String,
        required: true,
      },
      send_to: {
        type: String,
        required: true,
      },
    },
    problem_title: {
      type: String,
      required: true,
    },
    problem_body: {
      type: String,
      required: true,
    },
    recovery_title: {
      type: String,
      required: true,
    },
    recovery_body: {
      type: String,
      required: true,
    },
    enabled: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: {
      createdAt: true,
      updatedAt: true,
    },
  }
);

MediaSchema.index({ recipient: 1 }, { unique: true });

export default mongoose.model<IMedia>("Media", MediaSchema);
