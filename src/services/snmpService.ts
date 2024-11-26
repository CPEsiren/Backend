import { getDb } from "../services/database";
import { createSnmpSession, getSnmpData } from "../controllers/snmpControllers";
import { ObjectId } from "mongodb";

export async function fetchAndStoreSnmpData() {
  const db = getDb();
  const history_collection = db.collection("Histories");
  const host_collection = db.collection("Hosts");
  const item_collection = db.collection("Items");
  const hosts = await host_collection.find().toArray();

  const results = [];

  for (const host of hosts) {
    const { session, isConnected } = await createSnmpSession(
      host.ip_address,
      host.community
    );

    if (!isConnected || !session) {
      await host_collection.updateOne(
        { _id: new ObjectId(host._id) },
        { $set: { status: 0 } }
      );
      const err = `SNMP connection failed for host ${host._id} (IP: ${host.ip_address}, Community: ${host.community})`;
      console.error(err);
      continue;
    }
    await host_collection.updateOne(
      { _id: new ObjectId(host._id) },
      { $set: { status: 1 } }
    );

    const items = await item_collection
      .find({
        host_id: new ObjectId(host._id),
      })
      .toArray();

    for (const item of items) {
      try {
        const snmpData = await getSnmpData(item.oid, session);

        await item_collection.updateOne(
          { _id: new ObjectId(item._id) },
          { $set: { status: 1 } }
        );

        const result = await history_collection.insertOne({
          metadata: {
            host_id: host._id,
            item_id: item._id,
            item_name: item.name_item,
          },
          timestamp: new Date(),
          value: snmpData[0]?.value,
        });
        results.push(result);
      } catch {
        await item_collection.updateOne(
          { _id: new ObjectId(item._id) },
          { $set: { status: 0 } }
        );
        const err = `No data returned for OID ${item.oid} on host ${host._id}`;
        console.error(err);
      }
    }
  }
  return results;
}
