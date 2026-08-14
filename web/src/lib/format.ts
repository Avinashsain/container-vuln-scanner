import type { ImageRef } from "../types";

export function formatImageRef(image: ImageRef): string {
  return image.repository ? `${image.repository}/${image.name}:${image.tag}` : `${image.name}:${image.tag}`;
}

export function formatDateTime(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatRelativeShort(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}
