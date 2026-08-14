import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { io, type Socket } from "socket.io-client";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "./AuthContext";
import { useToast } from "./ToastContext";

interface ScanEventBase {
  scanId: string;
  imageId: string;
}
interface ScanStartedPayload extends ScanEventBase {
  image: { name: string; tag: string };
}
interface ScanCompletedPayload extends ScanEventBase {
  summary: { critical: number; high: number; medium: number; low: number; total: number };
}
interface ScanFailedPayload extends ScanEventBase {
  error: string;
}

const SocketContext = createContext<Socket | null>(null);

function invalidateScanQueries(queryClient: ReturnType<typeof useQueryClient>, imageId?: string) {
  queryClient.invalidateQueries({ queryKey: ["images"] });
  queryClient.invalidateQueries({ queryKey: ["scans"] });
  queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  queryClient.invalidateQueries({ queryKey: ["vulnerabilities"] });
  if (imageId) queryClient.invalidateQueries({ queryKey: ["images", imageId] });
}

export function SocketProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  useEffect(() => {
    if (!user) {
      setSocket(null);
      return;
    }

    const instance = io({ withCredentials: true, path: "/socket.io" });
    setSocket(instance);

    instance.on("scan.started", (payload: ScanStartedPayload) => {
      invalidateScanQueries(queryClient, payload.imageId);
      showToast(`Scan started: ${payload.image.name}:${payload.image.tag}`);
    });

    instance.on("scan.completed", (payload: ScanCompletedPayload) => {
      invalidateScanQueries(queryClient, payload.imageId);
      showToast(`Scan completed — ${payload.summary.total} vulnerabilities found`);
    });

    instance.on("scan.failed", (payload: ScanFailedPayload) => {
      invalidateScanQueries(queryClient, payload.imageId);
      showToast(`Scan failed: ${payload.error.slice(0, 120)}`, "error");
    });

    instance.on("scan.cancelled", (payload: ScanEventBase) => {
      invalidateScanQueries(queryClient, payload.imageId);
    });

    instance.on("scan.progress", (payload: { scanId: string }) => {
      queryClient.invalidateQueries({ queryKey: ["scans", payload.scanId] });
    });

    return () => {
      instance.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  return <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>;
}

export function useSocket() {
  return useContext(SocketContext);
}

/** Joins a scan's room for the lifetime of the component and returns live progress ticks. */
export function useScanProgress(scanId: string | undefined) {
  const socket = useSocket();
  const [progress, setProgress] = useState<{ progress: number; stage: string } | null>(null);
  const scanIdRef = useRef(scanId);
  scanIdRef.current = scanId;

  useEffect(() => {
    if (!socket || !scanId) return;

    socket.emit("scan:subscribe", scanId);
    const handler = (payload: { scanId: string; progress: number; stage: string }) => {
      if (payload.scanId === scanIdRef.current) setProgress(payload);
    };
    socket.on("scan.progress", handler);

    return () => {
      socket.emit("scan:unsubscribe", scanId);
      socket.off("scan.progress", handler);
    };
  }, [socket, scanId]);

  return progress;
}
