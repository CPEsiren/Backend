import { createSnmpSession, getSnmpData } from "../controllers/snmpControllers";
import { Db, ObjectId } from "mongodb";
import Host from "../models/Host";
import Data from "../models/Data";
import Item from "../models/Item";

export async function fetchAndStoreSnmpData() {
  // ดึงข้อมูล hosts ทั้งหมด
  const hosts = await Host.find();
  const results: any = [];

  // ใช้ Promise.all เพื่อทำงานกับ hosts พร้อมกัน
  await Promise.all(
    hosts.map(async (host) => {
      const { session, isConnected } = await createSnmpSession(
        host.ip_address as string,
        host.community as string,
        host.snmp_port as number,
        host.snmp_version as string
      );

      // อัพเดทสถานะของ host
      host.status = isConnected ? 1 : 0;
      await host.save();

      if (!isConnected || !session) {
        console.log(
          `SNMP connection failed for host ${host.hostname} (IP: ${host.ip_address}, Community: ${host.snmp_community})`
        );
        return;
      }

      // ดึงข้อมูล items ทั้งหมดของ host นี้
      const items = await Item.find({ host_id: host._id });

      // ใช้ Promise.all อีกครั้งเพื่อทำงานกับ items พร้อมกัน
      const itemResults = await Promise.all(
        items.map(async (item) => {
          try {
            const [snmpData] = await getSnmpData(item.oid, session);
            item.status = 1;
            await item.save();

            const data = new Data({
              value: snmpData?.value,
              timestamp: new Date(),
              metadata: {
                host_id: host._id,
                item_id: item._id,
                item_name: item.name_item,
                hostname: host.hostname,
              },
            });

            await data.save();
            return data;
          } catch (error) {
            item.status = 0;
            await item.save();
            console.error(
              `No data returned for OID ${item.oid} on host ${host._id}`
            );
            return null;
          }
        })
      );

      // กรองผลลัพธ์ที่ไม่เป็น null และเพิ่มเข้าไปใน results
      results.push(...itemResults.filter(Boolean));
    })
  );

  return results;
}
