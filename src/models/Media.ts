// FILEPATH: /d:/CPE-Siren/Backend/src/models/Media.ts

import mongoose, { Schema, Document } from "mongoose";

export interface IMedia extends Document {
  type: "email" | "line";
  details: Record<string, any>;
  user_id: mongoose.Types.ObjectId;
}

const MediaSchema: Schema<IMedia> = new Schema(
  {
    type: {
      type: String,
      enum: ["email", "line"],
      required: true,
    },
    details: [
      {
        type: Schema.Types.Mixed,
        required: true,
      },
    ],
    user_id: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for efficient querying
MediaSchema.index({ userId: 1, type: 1 });

export default mongoose.model<IMedia>("Media", MediaSchema);
