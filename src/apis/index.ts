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

routes.use("/api/host", Host);
routes.use("/api/template", Template);
routes.use("/api/item", Item);
routes.use("/api/data", Data);
routes.use("/api/trigger", Trigger);
routes.use("/api/event", Event);
routes.use("/api/media", Media);
routes.use("/api/user", User);
routes.use("/api/dashboard", Dashbroad);
routes.use("/api/authen", Authen);
routes.use("/api/email", Email);
routes.use("/api/loguser", LogUser);
