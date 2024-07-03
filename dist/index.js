"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const dotenv_1 = __importDefault(require("dotenv"));
const body_parser_1 = __importDefault(require("body-parser"));
const cors_1 = __importDefault(require("cors"));
const mysql2_1 = __importDefault(require("mysql2"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const port = process.env.PORT;
if (!port) {
    console.error("PORT environment variable is not defined.");
    process.exit(1);
}
app.use((0, cors_1.default)());
app.use(body_parser_1.default.json());
const db = mysql2_1.default.createPool({
    connectionLimit: 10,
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || "16838"),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
});
db.getConnection((err, connection) => {
    if (err) {
        console.error("Error connecting to the database:", err);
        return;
    }
    if (connection)
        connection.release();
    console.log("Connected to the database");
});
app.get("/", (req, res) => {
    res.send("Our Server");
});
app.get("/getUser", (req, res) => {
    db.query("SELECT * FROM User", (err, user) => {
        if (err) {
            console.error("Error fetching user:", err);
            res.status(500).json({ error: "Internal Server Error", details: err });
            return;
        }
        res.json(user);
    });
});
app.get("/getDevice", (req, res) => {
    db.query("SELECT * FROM Device", (err, device) => {
        if (err) {
            console.error("Error fetching device:", err);
            res.status(500).json({ error: "Internal Server Error", details: err });
            return;
        }
        res.json(device);
    });
});
app.use((err, req, res, next) => {
    console.error("Unhandled error:", err);
    res.status(500).json({ error: "Something went wrong!", details: err });
});
app.listen(parseInt(port), () => {
    console.log(`Backend started at port: ${port}.`);
});
