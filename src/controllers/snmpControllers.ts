import * as snmp from "net-snmp";

interface SnmpData {
  oid: string;
  value: string;
}

export const getOne = (oids: string[], session: any): Promise<SnmpData[]> => {
  return new Promise((resolve, reject) => {
    const snmpData: SnmpData[] = [];

    session.get(oids, (error: Error | null, varbinds: any[]) => {
      if (error) {
        session.close();
        reject(error.toString());
      } else {
        for (let i = 0; i < varbinds.length; i++) {
          const varbind = varbinds[i];

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

// router.get("/:oid", async (req: Request, res: Response) => {
//   try {
//     const session = snmp.createSession(
//       process.env.TRAGET_HOST || "", // ค่าของ SNMP_HOST
//       process.env.COMMUNITY_HOST || "" // ค่าของ SNMP_COMMUNITY
//     );
//     const data = await getOne([req.params.oid.toString()], session);
//     res.json(data);
//   } catch (error) {
//     console.error("Error fetching SNMP data:", error);
//     res.status(500).json({ error: "Internal Server Error", details: error });
//   }
// });

// router.get("/sub/:oid", async (req: Request, res: Response) => {
//   try {
//     const session = snmp.createSession(
//       process.env.TRAGET_HOST || "", // ค่าของ SNMP_HOST
//       process.env.COMMUNITY_HOST || "" // ค่าของ SNMP_COMMUNITY
//     );
//     getSubTree(req.params.oid.toString(), session)
//       .then((data) => {
//         res.json(data);
//       })
//       .catch((error) => {
//         res.json(`"Error retrieving SNMP data:" ${error}`);
//       });
//   } catch (error) {
//     console.error("Error fetching users:", error);
//     res.status(500).json({ error: "Internal Server Error", details: error });
//   }
// });
