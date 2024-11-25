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
        session.close();
        reject(error.toString());
      } else {
        for (const varbind of varbinds) {
          if (snmp.isVarbindError(varbind)) {
            session.close();
            reject(snmp.varbindError(varbind));
            return;
          } else {
            snmpData.push({
              oid: varbind.oid,
              value: varbind.value.toString(),
            });
          }
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

export const createSnmpSession = (host: string, community: string) => {
  return snmp.createSession(host, community);
};
