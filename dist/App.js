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
// src/app.ts
const express_1 = __importDefault(require("express"));
const dotenv_1 = __importDefault(require("dotenv"));
const body_parser_1 = __importDefault(require("body-parser"));
const cors_1 = __importDefault(require("cors"));
const Userapi_1 = __importDefault(require("./routes/Userapi"));
const Interfaceapi_1 = __importDefault(require("./routes/Interfaceapi"));
const Alertapi_1 = __importDefault(require("./routes/Alertapi"));
const Deviceapi_1 = __importDefault(require("./routes/Deviceapi"));
const Host_1 = __importDefault(require("./routes/Host"));
// import Template from "./routes/Template";
// import Item from "./routes/Item";
// import History from "./routes/History";
// import Details from "./routes/Details";
const app = (0, express_1.default)();
function start() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            dotenv_1.default.config();
            app.use((0, cors_1.default)());
            app.use(body_parser_1.default.json());
            app.use((req, res, next) => {
                console.log(`${req.method} ${req.url}`);
                next();
            });
            app.get("/", (req, res) => {
                res.send("Our Server");
            });
            app.use("/getUser", Userapi_1.default);
            app.use("/getDevice", Deviceapi_1.default);
            app.use("/getInterface", Interfaceapi_1.default);
            app.use("/getAlert", Alertapi_1.default);
            // app.use("/getDetails", Details);
            app.use("/host", Host_1.default);
            // app.use("/template", Template);
            // app.use("/item", Item);
            // app.use("/history", History);
            app.use((err, req, res, next) => {
                console.error("Unhandled error:", err);
                res.status(500).json({ error: "Something went wrong!" });
            });
        }
        catch (err) {
            console.error(err);
        }
    });
}
start();
exports.default = app;
