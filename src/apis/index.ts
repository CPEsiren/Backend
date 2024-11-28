// src/routes.ts
import express from "express";
import Host from "./Host_api";
import Template from "./Template_api";
import Item from "./Item_api";
import Data from "./Data_api";
import Mail from "./Mail_api";

export const routes = express.Router();

routes.use("/host", Host);
routes.use("/template", Template);
routes.use("/item", Item);
routes.use("/data", Data);
routes.use("/alert/mail", Mail);
