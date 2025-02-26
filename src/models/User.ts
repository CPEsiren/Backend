import mongoose, { Schema, Document } from "mongoose";

export interface IUser extends Document {
  username: string;
  email: string;
  picture?: string;
  role: "superdamin" | "admin" | "viewer";
  token: string;
  tokenExp: Date;
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
      enum: ["superadmin", "admin", "viewer"],
      default: "viewer",
    },
    token: {
      type: String,
      required: true,
    },
    tokenExp: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: true },
  }
);

export const User = mongoose.model<IUser>("User", UserSchema);
