// src/routes.ts
import express from "express";
// import User from "./Userapi";
// import Interface from "./Interfaceapi";
// import Alert from "./Alertapi";
// import deviceRoutes from "./Deviceapi";
import Host from "./Host";
import Template from "./Template";
import Item from "./Item";
import History from "./History";
// import Details from "./Details";

export const routes = express.Router();

// routes.use("/getUser", User);
// routes.use("/getDevice", deviceRoutes);
// routes.use("/getInterface", Interface);
// routes.use("/getAlert", Alert);
// routes.use("/getDetails", Details);
routes.use("/host", Host);
routes.use("/template", Template);
routes.use("/item", Item);
routes.use("/history", History);
