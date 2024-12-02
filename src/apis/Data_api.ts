// import { fetchAndStoreSnmpData } from "../services/snmpService";
import { body, validationResult } from "express-validator";
import { Router, Request, Response } from "express";
import { Db, MongoClient, ObjectId } from "mongodb";
import dotenv from "dotenv";
import { createData, getAllData, getData } from "../controllers/dataController";

const router = Router();

dotenv.config();

router.get("/", getAllData);

router.get("/:id", getData);

router.post("/", createData);

export default router;
