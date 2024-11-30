import { createSnmpSession, getSnmpData } from "../controllers/snmpControllers";
import Host from "../models/Host";
import Data from "../models/Data";
import Item from "../models/Item";

export async function fetchAndStoreSnmpData() {
  try {
    const hosts = await Host.find();
    const results: any = [];

    const hostProcessPromises = hosts.map(async (host) => {
      try {
        const { session, isConnected } = await createSnmpSession(
          host.ip_address as string,
          host.community as string,
          host.snmp_port as number,
          host.snmp_version as string
        );

        // Update host status atomically
        await Host.findByIdAndUpdate(host._id, {
          status: isConnected ? 1 : 0,
        });

        if (!isConnected || !session) {
          console.warn(
            `SNMP connection failed for host ${host.hostname} (IP: ${host.ip_address})`
          );
          return [];
        }

        const items = await Item.find({ host_id: host._id });

        const itemProcessPromises = items.map(async (item) => {
          try {
            const [snmpData] = await getSnmpData(item.oid, session);

            // Batch update for performance
            const [updatedItem, newData] = await Promise.all([
              Item.findByIdAndUpdate(item._id, { status: 1 }),
              Data.create({
                value: snmpData?.value,
                timestamp: new Date(),
                metadata: {
                  host_id: host._id,
                  item_id: item._id,
                  item_name: item.name_item,
                  hostname: host.hostname,
                },
              }),
            ]);

            return newData;
          } catch (error) {
            // Atomic update for item status
            await Item.findByIdAndUpdate(item._id, { status: 0 });
            console.error(
              `Data collection failed for OID ${item.oid} on host ${host.hostname}`
            );
            return null;
          }
        });

        const hostItemResults = await Promise.all(itemProcessPromises);
        return hostItemResults.filter(Boolean);
      } catch (hostError) {
        console.error(`Error processing host ${host.hostname}:`, hostError);
        return [];
      }
    });

    const allResults = await Promise.all(hostProcessPromises);
    return allResults.flat();
  } catch (globalError) {
    console.error("Global error in SNMP data fetching:", globalError);
    return [];
  }
}
