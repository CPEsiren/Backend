"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/index.ts
const App_1 = __importDefault(require("./App"));
const port = process.env.PORT;
if (!port) {
    console.error("PORT environment variable is not defined.");
    process.exit(1);
}
App_1.default.listen(parseInt(port), () => {
    console.log(`Backend started at port: ${port}.`);
});
