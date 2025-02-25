// src/routes.ts
import express from "express";
import Host from "./Host_api";
import Template from "./Template_api";
import Item from "./Item_api";
import Data from "./Data_api";
import Trigger from "./Trigger_api";
import Event from "./Event_api";
import Media from "./Media_api";
import User from "./User_api";
import Dashbroad from "./Dashboard_api";
import Authen from "./Authen_api";
import Email from "./Email_api";
import LogUser from "./LogUser_api";

export const routes = express.Router();

routes.use("/host", Host);
routes.use("/template", Template);
routes.use("/item", Item);
routes.use("/data", Data);
routes.use("/trigger", Trigger);
routes.use("/event", Event);
routes.use("/media", Media);
routes.use("/user", User);
routes.use("/dashboard", Dashbroad);
routes.use("/authen", Authen);
routes.use("/email", Email);
routes.use("/loguser", LogUser);
