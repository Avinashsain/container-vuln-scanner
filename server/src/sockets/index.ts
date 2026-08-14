import type { Server as HttpServer } from "node:http";
import { parseCookie } from "cookie";
import { Server, type Socket } from "socket.io";
import { env } from "../config/env";
import { verifyToken } from "../lib/jwt";
import { setIo } from "./io";

export function createSocketServer(httpServer: HttpServer): Server {
  const io = new Server(httpServer, {
    cors: { origin: env.corsOrigin, credentials: true },
  });

  io.use((socket: Socket, next) => {
    const raw = socket.handshake.headers.cookie;
    const token = raw ? parseCookie(raw)[env.cookieName] : undefined;
    if (!token) return next(new Error("Not authenticated"));

    try {
      socket.data.user = verifyToken(token);
      return next();
    } catch {
      return next(new Error("Invalid or expired session"));
    }
  });

  io.on("connection", (socket) => {
    // Every authenticated client gets fleet-wide events (scan started/completed/
    // failed on any image) so dashboards and lists update without a refresh.
    socket.join("dashboard");

    socket.on("scan:subscribe", (scanId: string) => {
      if (typeof scanId === "string") socket.join(`scan:${scanId}`);
    });
    socket.on("scan:unsubscribe", (scanId: string) => {
      if (typeof scanId === "string") socket.leave(`scan:${scanId}`);
    });
  });

  setIo(io);
  return io;
}
