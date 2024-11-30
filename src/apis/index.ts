// src/routes.ts
import express from "express";
import Host from "./Host_api";
import Template from "./Template_api";
import Item from "./Item_api";
import Data from "./Data_api";
// import Mail from "./Mail_api";
// import Sms from "./Sms_api";
// import Line from "./Line_api";
import Alert from "./Alert_api";

export const routes = express.Router();

routes.use("/host", Host);
routes.use("/template", Template);
routes.use("/item", Item);
routes.use("/data", Data);
// routes.use("/alert/mail", Mail);
// routes.use("/alert/sms", Sms);
// routes.use("/alert/line", Line);
routes.use("/alert", Alert);
