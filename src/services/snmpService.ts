import { getDb } from "../services/database";
import { createSnmpSession, getSnmpData } from "../controllers/snmpControllers";
import { ObjectId } from "mongodb";

export async function fetchAndStoreSnmpData() {
  const db = getDb();
  const collection = db.collection("Histories");
  const hosts = await db.collection("Hosts").find().toArray();

  const results = [];

  for (const host of hosts) {
    const session = createSnmpSession(host.ip_address, host.community);

    const items = await db
      .collection("Items")
      .find({
        host_id: new ObjectId(host._id),
      })
      .toArray();

    for (const item of items) {
      const snmpData = await getSnmpData(item.oid, session);

      const result = await collection.insertOne({
        metadata: {
          host_id: host._id,
          item_id: item._id,
          item_name: item.name_item,
        },
        timestamp: new Date(),
        value: snmpData[0]?.value, // สมมติว่าค่าที่ดึงมาเป็นตัวแรก
      });

      results.push(result);
    }

    session.close();
  }

  return results;
}
