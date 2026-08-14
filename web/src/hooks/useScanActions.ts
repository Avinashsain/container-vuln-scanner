import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api, extractErrorMessage } from "../api/client";
import { useToast } from "../context/ToastContext";
import type { Image, Scan } from "../types";

function invalidateScanQueries(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ["images"] });
  queryClient.invalidateQueries({ queryKey: ["scans"] });
  queryClient.invalidateQueries({ queryKey: ["dashboard"] });
}

export function useAddImage() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async (imageRef: string) =>
      (await api.post<{ image: Image; scan: Scan }>("/images", { imageRef })).data,
    onSuccess: ({ image }) => {
      invalidateScanQueries(queryClient);
      showToast(`Scan started for ${image.name}:${image.tag}`);
    },
    onError: (err) => showToast(extractErrorMessage(err, "Could not start scan"), "error"),
  });
}

export function useTriggerScan() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async (imageId: string) => (await api.post<Scan>(`/images/${imageId}/scan`)).data,
    onSuccess: () => {
      invalidateScanQueries(queryClient);
      showToast("Scan started");
    },
    onError: (err) => showToast(extractErrorMessage(err, "Could not start scan"), "error"),
  });
}

export function useCancelScan() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async (scanId: string) => api.post(`/scans/${scanId}/cancel`),
    onSuccess: () => {
      invalidateScanQueries(queryClient);
      showToast("Scan cancelled");
    },
    onError: (err) => showToast(extractErrorMessage(err, "Could not cancel scan"), "error"),
  });
}

export function useDeleteScan() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async (scanId: string) => api.delete(`/scans/${scanId}`),
    onSuccess: () => {
      invalidateScanQueries(queryClient);
      showToast("Scan deleted");
    },
    onError: (err) => showToast(extractErrorMessage(err, "Could not delete scan"), "error"),
  });
}

export function useUpdateSchedule(imageId: string) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async (scanIntervalMinutes: number | null) =>
      (await api.patch<Image>(`/images/${imageId}`, { scanIntervalMinutes })).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["images"] });
      showToast("Auto-scan schedule updated");
    },
    onError: (err) => showToast(extractErrorMessage(err, "Could not update schedule"), "error"),
  });
}
