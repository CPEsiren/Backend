"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/app.ts
const express_1 = __importDefault(require("express"));
const dotenv_1 = __importDefault(require("dotenv"));
const body_parser_1 = __importDefault(require("body-parser"));
const cors_1 = __importDefault(require("cors"));
const Userapi_1 = __importDefault(require("./routes/Userapi"));
// import Device from "./routes/Deviceapi";
const Interfaceapi_1 = __importDefault(require("./routes/Interfaceapi"));
const Alertapi_1 = __importDefault(require("./routes/Alertapi"));
const Deviceapi_1 = __importDefault(require("./routes/Deviceapi"));
dotenv_1.default.config();
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(body_parser_1.default.json());
app.get("/", (req, res) => {
    res.send("Our Server");
});
app.use("/getUser", Userapi_1.default);
app.use('/getDevice', Deviceapi_1.default);
app.use("/getInterface", Interfaceapi_1.default);
app.use("/getAlert", Alertapi_1.default);
app.use((err, req, res, next) => {
    console.error("Unhandled error:", err);
    res.status(500).json({ error: "Something went wrong!", details: err });
});
exports.default = app;
