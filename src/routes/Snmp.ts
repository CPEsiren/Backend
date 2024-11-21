import * as snmp from "net-snmp";
import { Router, Request, Response } from "express";
import { MongoClient } from "mongodb";
import { getOne } from "../controllers/snmpControllers";
import dotenv from "dotenv";

const router = Router();

dotenv.config();

const client = new MongoClient(`${process.env.Database_url}` || "");

router.post("/addData", async (req: Request, res: Response) => {
  try {
    await client.connect();
    const db = client.db("CPE-siren");
    const collection = db.collection("String_history");

    const { ip, community, oid } = req.body;

    if (!ip || !community || !Array.isArray(oid) || oid.length === 0) {
      return res
        .status(400)
        .json({ error: "Invalid request data. 'oid' must be an array." });
    }
    const session = snmp.createSession(
      ip || "", // ค่าของ SNMP_HOST
      community || "" // ค่าของ SNMP_COMMUNITY
    );

    const results = [];

    for (const singleOid of oid) {
      const bd = await getOne([singleOid.toString()], session);
      const oids = bd[0]?.oid;
      const value = bd[0]?.value;

      const result = await collection.insertOne({ oids, value });
      results.push(result);
    }

    session.close();

    res.status(201).json({
      message: "Ok.",
      data: results,
    });
  } catch (error) {
    console.error("Database error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  } finally {
    // ปิดการเชื่อมต่อ
    await client.close();
  }
});

export default router;
