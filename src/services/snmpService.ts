import Host from "../models/Host";
import Data from "../models/Data";
import snmp from "net-snmp";

export async function fetchAndStoreSnmpDataForItem(item: any) {
  try {
    // Find the host associated with this item
    const host = await Host.findById(item.host_id);
    if (!host) {
      throw new Error(`Host not found for item ${item._id}`);
    }

    const SNMP_VERSIONS: Record<string, any> = {
      v1: snmp.Version1,
      v2: snmp.Version2c,
      v2c: snmp.Version2c,
      v3: snmp.Version3,
    };

    const snmpVersion =
      SNMP_VERSIONS[(host.snmp_version as string).toLowerCase()] ||
      snmp.Version2c;

    // Create SNMP session
    const session = snmp.createSession(host.ip_address, host.community, {
      port: host.snmp_port,
      version: snmpVersion,
    });

    // Fetch SNMP data
    const oids = [item.oid];
    const result = await new Promise<any>((resolve, reject) => {
      session.get(oids, (error: any, varbinds: any) => {
        if (error) {
          reject(error);
        } else {
          resolve(varbinds[0]);
        }
      });
    });

    // Close the SNMP session
    session.close();

    // Process the result
    if (snmp.isVarbindError(result)) {
      console.error(
        `Error fetching OID ${item.oid}: ${snmp.varbindError(result)}`
      );
      return;
    }

    // Create a new Data document
    const newData = new Data({
      metadata: {
        item_id: item._id,
        host_id: host._id,
      },
      timestamp: new Date(),
      value: result.value.toString(),
    });

    // Save the data to the database
    await newData.save();

    console.log(
      `Data saved for item ${item.name_item} of host ${host.hostname}`
    );
  } catch (error) {
    console.error(
      `Error in fetchAndStoreSnmpDataForItem for item ${item.name_item} of host ${item.host_id}:`,
      error
    );
  }
}
