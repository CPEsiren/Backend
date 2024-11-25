"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const snmpService_1 = require("../services/snmpService");
const express_validator_1 = require("express-validator");
const express_1 = require("express");
const database_1 = require("../services/database");
const mongodb_1 = require("mongodb");
const dotenv_1 = __importDefault(require("dotenv"));
const router = (0, express_1.Router)();
dotenv_1.default.config();
const client = new mongodb_1.MongoClient(`${process.env.Database_url}` || "");
router.get("/", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const db = (0, database_1.getDb)();
        const collection = db.collection("Histories");
        const data = yield collection.find().toArray();
        res.status(200).json({
            message: "Data retrieved successfully.",
            data,
        });
    }
    catch (err) {
        console.error("Error fetching data:", err);
        res.status(500).json({
            error: "Failed to fetch data.",
            details: err instanceof Error ? err.message : "Unknown error",
        });
    }
}));
router.post("/createHistory", [
    (0, express_validator_1.body)("item_id").notEmpty().withMessage("Item id is required"),
    (0, express_validator_1.body)("host_id").notEmpty().withMessage("Host id is required"),
], (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const data = req.body;
        const db = (0, database_1.getDb)();
        const collections = yield db
            .listCollections({ name: "Histories" })
            .toArray();
        if (collections.length === 0) {
            yield db.createCollection("Histories", {
                timeseries: {
                    timeField: "timestamp",
                    metaField: "metadata",
                    granularity: "seconds",
                },
                expireAfterSeconds: 86400,
            });
        }
        const collection = db.collection("Histories");
        const result = yield collection.insertOne({
            metadata: Object.assign({}, data),
            timestamp: new Date(),
            value: data.value || 20,
        });
        res.status(201).json({
            message: "Data added successfully.",
            data: result,
        });
    }
    catch (err) {
        console.error("Error fetching data:", err);
        res.status(500).json({
            error: "Failed to fetch data.",
            details: err instanceof Error ? err.message : "Unknown error",
        });
    }
}));
router.delete("/deleteItem/:id", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        if (!id) {
            return res.status(400).json({ error: "Missing required parameter: id" });
        }
        const db = (0, database_1.getDb)();
        const collection = db.collection("Items");
        const result = yield collection.deleteOne({ _id: parseInt(id) });
        if (result.deletedCount === 0) {
            return res
                .status(404)
                .json({ error: "No data found with the specified id." });
        }
        res.status(200).json({
            message: "Data deleted successfully.",
        });
    }
    catch (err) {
        console.error("Error deleting data:", err);
        res.status(500).json({
            error: "Failed to delete data.",
            details: err instanceof Error ? err.message : "Unknown error",
        });
    }
}));
router.get("/fetchAndStoreSnmpData", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const results = yield (0, snmpService_1.fetchAndStoreSnmpData)();
        res.status(201).json({
            message: "SNMP data fetched and stored successfully.",
            data: results,
        });
    }
    catch (err) {
        console.error("Error fetching and storing SNMP data:", err);
        res.status(500).json({
            error: "Failed to fetch and store SNMP data.",
            details: err instanceof Error ? err.message : "Unknown error",
        });
    }
}));
exports.default = router;
