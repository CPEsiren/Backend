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
const express_1 = require("express");
const mongodb_1 = require("mongodb");
const dotenv_1 = __importDefault(require("dotenv"));
const router = (0, express_1.Router)();
dotenv_1.default.config();
const client = new mongodb_1.MongoClient(`${process.env.Database_url}` || "");
router.get("/", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield client.connect();
        const db = client.db("CPE-siren");
        const collection = db.collection("Items");
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
    finally {
        // ปิดการเชื่อมต่อ
        yield client.close();
    }
}));
router.post("/createItem", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { item_id, host_id, name_item, oid, type, unit, interval, exp_history, exp_trends, } = req.body;
        if (!item_id ||
            !host_id ||
            !name_item ||
            !oid ||
            !type ||
            !unit ||
            !interval ||
            !exp_history ||
            !exp_trends) {
            return res.status(400).json({ error: "Missing required fields." });
        }
        yield client.connect();
        const db = client.db("CPE-siren");
        const collection = db.collection("Items");
        const result = yield collection.insertOne({
            _id: item_id,
            host_id,
            name_item,
            oid,
            type,
            unit,
            interval,
            exp_history,
            exp_trends,
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
    finally {
        yield client.close();
    }
}));
router.delete("/deleteItem/:id", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        if (!id) {
            return res.status(400).json({ error: "Missing required parameter: id" });
        }
        yield client.connect();
        const db = client.db("CPE-siren");
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
    finally {
        yield client.close();
    }
}));
exports.default = router;
