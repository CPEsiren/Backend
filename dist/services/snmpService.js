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
        const history_collection = db.collection("Histories");
        const host_collection = db.collection("Hosts");
        const item_collection = db.collection("Items");
        const hosts = yield host_collection.find().toArray();
        const results = [];
        for (const host of hosts) {
            const { session, isConnected } = yield (0, snmpControllers_1.createSnmpSession)(host.ip_address, host.community);
            if (!isConnected || !session) {
                yield host_collection.updateOne({ _id: new mongodb_1.ObjectId(host._id) }, { $set: { status: 0 } });
                const err = `SNMP connection failed for host ${host._id} (IP: ${host.ip_address}, Community: ${host.community})`;
                console.error(err);
                continue;
            }
            yield host_collection.updateOne({ _id: new mongodb_1.ObjectId(host._id) }, { $set: { status: 1 } });
            const items = yield item_collection
                .find({
                host_id: new mongodb_1.ObjectId(host._id),
            })
                .toArray();
            for (const item of items) {
                try {
                    const snmpData = yield (0, snmpControllers_1.getSnmpData)(item.oid, session);
                    yield item_collection.updateOne({ _id: new mongodb_1.ObjectId(item._id) }, { $set: { status: 1 } });
                    const result = yield history_collection.insertOne({
                        metadata: {
                            host_id: host._id,
                            item_id: item._id,
                            item_name: item.name_item,
                        },
                        timestamp: new Date(),
                        value: (_a = snmpData[0]) === null || _a === void 0 ? void 0 : _a.value,
                    });
                    results.push(result);
                }
                catch (_b) {
                    yield item_collection.updateOne({ _id: new mongodb_1.ObjectId(item._id) }, { $set: { status: 0 } });
                    const err = `No data returned for OID ${item.oid} on host ${host._id}`;
                    console.error(err);
                }
            }
        }
        return results;
    });
}
