import { createSnmpSession, getSnmpData } from "../controllers/snmpControllers";
import { Db, ObjectId } from "mongodb";
import Host from "../models/Host";
import Data from "../models/Data";
import Item from "../models/Item";

export async function fetchAndStoreSnmpData() {
  const hosts = await Host.find();
  const results = [];

  for (const host of hosts) {
    const { session, isConnected } = await createSnmpSession(
      host.ip_address as string,
      host.community as string,
      host.snmp_port as number,
      host.snmp_version as string
    );

    if (!isConnected || !session) {
      host.status = 0;
      await host.save();
      const err = `SNMP connection failed for host ${host.hostname} (IP: ${host.ip_address}, Community: ${host.snmp_community})`;
      console.log(err);
      continue;
    }

    host.status = 1;
    await host.save();

    const items = await Item.find({ host_id: host._id });

    for (const item of items) {
      try {
        const snmpData = await getSnmpData(item.oid, session);

        item.status = 1;
        await item.save();

        const data = new Data({
          value: snmpData[0]?.value,
          timestamp: new Date(),
          metadata: {
            host_id: host._id,
            item_id: item._id,
            item_name: item.name_item,
            hostname: host.hostname,
          },
        });

        await data.save();
        results.push(data);
      } catch {
        item.status = 0;
        await item.save();
        const err = `No data returned for OID ${item.oid} on host ${host._id}`;
        console.error(err);
      }
    }
  }
  return results;
}

async function createJsonInterface(session: any, db: Db) {
  const history_collection = db.collection("Histories");

  try {
  } catch (error) {}
}
