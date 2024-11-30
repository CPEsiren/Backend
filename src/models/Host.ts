import mongoose, { Schema } from "mongoose";

const hostSchema: Schema = new mongoose.Schema({
  hostname: { type: String, required: true },
  ip_address: { type: String, required: true },
  snmp_port: { type: String, required: true },
  snmp_version: { type: String, default: "v2c" },
  snmp_community: { type: String, required: true },
  hostgroup: { type: String },
  template_name: { type: String },
  status: { type: Number, default: 0 },
  details: { type: Object },
  items: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Item",
      _id: false,
    },
  ],
  createAt: { type: Date, default: Date.now },
  updateAt: { type: Date, default: Date.now },
});

export default mongoose.model("Host", hostSchema);
