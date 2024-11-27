import * as snmp from "net-snmp";

interface SnmpData {
  oid: string;
  value: string;
}

export const getSnmpData = (oid: string, session: any): Promise<SnmpData[]> => {
  return new Promise((resolve, reject) => {
    const snmpData: SnmpData[] = [];

    session.get([oid], (error: Error | null, varbinds: any[]) => {
      if (error) {
        // console.error(`Error fetching OID ${oid}:`, error.toString());
        session.close();
        reject(`Error fetching OID ${oid}: ${error.toString()}`);
      } else {
        for (const varbind of varbinds) {
          if (snmp.isVarbindError(varbind)) {
            const varbindError = snmp.varbindError(varbind);
            // console.error(`SNMP Varbind Error for OID ${oid}:`, varbindError);
            session.close();
            reject(`SNMP Varbind Error for OID ${oid}: ${varbindError}`);
            return;
          } else {
            snmpData.push({
              oid: varbind.oid,
              value: varbind.value.toString(),
            });
          }
        }

        if (snmpData.length === 0) {
          console.warn(`No data returned for OID ${oid}`);
        }

        resolve(snmpData);
      }
    });
  });
};

export const getSubTree = (oid: string, session: any) => {
  return new Promise((resolve, rejects) => {
    let snmpData: SnmpData[] = [];

    // ฟังก์ชันที่ทำงานหลังจากการดึงข้อมูลเสร็จ
    function doneCb(error: Error | null) {
      if (error) {
        rejects(error.toString());
      } else {
        resolve(snmpData);
      }
      session.close();
    }

    // ฟังก์ชันที่ใช้ในการประมวลผล varbinds ที่ได้รับ
    function feedCb(varbinds: any[]): void {
      for (let i = 0; i < varbinds.length; i++) {
        if (snmp.isVarbindError(varbinds[i])) {
          console.error(snmp.varbindError(varbinds[i]));
        } else {
          snmpData.push({
            oid: varbinds[i].oid,
            value: varbinds[i].value.toString(),
          });
        }
      }
    }

    // กำหนดค่าของ maxRepetitions
    const maxRepetitions: number = 20;

    // เรียกใช้ SNMP Subtree
    session.subtree(oid, maxRepetitions, feedCb, doneCb);
  });
};

export const createSnmpSession = async (
  host: string,
  community: string,
  port: number,
  versions: string
): Promise<{ session: any; isConnected: boolean }> => {
  let version: any;
  switch (versions) {
    case "v1": {
      version = snmp.Version1;
      break;
    }
    case "v2": {
      version = snmp.Version2c;
      break;
    }
    case "v2c": {
      version = snmp.Version2c;
      break;
    }
    case "v3": {
      version = snmp.Version3;
    }
  }

  const session = snmp.createSession(host, community, {
    port: port,
    version: version,
  });

  try {
    // ทดสอบการเชื่อมต่อ SNMP ด้วย OID พื้นฐาน เช่น sysDescr.0
    const testOid = "1.3.6.1.2.1.1.1.0"; // OID สำหรับข้อมูลคำอธิบายระบบ
    const data = await new Promise((resolve, reject) => {
      session.get([testOid], (error: any, varbinds: any) => {
        if (error) {
          reject(error);
        } else {
          resolve(varbinds);
        }
      });
    });

    // ถ้าดึงข้อมูลสำเร็จและมีข้อมูลตอบกลับ แสดงว่าเชื่อมต่อได้
    const isConnected = Array.isArray(data) && data.length > 0;

    return { session, isConnected };
  } catch {
    session.close();
    return { session: null, isConnected: false };
  }
};
