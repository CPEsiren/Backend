import mongoose, { Schema, Document } from "mongoose";

export interface IUser extends Document {
  username: string;
  email: string;
  picture?: string;
  role: "admin" | "viewer";
  createdAt: Date;
  isActive: boolean;
  token: string;
}

const UserSchema: Schema<IUser> = new Schema(
  {
    username: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    picture: {
      type: String,
    },
    role: {
      type: String,
      enum: ["admin", "viewer"],
      default: "viewer",
    },
    isActive: {
      type: Boolean,
      default: false,
    },
    token: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: { createdAt: "createdAt", updatedAt: false },
  }
);

export const User = mongoose.model<IUser>("User", UserSchema);
