import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api, extractErrorMessage } from "../api/client";
import { useToast } from "../context/ToastContext";

interface ImportTally {
  imported: number;
  duplicate: number;
  skipped: number;
  total: number;
}

function invalidateAllScanData(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ["images"] });
  queryClient.invalidateQueries({ queryKey: ["scans"] });
  queryClient.invalidateQueries({ queryKey: ["reports"] });
  queryClient.invalidateQueries({ queryKey: ["vulnerabilities"] });
  queryClient.invalidateQueries({ queryKey: ["dashboard"] });
}

export function useImportReports() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async () => (await api.post<ImportTally>("/admin/import-reports")).data,
    onSuccess: (tally) => {
      invalidateAllScanData(queryClient);
      showToast(
        `Pulled ${tally.imported} new scan${tally.imported === 1 ? "" : "s"} from reports/ (${tally.duplicate} already present, ${tally.skipped} skipped)`
      );
    },
    onError: (err) => showToast(extractErrorMessage(err, "Could not pull data"), "error"),
  });
}

export function useResetData() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async () => (await api.post<{ imagesDeleted: number }>("/admin/reset")).data,
    onSuccess: ({ imagesDeleted }) => {
      invalidateAllScanData(queryClient);
      showToast(`Reset complete — ${imagesDeleted} image${imagesDeleted === 1 ? "" : "s"} and all related scan data removed`);
    },
    onError: (err) => showToast(extractErrorMessage(err, "Could not reset data"), "error"),
  });
}
