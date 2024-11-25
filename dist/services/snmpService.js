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
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchAndStoreSnmpData = fetchAndStoreSnmpData;
const database_1 = require("../services/database");
const snmpControllers_1 = require("../controllers/snmpControllers");
const mongodb_1 = require("mongodb");
function fetchAndStoreSnmpData() {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        const db = (0, database_1.getDb)();
        const collection = db.collection("Histories");
        const hosts = yield db.collection("Hosts").find().toArray();
        const results = [];
        for (const host of hosts) {
            const session = (0, snmpControllers_1.createSnmpSession)(host.ip_address, host.community);
            const items = yield db
                .collection("Items")
                .find({
                host_id: new mongodb_1.ObjectId(host._id),
            })
                .toArray();
            for (const item of items) {
                const snmpData = yield (0, snmpControllers_1.getSnmpData)(item.oid, session);
                const result = yield collection.insertOne({
                    metadata: {
                        host_id: host._id,
                        item_id: item._id,
                        item_name: item.name_item,
                    },
                    timestamp: new Date(),
                    value: (_a = snmpData[0]) === null || _a === void 0 ? void 0 : _a.value, // สมมติว่าค่าที่ดึงมาเป็นตัวแรก
                });
                results.push(result);
            }
            session.close();
        }
        return results;
    });
}
