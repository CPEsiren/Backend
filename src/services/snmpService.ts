import { hasTrigger, sendNotification } from "./alertService";
import Action, { IAction } from "../models/Action";
import { addLog, createTime } from "./logService";
import Host, { IHost } from "../models/Host";
import Data from "../models/Data";
import Item, { IItem } from "../models/Item";
import Trigger from "../models/Trigger";
import Event from "../models/Event";
import Media from "../models/Media";
import mongoose from "mongoose";
import snmp from "net-snmp";

interface InterfaceItem {
  item_name: string;
  oid: string;
  unit: string;
  type: string;
  interval: number;
}
export async function fetchAndStoreSnmpDataForItem(item: IItem) {
  if (!item.isBandwidth) {
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
        await addLog(
          "ERROR",
          `Error fetching OID ${item.oid}: ${snmp.varbindError(result)}`,
          false
        );
        return;
      }

      // Get the current value
      const currentValue = parseFloat(result.value.toString());
      const currentTimestamp = new Date(await createTime());
      await addLog(
        "INFO",
        `[${item.item_name}] currentValue: ${currentValue}, currentTimestamp: ${currentTimestamp}`,
        false
      );

      // Find the latest data for this item
      const latestData = await Data.findOne({
        "metadata.item_id": item._id,
        "metadata.host_id": host._id,
      }).sort({ timestamp: -1 });

      let deltaValue = 0;
      let changePerSecond = 0;

      if (latestData) {
        const previousValue = parseFloat(latestData.value as string);
        const previousTimestamp = new Date(latestData.timestamp as Date);
        await addLog(
          "INFO",
          `[${item.item_name}] previousValue: ${previousValue}, previousTimestamp: ${previousTimestamp}`,
          false
        );

        deltaValue = currentValue - previousValue;

        const timeDifferenceInSeconds =
          (currentTimestamp.getTime() - previousTimestamp.getTime()) / 1000;
        changePerSecond = deltaValue / timeDifferenceInSeconds;
        await addLog(
          "INFO",
          `[${item.item_name}] deltaValue: ${deltaValue}, timeDifferenceInSeconds: ${timeDifferenceInSeconds}`,
          false
        );

        if (
          item.oid.includes("1.3.6.1.2.1.2.2.1.10") ||
          item.oid.includes("1.3.6.1.2.1.2.2.1.16")
        ) {
          await addLog(
            "INFO",
            `[${item.item_name}] calculate bandwidth......`,
            false
          );
          let index = 0;

          if (item.oid.includes("1.3.6.1.2.1.2.2.1.10")) {
            index = parseInt(item.oid.replace("1.3.6.1.2.1.2.2.1.10.", ""));
          } else {
            index = parseInt(item.oid.replace("1.3.6.1.2.1.2.2.1.16.", ""));
          }
          const ifspeed = host.interfaces.find(
            (iface) => iface.interface_index === index
          );

          if (!ifspeed) {
            await addLog(
              "ERROR",
              `[${item.item_name}] Interface with index ${index} not found`,
              false
            );
            return;
          }

          const up = deltaValue * 8 * 100;
          const down =
            timeDifferenceInSeconds * parseInt(ifspeed.interface_speed);
          const bandwidthUtilization = up / down;
          await addLog(
            "INFO",
            `[${item.item_name}] bandwidthUtilization: ${up}/${down} = ${bandwidthUtilization}`,
            false
          );
          const itembandwidth = await Item.findOne({
            host_id: host._id,
            oid: item.oid,
            isBandwidth: true,
          });

          if (itembandwidth) {
            const bandwidthData = new Data({
              metadata: {
                item_id: itembandwidth._id,
                host_id: host._id,
              },
              timestamp: currentTimestamp,
              value: bandwidthUtilization.toFixed(2).toString(),
              Change_per_second: bandwidthUtilization.toFixed(2).toString(),
              expireAfterSeconds: 10,
            });
            await bandwidthData.save();
            await checkAndHandleTriggers(
              itembandwidth,
              host,
              parseFloat(bandwidthData.Change_per_second)
            );

            await addLog(
              "INFO",
              `[${item.item_name}] Fetch Data for bandwidth.`,
              false
            );
          }
        }
      }

      // Create a new Data document
      const newData = new Data({
        timestamp: currentTimestamp,
        metadata: {
          item_id: item._id,
          host_id: host._id,
        },
        value: currentValue.toString(),
        Change_per_second: changePerSecond.toString(),
      });

      // Save the data to the database
      await newData.save();
      await addLog("INFO", `[${item.item_name}] Fetch Data.`, false);

      await checkAndHandleTriggers(item, host, changePerSecond);
    } catch (error) {
      await addLog(
        "ERROR",
        `Error in fetchAndStoreSnmpDataForItem for item ${item.item_name} of host ${item.host_id}: ${error}`,
        false
      );
      await checkSnmpConnection(item.host_id.toString());
    }
  }
}

export async function checkSnmpConnection(host_id: string): Promise<void> {
  try {
    // Find the host by ID
    const host = await Host.findById(host_id);
    if (!host) {
      await addLog(
        "WARNING",
        `[checkSnmpConnection] Host not found for ID: ${host_id}`,
        false
      );
      return;
    }

    // Create SNMP session
    const session = snmp.createSession(host.ip_address, host.snmp_community, {
      port: host.snmp_port,
      version: getSnmpVersion(host.snmp_version as string),
      timeout: 5000, // 5 seconds timeout
      retries: 1,
    });

    // Try to fetch a simple OID (system description) to test the connection
    const oid = "1.3.6.1.2.1.1.1.0"; // System Description OID

    await new Promise<void>((resolve) => {
      session.get([oid], async (error: any, varbinds: any) => {
        session.close();

        if (error || snmp.isVarbindError(varbinds[0])) {
          host.status = 0;
        } else {
          host.status = 1;
        }

        await host.save();
        resolve();
      });
    });
  } catch (error) {
    await addLog(
      "ERROR",
      `[checkSnmpConnection] Error checking SNMP connection for host ${host_id}: ${error}`,
      false
    );
    // Update the host with error status
    await Host.findByIdAndUpdate(host_id, {
      status: 0,
    });
  }
}

export async function fetchDetailHost(
  ip_address: string,
  snmp_community: string,
  snmp_port: string,
  snmp_version: string
): Promise<{
  interfaces: any[];
  details: Record<string, string>;
  status: number;
} | null> {
  // Define a constant object for system details OIDs
  const SYSTEM_DETAIL_OIDS = {
    Model: "1.3.6.1.2.1.1.1.0",
    UpTime: "1.3.6.1.2.1.1.3.0",
    Contact: "1.3.6.1.2.1.1.4.0",
    Location: "1.3.6.1.2.1.1.6.0",
  } as const;

  const oid = "1.3.6.1.2.1.2.2";
  const columns = [1, 2, 3, 4, 5, 7, 8];

  const IANAifType: { [key: number]: string } = {
    1: "other",
    2: "regular1822",
    3: "hdh1822",
    4: "ddnX25",
    5: "rfc877x25",
    6: "ethernetCsmacd",
    7: "iso88023Csmacd",
    8: "iso88024TokenBus",
    9: "iso88025TokenRing",
    10: "iso88026Man",
    11: "starLan",
    12: "proteon10Mbit",
    13: "proteon80Mbit",
    14: "hyperchannel",
    15: "fddi",
    16: "lapb",
    17: "sdlc",
    18: "ds1",
    19: "e1",
    20: "basicISDN",
    21: "primaryISDN",
    22: "propPointToPointSerial",
    23: "ppp",
    24: "softwareLoopback",
    25: "eon",
    26: "ethernet3Mbit",
    27: "nsip",
    28: "slip",
    29: "ultra",
    30: "ds3",
    31: "sip",
    32: "frameRelay",
    33: "rs232",
    34: "para",
    35: "arcnet",
    36: "arcnetPlus",
    37: "atm",
    38: "miox25",
    39: "sonet",
    40: "x25ple",
    41: "iso88022llc",
    42: "localTalk",
    43: "smdsDxi",
    44: "frameRelayService",
    45: "v35",
    46: "hssi",
    47: "hippi",
    48: "modem",
    49: "aal5",
    50: "sonetPath",
    51: "sonetVT",
    52: "smdsIcip",
    53: "propVirtual",
    54: "propMultiplexor",
    55: "ieee80212",
    56: "fiberChannel",
    57: "hippiInterface",
    58: "frameRelayInterconnect",
    59: "aflane8023",
    60: "aflane8025",
    61: "cctEmul",
    62: "fastEther",
    63: "isdn",
    64: "v11",
    65: "v36",
    66: "g703at64k",
    67: "g703at2mb",
    68: "qllc",
    69: "fastEtherFX",
    70: "channel",
    71: "ieee80211",
    72: "ibm370parChan",
    73: "escon",
    74: "dlsw",
    75: "isdns",
    76: "isdnu",
    77: "lapd",
    78: "ipSwitch",
    79: "rsrb",
    80: "atmLogical",
    81: "ds0",
    82: "ds0Bundle",
    83: "bsc",
    84: "async",
    85: "cnr",
    86: "iso88025Dtr",
    87: "eplrs",
    88: "arap",
    89: "propCnls",
    90: "hostPad",
    91: "termPad",
    92: "frameRelayMPI",
    93: "x213",
    94: "adsl",
    95: "radsl",
    96: "sdsl",
    97: "vdsl",
    98: "iso88025CRFPInt",
    99: "myrinet",
    100: "voiceEM",
    101: "voiceFXO",
    102: "voiceFXS",
    103: "voiceEncap",
    104: "voiceOverIp",
    105: "atmDxi",
    106: "atmFuni",
    107: "atmIma",
    108: "pppMultilinkBundle",
    109: "ipOverCdlc",
    110: "ipOverClaw",
    111: "stackToStack",
    112: "virtualIpAddress",
    113: "mpc",
    114: "ipOverAtm",
    115: "iso88025Fiber",
    116: "tdlc",
    117: "gigabitEthernet",
    118: "hdlc",
    119: "lapf",
    120: "v37",
    121: "x25mlp",
    122: "x25huntGroup",
    123: "transpHdlc",
    124: "interleave",
    125: "fast",
    126: "ip",
    127: "docsCableMaclayer",
    128: "docsCableDownstream",
    129: "docsCableUpstream",
    130: "a12MppSwitch",
    131: "tunnel",
    132: "coffee",
    133: "ces",
    134: "atmSubInterface",
    135: "l2vlan",
    136: "l3ipvlan",
    137: "l3ipxvlan",
    138: "digitalPowerline",
    139: "mediaMailOverIp",
    140: "dtm",
    141: "dcn",
    142: "ipForward",
    143: "msdsl",
    144: "ieee1394",
    145: "if-gsn",
    146: "dvbRccMacLayer",
    147: "dvbRccDownstream",
    148: "dvbRccUpstream",
    149: "atmVirtual",
    150: "mplsTunnel",
    151: "srp",
    152: "voiceOverAtm",
    153: "voiceOverFrameRelay",
    154: "idsl",
    155: "compositeLink",
    156: "ss7SigLink",
    157: "propWirelessP2P",
    158: "frForward",
    159: "rfc1483",
    160: "usb",
    161: "ieee8023adLag",
    162: "bgppolicyaccounting",
    163: "frf16MfrBundle",
    164: "h323Gatekeeper",
    165: "h323Proxy",
    166: "mpls",
    167: "mfSigLink",
    168: "hdsl2",
    169: "shdsl",
    170: "ds1FDL",
    171: "pos",
    172: "dvbAsiIn",
    173: "dvbAsiOut",
    174: "plc",
    175: "nfas",
    176: "tr008",
    177: "gr303RDT",
    178: "gr303IDT",
    179: "isup",
    180: "propDocsWirelessMaclayer",
    181: "propDocsWirelessDownstream",
    182: "propDocsWirelessUpstream",
    183: "hiperlan2",
    184: "propBWAp2Mp",
    185: "sonetOverheadChannel",
    186: "digitalWrapperOverheadChannel",
    187: "aal2",
    188: "radioMAC",
    189: "atmRadio",
    190: "imt",
    191: "mvl",
    192: "reachDSL",
    193: "frDlciEndPt",
    194: "atmVciEndPt",
    195: "opticalChannel",
    196: "opticalTransport",
    197: "propAtm",
    198: "voiceOverCable",
    199: "infiniband",
    200: "teLink",
    201: "q2931",
    202: "virtualTg",
    203: "sipTg",
    204: "sipSig",
    205: "docsCableUpstreamChannel",
    206: "econet",
    207: "pon155",
    208: "pon622",
    209: "bridge",
    210: "linegroup",
    211: "voiceEMFGD",
    212: "voiceFGDEANA",
    213: "voiceDID",
    214: "mpegTransport",
    215: "sixToFour",
    216: "gtp",
    217: "pdnEtherLoop1",
    218: "pdnEtherLoop2",
    219: "opticalChannelGroup",
    220: "homepna",
    221: "gfp",
    222: "ciscoISLvlan",
    223: "actelisMetaLOOP",
    224: "fcipLink",
    225: "rpr",
    226: "qam",
    227: "lmp",
    228: "cblVectaStar",
    229: "docsCableDownstream",
    230: "adsl2",
    231: "macSecControlledIF",
    232: "macSecUncontrolledIF",
    233: "aviciOpticalEther",
    234: "atmbond",
    235: "voiceFGDOS",
    236: "mocaVersion1",
    237: "ieee80216WMAN",
    238: "ads12plus",
    239: "dvbRcsMacLayer",
    240: "dvbTdm",
    241: "dvbRcsTdma",
    242: "x86Laps",
    243: "wwanPP",
    244: "wwanPP2",
    245: "voiceEBS",
    246: "ifPwType",
    247: "ilan",
    248: "pip",
    249: "aluELP",
    250: "gpon",
    251: "vds12",
    252: "capwapDot11Profile",
    253: "capwapDot11Bss",
    254: "capwapWtpVirtualRadio",
    255: "bits",
    256: "docsCableUpstreamRfPort",
    257: "cableDownstreamRfPort",
    258: "vmwareVirtualNic",
    259: "ieee802154",
    260: "otnOdu",
    261: "otnOtu",
    262: "ifVfiType",
    263: "g9981",
    264: "g9982",
    265: "g9983",
    266: "aluEpon",
    267: "aluEponOnu",
    268: "aluEponPhysicalUni",
    269: "aluEponLogicalLink",
    270: "aluGponOnu",
    271: "aluGponPhysicalUni",
  };

  // Create a type for the keys of SYSTEM_DETAIL_OIDS
  type SystemDetailKey = keyof typeof SYSTEM_DETAIL_OIDS;
  try {
    // Create SNMP session
    const session = snmp.createSession(ip_address, snmp_community, {
      port: snmp_port,
      version: getSnmpVersion(snmp_version),
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

    const table: snmp.TableEntry[] = await new Promise((resolve, reject) => {
      session.tableColumns(oid, columns, 20, (error: any, table: any) => {
        if (error) reject(error);
        else resolve(table);
      });
    });

    const interfaces = Object.entries(table).map(([index, row]) => ({
      interface_index: row[1] as number,
      interface_name:
        row[2].toString().replace(/\0/g, "").trim() || `Interface ${index}`,
      interface_type: IANAifType[row[3].toString()],
      interface_speed: row[5].toString(),
      interface_Adminstatus: row[7] === 1 ? "up" : "down",
      interface_Operstatus: row[8] === 1 ? "up" : "down",
    }));

    session.close();

    const details: Record<string, string> = {};
    result.forEach((varbind, index) => {
      if (!snmp.isVarbindError(varbind)) {
        const key = Object.keys(SYSTEM_DETAIL_OIDS)[index] as SystemDetailKey;
        details[key] = varbind.value.toString();
      }
    });
    await addLog(
      "INFO",
      `Fetching system details for ${ip_address} with community ${snmp_community}`,
      false
    );
    return { interfaces, details, status: 1 };
  } catch (error) {
    await addLog(
      "ERROR",
      `Error in fetchDetailHost for host ${ip_address}: ${error}`,
      false
    );
    return { interfaces: [], details: {}, status: 0 };
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
    {
      suffix: " InNUcastPkts",
      oid: "12",
      type: "Counter64",
      unit: "Packets",
    },
    { suffix: "InDiscards", oid: "13", type: "Counter64", unit: "Packets" },
    { suffix: "InErrors", oid: "14", type: "Counter64", unit: "Packets" },
    {
      suffix: "InUnknownProtos",
      oid: "15",
      type: "Counter64",
      unit: "Packets",
    },
    { suffix: "OutOctets", oid: "16", type: "Counter64", unit: "Octets" },
    { suffix: "OutUcastPkts", oid: "17", type: "Counter64", unit: "Packets" },
    {
      suffix: "OutNUcastPkts",
      oid: "18",
      type: "Counter64",
      unit: "Packets",
    },
    { suffix: "OutDiscards", oid: "19", type: "Counter64", unit: "Packets" },
    { suffix: "OutErrors", oid: "20", type: "Counter64", unit: "Packets" },
  ];

  try {
    const table: snmp.TableEntry[] = await new Promise((resolve, reject) => {
      session.tableColumns(oid, columns, 100, (error: any, table: any) => {
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

        if (value) {
          interfaceItems.push({
            item_name: `${interfaceName} ${metric.suffix}`,
            oid: currentOid,
            type: metric.type,
            unit: metric.unit,
            interval: 60,
          });
        }
      }
    }
    await addLog("INFO", `Fetching interface details for ${ip_address}`, false);
    return interfaceItems;
  } catch (error) {
    await addLog(
      "ERROR",
      `Error in fetchInterfaceHost for host ${ip_address}: ${error}`,
      false
    );
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

async function checkAndHandleTriggers(
  item: IItem,
  host: IHost,
  changePerSecond: number
) {
  // Check if there is a trigger for this item
  const triggers = await hasTrigger(
    changePerSecond,
    host._id as mongoose.Types.ObjectId,
    item._id as mongoose.Types.ObjectId
  );

  if (triggers.triggered) {
    await handleTriggeredEvent(triggers, item, host, changePerSecond);
  } else if (!triggers.triggered && triggers.triggeredIds.length > 0) {
    await resolveExistingProblems(triggers.triggeredIds);
  }
}

async function handleTriggeredEvent(
  triggers: any,
  item: IItem,
  host: IHost,
  changePerSecond: number
) {
  const trigger = await Trigger.findById(triggers.triggeredIds[0]);
  const lastEvent = await Event.findOne({
    trigger_id: triggers.triggeredIds[0],
    status: "PROBLEM",
  });

  if (!lastEvent) {
    const message = ` ${triggers.highestSeverity?.toLocaleUpperCase()} with item ${
      item.item_name
    } of host ${host.hostname}. ${changePerSecond} ${item.unit}/s. ${
      trigger?.ComparisonOperator
    } ${trigger?.valuetrigger} ${item.unit}/s.`;
    const newEvent = new Event({
      trigger_id: triggers.triggeredIds[0],
      status: "PROBLEM",
      message: message,
    });
    await newEvent.save();
    await addLog("INFO", `Event created: ${newEvent.message}`, false);

    // Send notifications for the new event
    await sendNotifications(message, "Problem: ");
  }
}

async function resolveExistingProblems(
  triggeredIds: mongoose.Types.ObjectId[]
) {
  const resolvePromises = triggeredIds.map(async (triggerId) => {
    const activeEvent = await Event.findOneAndUpdate(
      { trigger_id: triggerId, status: "PROBLEM" },
      { status: "RESOLVED" },
      { new: true }
    );

    if (activeEvent) {
      await addLog("INFO", `Event resolved: ${activeEvent.message}`, false);
      await sendNotifications(activeEvent.message, "Resolved: ");
    }
  });

  await Promise.all(resolvePromises);
}

async function sendNotifications(message: string, prefix: string) {
  const actions = await Action.find({ enabled: true });
  const notificationPromises = actions.map(async (action) => {
    const media = await Media.findById(action.media_id);
    if (media) {
      await sendNotification(media, action.messageTemplate, prefix + message);
    } else {
      await addLog(
        "WARNING",
        `Media not found for action ${action._id}`,
        false
      );
    }
  });
}
