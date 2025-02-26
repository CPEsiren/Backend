import mongoose, { Document, Schema } from "mongoose";

interface IOTP extends Document {
  user_id: mongoose.Types.ObjectId;
  email: string;
  otp: number;
  createdAt: Date;
}

const OTPSchema: Schema = new Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  email: { type: String, required: true },
  otp: { type: String, required: true },
  createdAt: { type: Date, default: Date.now, expires: 300 }, // 300 seconds = 5 minutes
});

const OTP = mongoose.model<IOTP>("OTP", OTPSchema);

export default OTP;
