export interface ParsedImageRef {
  repository: string;
  name: string;
  tag: string;
  registry: string | null;
}

const DOCKER_COMMAND_PREFIX = /^\s*docker\s+(image\s+)?(pull|push|inspect)\s+/i;

/**
 * Accepts a raw string a user might paste into "scan a new image" — including
 * a full `docker pull <ref>` command instead of the bare reference — and
 * returns just the image reference Trivy expects.
 */
export function normalizeImageRefInput(input: string): string {
  return input.trim().replace(DOCKER_COMMAND_PREFIX, "").trim();
}

/**
 * Parses a Docker image reference or Trivy's `ArtifactName` into the
 * (repository, name, tag) shape used by the Image model. Handles both
 * local refs ("nginx:latest") and registry-qualified ones
 * ("my.registry.com/team/app:1.2.3").
 */
export function parseImageRef(ref: string): ParsedImageRef {
  const segments = ref.split("/");
  const last = segments.pop()!;
  const [name, tag = "latest"] = last.split(/:(?=[^:]*$)/);
  const repository = segments.join("/");
  const registry = repository.includes(".") || repository.includes(":") ? repository : null;
  return { repository, name, tag, registry };
}

export function formatImageRef(image: { repository: string; name: string; tag: string }): string {
  return image.repository ? `${image.repository}/${image.name}:${image.tag}` : `${image.name}:${image.tag}`;
}

export function safeFileName(ref: string): string {
  return ref.replace(/[/:]/g, "_");
}
