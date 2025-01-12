// import { fetchAndStoreSnmpData } from "../services/snmpService";
import { body, validationResult } from "express-validator";
import { Router, Request, Response } from "express";
import { Db, MongoClient, ObjectId } from "mongodb";
import dotenv from "dotenv";
import { getAllData, getData } from "../controllers/dataController";

const router = Router();

dotenv.config();

router.get("/", getAllData);

router.get("/:id", getData);

export default router;
