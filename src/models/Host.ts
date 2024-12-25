import mongoose, { Schema, Document } from "mongoose";

interface IHost extends Document {
  hostname: string;
  ip_address: string;
  snmp_port: string;
  snmp_version: string;
  snmp_community: string;
  hostgroup?: string;
  template_name?: string;
  status: number;
  details?: Record<string, any>;
  items: mongoose.Types.ObjectId[];
  createAt: Date;
  updateAt: Date;
  interfaces: [
    {
      interface_name: string;
      interface_type: string;
      interface_speed: string;
      interface_Adminstatus: string;
      interface_Operstatus: string;
    }
  ];
}

const hostSchema: Schema<IHost> = new mongoose.Schema(
  {
    hostname: { type: String, required: true },
    ip_address: { type: String, required: true },
    snmp_port: { type: String, required: true },
    snmp_version: { type: String, default: "v2c" },
    snmp_community: { type: String, required: true },
    hostgroup: { type: String, required: true },
    template_name: { type: String },
    status: { type: Number, default: 0 },
    details: { type: Object },
    items: [{ type: Schema.Types.ObjectId, ref: "Item" }],
    interfaces: [
      {
        interface_name: { type: String, required: true },
        interface_type: { type: String, required: true },
        interface_speed: { type: String, required: true },
        interface_Adminstatus: { type: String, required: true },
        interface_Operstatus: { type: String, required: true },
      },
    ],
  },
  {
    timestamps: { createdAt: "createAt", updatedAt: "updateAt" },
  }
);

hostSchema.index({ hostname: 1, ip_address: 1 }, { unique: true });

export default mongoose.model<IHost>("Host", hostSchema);
