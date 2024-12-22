// src/routes.ts
import express from "express";
import Host from "./Host_api";
import Template from "./Template_api";
import Item from "./Item_api";
import Data from "./Data_api";
import Trigger from "./Trigger_api";
import Event from "./Event_api";
// import Action from "./Action_api";
// import Media from "./Media_api";
// import User from "./User_api";
// import Mail from "./Mail_api";
// import Sms from "./Sms_api";
// import Line from "./Line_api";

export const routes = express.Router();

routes.use("/host", Host);
routes.use("/template", Template);
routes.use("/item", Item);
routes.use("/data", Data);
routes.use("/trigger", Trigger);
routes.use("/event", Event);
// routes.use("/action", Action);
// routes.use("/media", Media);
// routes.use("/user", User);
// routes.use("/alert/mail", Mail);
// routes.use("/alert/sms", Sms);
// routes.use("/alert/line", Line);
