import axios from "axios";

export const api = axios.create({
  baseURL: "/api",
  withCredentials: true,
});

export function extractErrorMessage(error: unknown, fallback = "Something went wrong"): string {
  if (axios.isAxiosError(error)) {
    return (error.response?.data as { error?: string } | undefined)?.error ?? fallback;
  }
  return fallback;
}
