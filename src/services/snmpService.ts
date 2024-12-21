import Host from "../models/Host";
import Data from "../models/Data";
import Item from "../models/Item";
import snmp from "net-snmp";

interface InterfaceItem {
  name_item: string;
  oid: string;
  unit: string;
  type: string;
  interval: number;
}
export async function fetchAndStoreSnmpDataForItem(item: any) {
  try {
    // Find the host associated with this item
    const host = await Host.findById(item.host_id);
    if (!host) {
      throw new Error(`Host not found for item ${item._id}`);
    }
    // Create SNMP session
    const session = snmp.createSession(host.ip_address, host.snmp_community, {
      port: host.snmp_port,
      version: getSnmpVersion(host.snmp_version as string),
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

    // Get the current value
    const currentValue = parseFloat(result.value.toString());
    const currentTimestamp = new Date();

    // Find the latest data for this item
    const latestData = await Data.findOne({
      "metadata.item_id": item._id,
      "metadata.host_id": host._id,
    }).sort({ timestamp: -1 });

    let simpleChange = currentValue;
    let changePerSecond = 0;

    if (latestData) {
      const previousValue = parseFloat(latestData.value as string);
      const previousTimestamp = new Date(latestData.timestamp as Date);

      simpleChange = currentValue - previousValue;

      const timeDifferenceInSeconds =
        (currentTimestamp.getTime() - previousTimestamp.getTime()) / 1000;
      changePerSecond = simpleChange / timeDifferenceInSeconds;
    }

    // Create a new Data document
    const newData = new Data({
      metadata: {
        item_id: item._id,
        host_id: host._id,
      },
      timestamp: currentTimestamp,
      value: currentValue.toString(),
      Simple_change: simpleChange.toString(),
      Change_per_second: changePerSecond.toString(),
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

export async function fetchDetailHost(host: any) {
  // Define a constant object for system details OIDs
  const SYSTEM_DETAIL_OIDS = {
    Descr: "1.3.6.1.2.1.1.1.0",
    UpTime: "1.3.6.1.2.1.1.3.0",
    Contact: "1.3.6.1.2.1.1.4.0",
    Name: "1.3.6.1.2.1.1.5.0",
    Location: "1.3.6.1.2.1.1.6.0",
  } as const;

  // Create a type for the keys of SYSTEM_DETAIL_OIDS
  type SystemDetailKey = keyof typeof SYSTEM_DETAIL_OIDS;
  try {
    // Create SNMP session
    const session = snmp.createSession(host.ip_address, host.community, {
      port: host.snmp_port,
      version: getSnmpVersion(host.snmp_version),
    });

    const oids = Object.values(SYSTEM_DETAIL_OIDS);
    const result = await new Promise<any[]>((resolve, reject) => {
      session.get(oids, (error: any, varbinds: any[]) => {
        if (error) {
          reject(error);
        } else {
          resolve(varbinds);
        }
      });
    });

    session.close();

    const details: Record<string, string> = {};
    result.forEach((varbind, index) => {
      if (!snmp.isVarbindError(varbind)) {
        const key = Object.keys(SYSTEM_DETAIL_OIDS)[index] as SystemDetailKey;
        details[key] = varbind.value.toString();
      }
    });

    // Update the host document with the new details
    await Host.findByIdAndUpdate(host._id, {
      $set: { details: details, status: 1 },
    });

    console.log(`Details updated for host ${host.hostname}`);
  } catch (error) {
    console.error(`Error in fetchDetailHost for host ${host.hostname}:`, error);
  }
}

export async function fetchInterfaceHost(
  ip_address: string,
  community: string,
  port: number,
  version: string
): Promise<InterfaceItem[]> {
  const session = snmp.createSession(ip_address, community, {
    port,
    version: getSnmpVersion(version),
  });
  const oid = "1.3.6.1.2.1.2.2";
  const columns = [1, 2, 3, 4, 5, 7, 8];

  const INTERFACE_METRICS = [
    { suffix: "InOctets", oid: "10", type: "Counter64", unit: "Octets" },
    { suffix: "InUcastPkts", oid: "11", type: "Counter64", unit: "Packets" },
    { suffix: "InDiscards", oid: "13", type: "Counter64", unit: "Packets" },
    { suffix: "InErrors", oid: "14", type: "Counter64", unit: "Packets" },
    { suffix: "OutOctets", oid: "16", type: "Counter64", unit: "Octets" },
    { suffix: "OutUcastPkts", oid: "17", type: "Counter64", unit: "Packets" },
    { suffix: "OutDiscards", oid: "19", type: "Counter64", unit: "Packets" },
    { suffix: "OutErrors", oid: "20", type: "Counter64", unit: "Packets" },
  ];

  try {
    const table: snmp.TableEntry[] = await new Promise((resolve, reject) => {
      session.tableColumns(oid, columns, 20, (error: any, table: any) => {
        if (error) reject(error);
        else resolve(table);
      });
    });

    const activeInterfaces = Object.entries(table).filter(
      ([, row]) => row[8] === 1
    );

    const interfaceItems: InterfaceItem[] = [];

    for (const [index, row] of activeInterfaces) {
      const interfaceIndex = parseInt(index, 10);
      const interfaceName =
        row[2]
          .toString()
          .replace(/\0/g, "")
          .replace(/[^\x20-\x7E]/g, "")
          .trim() || `Interface ${interfaceIndex}`;

      for (const metric of INTERFACE_METRICS) {
        const currentOid = `1.3.6.1.2.1.2.2.1.${metric.oid}.${interfaceIndex}`;
        const value = await new Promise<number | null>((resolve, reject) => {
          session.get([currentOid], (error: any, varbinds: any) => {
            if (error) reject(error);
            else resolve(varbinds[0]?.value || null);
          });
        });

        if (value && value > 0) {
          interfaceItems.push({
            name_item: `${interfaceName} ${metric.suffix}`,
            oid: currentOid,
            type: metric.type,
            unit: metric.unit,
            interval: 10,
          });
        }
      }
    }

    return interfaceItems;
  } catch (error) {
    console.error("Error fetching interface details:", error);
    throw error;
  } finally {
    session.close();
  }
}

function getSnmpVersion(version: string): number {
  const SNMP_VERSIONS: { [key: string]: number } = {
    v1: snmp.Version1,
    v2: snmp.Version2c,
    v2c: snmp.Version2c,
    v3: snmp.Version3,
  };
  return SNMP_VERSIONS[version.toLowerCase()] || snmp.Version2c;
}
