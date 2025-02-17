// FILEPATH: /d:/CPE-Siren/Backend/src/models/Media.ts

import mongoose, { Schema, Document } from "mongoose";

export interface IMedia extends Document {
  user_id: mongoose.Types.ObjectId;
  type: "email" | "line";
  recipients: string[];
  disciption: string;
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
    recipients: {
      type: [String],
      required: true,
    },
    disciption: {
      type: String,
      default: "",
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

export default mongoose.model<IMedia>("Media", MediaSchema);
