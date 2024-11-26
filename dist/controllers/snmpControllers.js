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
exports.createSnmpSession = exports.getSubTree = exports.getSnmpData = void 0;
const snmp = __importStar(require("net-snmp"));
// export const getSnmpData = (oid: string, session: any): Promise<SnmpData[]> => {
//   return new Promise((resolve, reject) => {
//     const snmpData: SnmpData[] = [];
//     session.get([oid], (error: Error | null, varbinds: any[]) => {
//       if (error) {
//         session.close();
//         return;
//       } else {
//         for (const varbind of varbinds) {
//           if (snmp.isVarbindError(varbind)) {
//             session.close();
//             reject(snmp.varbindError(varbind));
//             return;
//           } else {
//             snmpData.push({
//               oid: varbind.oid,
//               value: varbind.value.toString(),
//             });
//           }
//         }
//         resolve(snmpData);
//       }
//     });
//   });
// };
const getSnmpData = (oid, session) => {
    return new Promise((resolve, reject) => {
        const snmpData = [];
        session.get([oid], (error, varbinds) => {
            if (error) {
                // console.error(`Error fetching OID ${oid}:`, error.toString());
                session.close();
                reject(`Error fetching OID ${oid}: ${error.toString()}`);
            }
            else {
                for (const varbind of varbinds) {
                    if (snmp.isVarbindError(varbind)) {
                        const varbindError = snmp.varbindError(varbind);
                        // console.error(`SNMP Varbind Error for OID ${oid}:`, varbindError);
                        session.close();
                        reject(`SNMP Varbind Error for OID ${oid}: ${varbindError}`);
                        return;
                    }
                    else {
                        snmpData.push({
                            oid: varbind.oid,
                            value: varbind.value.toString(),
                        });
                    }
                }
                if (snmpData.length === 0) {
                    console.warn(`No data returned for OID ${oid}`);
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
const createSnmpSession = (host, community) => __awaiter(void 0, void 0, void 0, function* () {
    const session = snmp.createSession(host, community);
    try {
        // ทดสอบการเชื่อมต่อ SNMP ด้วย OID พื้นฐาน เช่น sysDescr.0
        const testOid = "1.3.6.1.2.1.1.1.0"; // OID สำหรับข้อมูลคำอธิบายระบบ
        const data = yield new Promise((resolve, reject) => {
            session.get([testOid], (error, varbinds) => {
                if (error) {
                    reject(error);
                }
                else {
                    resolve(varbinds);
                }
            });
        });
        // ถ้าดึงข้อมูลสำเร็จและมีข้อมูลตอบกลับ แสดงว่าเชื่อมต่อได้
        const isConnected = Array.isArray(data) && data.length > 0;
        return { session, isConnected };
    }
    catch (_a) {
        session.close();
        return { session: null, isConnected: false };
    }
});
exports.createSnmpSession = createSnmpSession;
