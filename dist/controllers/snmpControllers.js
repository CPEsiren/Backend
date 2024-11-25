"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSnmpSession = exports.getSubTree = exports.getSnmpData = void 0;
const snmp = __importStar(require("net-snmp"));
const getSnmpData = (oid, session) => {
    return new Promise((resolve, reject) => {
        const snmpData = [];
        session.get([oid], (error, varbinds) => {
            if (error) {
                session.close();
                reject(error.toString());
            }
            else {
                for (const varbind of varbinds) {
                    if (snmp.isVarbindError(varbind)) {
                        session.close();
                        reject(snmp.varbindError(varbind));
                        return;
                    }
                    else {
                        snmpData.push({
                            oid: varbind.oid,
                            value: varbind.value.toString(),
                        });
                    }
                }
                resolve(snmpData);
            }
        });
    });
};
exports.getSnmpData = getSnmpData;
const getSubTree = (oid, session) => {
    return new Promise((resolve, rejects) => {
        let snmpData = [];
        // ฟังก์ชันที่ทำงานหลังจากการดึงข้อมูลเสร็จ
        function doneCb(error) {
            if (error) {
                rejects(error.toString());
            }
            else {
                resolve(snmpData);
            }
            session.close();
        }
        // ฟังก์ชันที่ใช้ในการประมวลผล varbinds ที่ได้รับ
        function feedCb(varbinds) {
            for (let i = 0; i < varbinds.length; i++) {
                if (snmp.isVarbindError(varbinds[i])) {
                    console.error(snmp.varbindError(varbinds[i]));
                }
                else {
                    snmpData.push({
                        oid: varbinds[i].oid,
                        value: varbinds[i].value.toString(),
                    });
                }
            }
        }
        // กำหนดค่าของ maxRepetitions
        const maxRepetitions = 20;
        // เรียกใช้ SNMP Subtree
        session.subtree(oid, maxRepetitions, feedCb, doneCb);
    });
};
exports.getSubTree = getSubTree;
const createSnmpSession = (host, community) => {
    return snmp.createSession(host, community);
};
exports.createSnmpSession = createSnmpSession;
