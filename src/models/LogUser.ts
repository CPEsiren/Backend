import mongoose, { Document, Schema } from "mongoose";

// Interface for the Log document
export interface ILogUser extends Document {
  image: string;
  username: string;
  role: string;
  activity: string;
  createdAt: Date;
}

// Schema for the Log model
const LogUserSchema: Schema = new Schema(
  {
    username: { type: String, required: true },
    role: { type: String, required: true },
    activity: { type: String, required: true },
  },
  {
    timestamps: { createdAt: true },
    expireAfterSeconds: 2628000,
  }
);

// Explicitly set no index
LogUserSchema.set("autoIndex", false);

// Create and export the model
export default mongoose.model<ILogUser>("LogUser", LogUserSchema);
