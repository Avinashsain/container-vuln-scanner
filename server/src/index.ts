import http from "node:http";
import { createApp } from "./app";
import { env } from "./config/env";
import { createSocketServer } from "./sockets";
import { startScheduler } from "./services/scheduler.service";

const app = createApp();
const httpServer = http.createServer(app);

createSocketServer(httpServer);
startScheduler();

httpServer.listen(env.port, () => {
  console.log(`container-vuln-scanner server listening on port ${env.port}`);
});
