import { checkCondition, sendNotificationDevice } from "./alertService";
import Host, { IauthenV3 } from "../models/Host";
import Data from "../models/Data";
import Item, { IItem } from "../models/Item";
import mongoose from "mongoose";
import snmp from "net-snmp";
import Event from "../models/Event";

interface InterfaceItem {
  item_name: string;
  oid: string;
  unit: string;
  type: string;
  interval: number;
}

const statusInterface: { [key: number]: string } = {
  1: "up",
  2: "down",
  3: "testing",
  4: "unknown",
  5: "dormant",
  6: "notPresent",
  7: "lowerLayerDown",
};

const MAX_COUNTER_VALUE = 4294967295;

export async function fetchAndStoreSnmpDataForItem(item: IItem) {
  if (!item.isBandwidth && !item.isOverview) {
    try {
      // Find the host associated with this item
      const host = await Host.findById(item.host_id);

      if (!host) {
        return;
      }

      if (host.status === 1) {
        // Create SNMP session
        const session = await createSessionSNMP(
          host.ip_address,
          host.snmp_community,
          host.snmp_port,
          host.snmp_version,
          host.authenV3
        );

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

        if (!result) {
          return;
        }

        // Process the result
        if (snmp.isVarbindError(result)) {
          session.close();
          return;
        }

        // Get the current value
        const currentValue: number[] = [];
        currentValue.push(
          parseFloat(result.value.toString() ? result.value : 0)
        );
        const currentTimestamp = new Date();

        let value: number = 0;
        let deltaValue = 0;
        let changePerSecond: number = 0;

        if (item.type.toLocaleLowerCase() === "counter") {
          // Find the latest data for this item
          const latestData = await Data.findOne({
            "metadata.item_id": item._id,
            "metadata.host_id": host._id,
          }).sort({ timestamp: -1 });

          if (latestData) {
            const previousValue: number[] = latestData.current_value;
            const previousTimestamp = new Date(latestData.timestamp as Date);

            if (currentValue[0] < previousValue[0]) {
              deltaValue =
                MAX_COUNTER_VALUE - previousValue[0] + currentValue[0];
            } else {
              deltaValue = currentValue[0] - previousValue[0];
            }

            const timeDifferenceInSeconds =
              (currentTimestamp.getTime() - previousTimestamp.getTime()) / 1000;

            changePerSecond = deltaValue / timeDifferenceInSeconds;

            value = changePerSecond;

            if (
              item.oid.includes("1.3.6.1.2.1.2.2.1.10") ||
              item.oid.includes("1.3.6.1.2.1.2.2.1.16")
            ) {
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
                return;
              }

              const up = deltaValue * 8 * 100;
              const down =
                timeDifferenceInSeconds * parseInt(ifspeed.interface_speed);
              const bandwidthUtilization = up / down;

              let itembandwidth: IItem | null = await Item.findOne({
                host_id: host._id,
                oid: item.oid,
                isBandwidth: true,
              });

              let newItemBandwidth: IItem;

              if (!itembandwidth) {
                const isIncoming = item.oid.includes("1.3.6.1.2.1.2.2.1.10");
                const direction = isIncoming ? "Incoming" : "Outgoing";
                const oidSuffix = isIncoming ? "10" : "16";

                newItemBandwidth = new Item({
                  host_id: host._id,
                  item_name: `${ifspeed.interface_name} ${direction} Bandwidth Utilization`,
                  oid: `1.3.6.1.2.1.2.2.1.${oidSuffix}.${ifspeed.interface_index}`,
                  type: "integer",
                  unit: "%",
                  isBandwidth: true,
                });

                await newItemBandwidth.save();

                await Host.findByIdAndUpdate(host._id, {
                  $push: { items: newItemBandwidth._id },
                });

                itembandwidth = newItemBandwidth;
              }

              if (itembandwidth) {
                const bandwidthData = new Data({
                  metadata: {
                    item_id: itembandwidth._id,
                    host_id: host._id,
                    isBandwidth: itembandwidth.isBandwidth,
                  },
                  timestamp: currentTimestamp,
                  value: bandwidthUtilization.toFixed(2),
                  current_value: [bandwidthUtilization.toFixed(2)],
                });
                await bandwidthData.save();
                // console.log(
                //   `[${new Date().toLocaleString()}] Store Data ${
                //     bandwidthData.metadata.item_id
                //   } : ${bandwidthData.value}`
                // );
                await checkCondition(
                  host._id as mongoose.Types.ObjectId,
                  itembandwidth,
                  bandwidthUtilization
                );
              }
            }
          }
          // Close the SNMP session
        } else if (
          item.type.toLocaleLowerCase() === "integer" &&
          !item.isBandwidth
        ) {
          value = currentValue[0];
        }

        // Create a new Data document
        const newData = new Data({
          metadata: {
            item_id: item._id,
            host_id: host._id,
            isBandwidth: item.isBandwidth,
          },
          timestamp: currentTimestamp,
          value: value,
          current_value: currentValue as Number[],
        });

        // Save the data to the database
        await newData.save();

        session.close();

        await checkCondition(host._id as mongoose.Types.ObjectId, item, value);
      }
    } catch (error) {
      console.log(
        `[${new Date().toLocaleString()}] fetchAndStoreSnmpDataForItem ${
          item.item_name
        } : ${error}`
      );
    }
  }
}

export async function fetchAndStoreTotalTraffic(item: IItem) {
  try {
    const host = await Host.findById(item.host_id);

    if (!host) {
      return;
    }

    if (host.status === 1) {
      const session = await createSessionSNMP(
        host.ip_address,
        host.snmp_community,
        host.snmp_port,
        host.snmp_version,
        host.authenV3
      );

      const oid = "1.3.6.1.2.1.2.2";
      const columns = [1, 7];

      const table: snmp.TableEntry[] = await new Promise((resolve, reject) => {
        session.tableColumns(oid, columns, 1000, (error: any, table: any) => {
          if (error) reject(error);
          else resolve(table);
        });
      });

      const activeInterfaces = Object.entries(table).filter(
        ([, row]) => row[7] === 1
      );

      const oids: string[] = [];

      for (const [index, row] of activeInterfaces) {
        const interfaceIndex = parseInt(index, 10);

        oids.push(`${item.oid}.${interfaceIndex}`);
      }

      const result = await new Promise<any>((resolve, reject) => {
        session.get(oids, (error: any, varbinds: any) => {
          if (error) {
            reject(error);
          } else {
            resolve(varbinds);
          }
        });
      });

      if (snmp.isVarbindError(result)) {
        console.log(
          `[${new Date().toLocaleString()}] fetchAndStoreTotalTraffic ${
            item.item_name
          } : ${result}`
        );
        return;
      }

      const current_Value: number[] = [];

      result.reduce((total: number[], varbind: any) => {
        if (!snmp.isVarbindError(varbind)) {
          current_Value.push(parseFloat(varbind.value.toString()));
        }
        return total;
      });

      const currentTimestamp = new Date();

      let value: number = 0;
      let changePerSecond: number = 0;

      const latestData = await Data.findOne({
        "metadata.item_id": item._id,
        "metadata.host_id": host._id,
      }).sort({ timestamp: -1 });

      if (latestData && latestData.current_value.length > 0) {
        const deltaAll = [];

        const previousValue: number[] = latestData.current_value;
        const previousTimestamp = new Date(latestData.timestamp as Date);

        for (let i = 0; i < current_Value.length; i++) {
          const previous =
            previousValue[i] === undefined ? 0 : previousValue[i];
          const current = current_Value[i];
          if (current < previous) {
            deltaAll.push(MAX_COUNTER_VALUE - previous + current);
          } else {
            deltaAll.push(current - previous);
          }
        }

        const sumDelta = deltaAll.reduce((sum: number, delta: number) => {
          return sum + delta;
        }, 0);

        const timeDifferenceInSeconds =
          (currentTimestamp.getTime() - previousTimestamp.getTime()) / 1000;

        changePerSecond = (sumDelta * 8) / timeDifferenceInSeconds;

        value = changePerSecond;
      }

      const newData = new Data({
        metadata: {
          item_id: item._id,
          host_id: host._id,
          isBandwidth: item.isBandwidth,
        },
        timestamp: currentTimestamp,
        value: value,
        current_value: current_Value,
      });

      await newData.save();

      session.close();

      await checkCondition(host._id as mongoose.Types.ObjectId, item, value);
    }
  } catch (error) {
    console.log(
      `[${new Date().toLocaleString()}] fetchAndStoreTotalTraffic ${
        item.item_name
      } : ${error}`
    );
  }
}

export async function checkInterfaceStatus(host_id: string): Promise<void> {
  try {
    const host = await Host.findById(host_id);

    if (!host) {
      return;
    }

    const interfaces = host.interfaces;

    if (host.status === 1) {
      const session = await createSessionSNMP(
        host.ip_address,
        host.snmp_community,
        host.snmp_port,
        host.snmp_version,
        host.authenV3
      );

      await Promise.all(
        interfaces.map(async (iface) => {
          const oid_admin = `1.3.6.1.2.1.2.2.1.7.${iface.interface_index}`;
          const oid_oper = `1.3.6.1.2.1.2.2.1.8.${iface.interface_index}`;
          const old_admin = iface.interface_Adminstatus;
          const old_oper = iface.interface_Operstatus;

          return new Promise<void>((resolve) => {
            session.get(
              [oid_admin, oid_oper],
              async (error: any, varbinds: any) => {
                if (error || snmp.isVarbindError(varbinds[0])) {
                  resolve();
                } else {
                  iface.interface_Adminstatus =
                    statusInterface[varbinds[0].value];
                  iface.interface_Operstatus =
                    statusInterface[varbinds[1].value];
                  const new_admin = iface.interface_Adminstatus;
                  const new_oper = iface.interface_Operstatus;

                  if (!String(old_admin).includes(String(new_admin))) {
                    const message = `Interface ${iface.interface_name} Admin Status changed from ${old_admin} --> ${new_admin}`;
                    await Event.create({
                      type: "host",
                      severity: "warning",
                      hostname: host.hostname,
                      status: "EVENT",
                      message,
                    });

                    await sendNotificationDevice(
                      `[${host.hostname}] Interface ${iface.interface_name} Administator status changed.`,
                      message
                    );
                  } else if (!String(old_oper).includes(String(new_oper))) {
                    const message = `[${host.hostname}] Interface ${iface.interface_name} Operational Status changed from ${old_admin} --> ${new_admin}`;
                    await Event.create({
                      type: "host",
                      severity: "warning",
                      hostname: host.hostname,
                      status: "EVENT",
                      message,
                    });

                    await sendNotificationDevice(
                      `Interface ${iface.interface_name} status changed.`,
                      message
                    );
                  }
                  resolve();
                }
              }
            );
          });
        })
      );

      host.interfaces = interfaces;
      await host.save();

      session.close();
    }
  } catch (error) {
    console.log("checkInterfaceStatus : ", error);
  }
}

export async function checkSnmpConnection(host_id: string) {
  try {
    // Find the host by ID
    const host = await Host.findById(host_id);

    if (!host) {
      return;
    }

    // Create SNMP session
    const session = await createSessionSNMP(
      host.ip_address,
      host.snmp_community,
      host.snmp_port,
      host.snmp_version,
      host.authenV3
    );

    // Try to fetch a simple OID (system description) to test the connection
    const oid = "1.3.6.1.2.1.1.3.0"; // System Description OID

    const data = session.get([oid], async (error: any, varbinds: any) => {
      if (error || snmp.isVarbindError(varbinds[0])) {
        await Host.findByIdAndUpdate(host_id, {
          status: 0,
        });

        const message = `${host.hostname} [${host.ip_address}] is down. Please check your SNMP configuration or device status.`;

        const eventold = await Event.findOne({
          type: "host",
          severity: "critical",
          hostname: host.hostname,
          status: "PROBLEM",
        });

        await Event.findOneAndUpdate(
          {
            type: "host",
            severity: "critical",
            hostname: host.hostname,
            status: "PROBLEM",
          },
          {
            type: "host",
            severity: "critical",
            hostname: host.hostname,
            status: "PROBLEM",
            message,
          },
          {
            upsert: true,
            new: true,
          }
        );

        if (!eventold) {
          await sendNotificationDevice(
            `${host.hostname} [${host.ip_address}] Status`,
            message
          );
        }
      } else {
        const message = `${host.hostname} [${host.ip_address}] is up.`;
        const updatedDetails = {
          ...host.details,
          UpTime: `${Math.floor(
            varbinds[0].value / 100 / 3600
          )} hours ${Math.floor(
            ((varbinds[0].value / 100) % 3600) / 60
          )} minutes`,
        };
        await Host.findByIdAndUpdate(host_id, {
          details: updatedDetails,
          status: 1,
        });

        const event = await Event.findOneAndUpdate(
          {
            type: "host",
            severity: "critical",
            hostname: host.hostname,
            status: "PROBLEM",
          },
          {
            status: "RESOLVED",
            resolvedAt: new Date(),
          }
        );

        if (event) {
          await sendNotificationDevice(
            `${host.hostname} [${host.ip_address}] Status`,
            message
          );
        }
      }
      session.close();
    });
  } catch (error) {
    console.log("checkSnmpConnection : ", error);
  }
}

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

export async function fetchDetailHost(
  ip_address: string,
  snmp_community: string,
  snmp_port: string,
  snmp_version: string,
  authenV3: {
    username: string;
    securityLevel: string;
    authenProtocol: string;
    authenPass: string;
    privacyProtocol: string;
    privacyPass: string;
  }
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

  // Create a type for the keys of SYSTEM_DETAIL_OIDS
  type SystemDetailKey = keyof typeof SYSTEM_DETAIL_OIDS;
  try {
    // Create SNMP session
    const session = await createSessionSNMP(
      ip_address,
      snmp_community,
      snmp_port,
      snmp_version,
      authenV3
    );

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
      interface_Adminstatus: statusInterface[row[7]],
      interface_Operstatus: statusInterface[row[8]],
    }));

    session.close();

    const details: Record<string, string> = {};
    result.forEach((varbind, index) => {
      if (!snmp.isVarbindError(varbind)) {
        const key = Object.keys(SYSTEM_DETAIL_OIDS)[index] as SystemDetailKey;
        if (key === "UpTime") {
          details[key] = `${Math.floor(
            varbind.value / 100 / 3600
          )} hours ${Math.floor(((varbind.value / 100) % 3600) / 60)} minutes`;
        } else {
          details[key] = varbind.value.toString();
        }
      }
    });

    return { interfaces, details, status: 1 };
  } catch (error) {
    return { interfaces: [], details: {}, status: 0 };
  }
}

export async function fetchInterfaceHost(
  ip_address: string,
  community: string,
  port: string,
  version: string,
  authenV3: {
    username: string;
    securityLevel: string;
    authenProtocol: string;
    authenPass: string;
    privacyProtocol: string;
    privacyPass: string;
  }
): Promise<InterfaceItem[]> {
  const session = await createSessionSNMP(
    ip_address,
    community,
    port,
    version,
    authenV3
  );
  const oid = "1.3.6.1.2.1.2.2";
  const columns = [1, 2, 3, 4, 5, 7, 8];

  const INTERFACE_METRICS = [
    { suffix: "InOctets", oid: "10", type: "counter", unit: "Octets" },
    { suffix: "InUcastPkts", oid: "11", type: "counter", unit: "Packets" },
    {
      suffix: " InNUcastPkts",
      oid: "12",
      type: "counter",
      unit: "Packets",
    },
    { suffix: "InDiscards", oid: "13", type: "counter", unit: "Packets" },
    { suffix: "InErrors", oid: "14", type: "counter", unit: "Packets" },
    {
      suffix: "InUnknownProtos",
      oid: "15",
      type: "counter",
      unit: "Packets",
    },
    { suffix: "OutOctets", oid: "16", type: "counter", unit: "Octets" },
    { suffix: "OutUcastPkts", oid: "17", type: "counter", unit: "Packets" },
    {
      suffix: "OutNUcastPkts",
      oid: "18",
      type: "counter",
      unit: "Packets",
    },
    { suffix: "OutDiscards", oid: "19", type: "counter", unit: "Packets" },
    { suffix: "OutErrors", oid: "20", type: "counter", unit: "Packets" },
  ];

  try {
    const table: snmp.TableEntry[] = await new Promise((resolve, reject) => {
      session.tableColumns(oid, columns, 100, (error: any, table: any) => {
        if (error) reject(error);
        else resolve(table);
      });
    });

    const activeInterfaces = Object.entries(table).filter(
      ([, row]) => row[7] === 1
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
    return interfaceItems;
  } catch (error) {
    console.error("Error fetching interface metrics:", error);
    return [];
  } finally {
    session.close();
  }
}

async function createSessionSNMP(
  ip_address: string,
  snmp_community: string,
  snmp_port: string,
  snmp_version: string,
  authenV3: IauthenV3
): Promise<snmp.Session> {
  const option = {
    port: snmp_port,
    version: getSnmpVersion(snmp_version as string),
    timeout: 5000, // 5 seconds timeout
    retries: 1,
  };

  let session: snmp.Session;

  if (snmp_version === "SNMPv3") {
    if (authenV3.securityLevel === "noAuthNoPriv") {
      session = snmp.createV3Session(
        ip_address,
        {
          name: authenV3.username,
        },
        option
      );
    } else if (authenV3.securityLevel === "authNoPriv") {
      session = snmp.createV3Session(
        ip_address,
        {
          name: authenV3.username,
          lavel: getSnmpSecurityLevel(authenV3.securityLevel),
          authProtocol: getSnmpAuthProtocol(authenV3.authenProtocol),
          authKey: authenV3.authenPass,
        },
        option
      );
    } else {
      session = snmp.createV3Session(
        ip_address,
        {
          name: authenV3.username,
          lavel: getSnmpSecurityLevel(authenV3.securityLevel),
          authProtocol: getSnmpAuthProtocol(authenV3.authenProtocol),
          authKey: authenV3.authenPass,
          privProtocol: getSnmpPrivacyProtocol(authenV3.privacyProtocol),
          privKey: authenV3.privacyPass,
        },
        option
      );
    }
  } else {
    session = snmp.createSession(ip_address, snmp_community, option);
  }

  return session;
}

function getSnmpVersion(version: string): number {
  const SNMP_VERSIONS: { [key: string]: number } = {
    SNMPv1: snmp.Version1,
    SNMPv2: snmp.Version2c,
    SNMPv3: snmp.Version3,
  };
  return SNMP_VERSIONS[version] || snmp.Version2c;
}

function getSnmpSecurityLevel(level: string): number {
  const SNMP_SecurityLevel: { [key: string]: number } = {
    noAuthNoPriv: snmp.SecurityLevel.noAuthNoPriv,
    authNoPriv: snmp.SecurityLevel.authNoPriv,
    authPriv: snmp.SecurityLevel.authPriv,
  };
  return SNMP_SecurityLevel[level] || snmp.AuthProtocolMD5;
}

function getSnmpAuthProtocol(protocol: string): number {
  const SNMP_AuthProtocol: { [key: string]: number } = {
    MD5: snmp.AuthProtocols.md5,
    SHA: snmp.AuthProtocols.sha,
  };
  return SNMP_AuthProtocol[protocol] || snmp.AuthProtocolMD5;
}

function getSnmpPrivacyProtocol(protocol: string): number {
  const SNMP_PrivacyProtocol: { [key: string]: number } = {
    DES: snmp.PrivProtocols.des,
    AES: snmp.PrivProtocols.aes,
  };
  return SNMP_PrivacyProtocol[protocol] || snmp.PrivProtocolDES;
}
