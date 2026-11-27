export const DEFAULT_AUDIUS_SERVERS = [
  "https://api.audius.co",
  "https://discoveryprovider.audius.co",
  "https://discoveryprovider2.audius.co",
  "https://discoveryprovider3.audius.co",
] as const;

const AUDIUS_HOSTS = new Set(["audius.co", "www.audius.co"]);
const DISCOVERY_INDEX_URL = "https://api.audius.co";
const REQUEST_TIMEOUT_MS = 4500;

export const clamp = (value: number, min = 0, max = 1): number =>
  Math.min(max, Math.max(min, value));

export function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const minutes = Math.floor(seconds / 60);
  const remaining = Math.floor(seconds % 60);
  return `${minutes}:${String(remaining).padStart(2, "0")}`;
}

export function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

function isPrivateOrLiteralHost(hostname: string): boolean {
  const lower = hostname.toLowerCase();
  if (
    lower === "localhost" ||
    lower.endsWith(".local") ||
    lower.endsWith(".internal") ||
    lower.includes(":")
  ) {
    return true;
  }
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(lower);
}

export function isValidAudiusServer(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  try {
    const url = new URL(raw.trim());
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      !url.hostname ||
      isPrivateOrLiteralHost(url.hostname)
    ) {
      return null;
    }
    return url.origin;
  } catch {
    return null;
  }
}

export function getAudiusTrackUrl(value: string): URL {
  const url = new URL(value);
  if (
    url.protocol !== "https:" ||
    !AUDIUS_HOSTS.has(url.hostname) ||
    url.username ||
    url.password
  ) {
    throw new Error("Invalid Audius track URL");
  }
  url.hash = "";
  return url;
}

export function buildStreamUrl(server: string, trackId: string): string {
  return `${server}/v1/tracks/${encodeURIComponent(trackId)}/stream`;
}

export type AudiusServerPool = {
  getServers: () => string[];
  getCurrent: () => string;
  markSuccess: (server: string) => void;
  markFailed: (server: string) => void;
  mergeServers: (candidates: unknown[]) => void;
};

export function createServerPool(
  initialServers: readonly string[] = DEFAULT_AUDIUS_SERVERS
): AudiusServerPool {
  const servers: string[] = [];
  for (const raw of initialServers) {
    const valid = isValidAudiusServer(raw);
    if (valid && !servers.includes(valid)) {
      servers.push(valid);
    }
  }
  if (servers.length === 0) {
    servers.push(...DEFAULT_AUDIUS_SERVERS);
  }

  return {
    getServers: () => [...servers],
    getCurrent: () => servers[0],
    markSuccess(server: string) {
      const idx = servers.indexOf(server);
      if (idx > 0) {
        servers.splice(idx, 1);
        servers.unshift(server);
      }
    },
    markFailed(server: string) {
      const idx = servers.indexOf(server);
      if (idx !== -1 && servers.length > 1) {
        servers.splice(idx, 1);
        servers.push(server);
      }
    },
    mergeServers(candidates: unknown[]) {
      for (const candidate of candidates) {
        const valid = isValidAudiusServer(candidate);
        if (valid && !servers.includes(valid)) {
          servers.push(valid);
        }
      }
    },
  };
}

function createTimedSignal(
  parentSignal: AbortSignal | undefined,
  timeoutMs: number
): { signal: AbortSignal; cleanup: () => void } {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new Error("Timeout")), timeoutMs);

  const onParentAbort = () => controller.abort(parentSignal?.reason);
  if (parentSignal) {
    if (parentSignal.aborted) {
      controller.abort(parentSignal.reason);
    } else {
      parentSignal.addEventListener("abort", onParentAbort, { once: true });
    }
  }

  return {
    signal: controller.signal,
    cleanup: () => {
      clearTimeout(timer);
      parentSignal?.removeEventListener("abort", onParentAbort);
    },
  };
}

export async function fetchDiscoveryServers(
  fetchImpl: typeof fetch = fetch,
  parentSignal?: AbortSignal
): Promise<string[]> {
  const { signal, cleanup } = createTimedSignal(parentSignal, REQUEST_TIMEOUT_MS);
  try {
    const response = await fetchImpl(DISCOVERY_INDEX_URL, { signal });
    if (!response.ok) return [];
    const payload = (await response.json()) as { data?: unknown };
    if (!Array.isArray(payload.data)) return [];
    return payload.data
      .map(isValidAudiusServer)
      .filter((s): s is string => s !== null);
  } catch {
    return [];
  } finally {
    cleanup();
  }
}

export async function resolveTrackIdWithFailover({
  trackUrl,
  pool,
  fetchImpl = fetch,
  signal: parentSignal,
}: {
  trackUrl: string;
  pool: AudiusServerPool;
  fetchImpl?: typeof fetch;
  signal?: AbortSignal;
}): Promise<{ id: string; server: string }> {
  const normalizedUrl = getAudiusTrackUrl(trackUrl).href;
  const candidates = pool.getServers();

  for (const server of candidates) {
    if (parentSignal?.aborted) {
      throw new DOMException("Aborted", "AbortError");
    }

    const resolveUrl = new URL(`${server}/v1/resolve`);
    resolveUrl.searchParams.set("url", normalizedUrl);

    const { signal, cleanup } = createTimedSignal(
      parentSignal,
      REQUEST_TIMEOUT_MS
    );

    try {
      const response = await fetchImpl(resolveUrl, { signal });
      if (!response.ok) {
        pool.markFailed(server);
        continue;
      }

      const result = (await response.json()) as {
        data?: { id?: unknown };
      };
      const id = result.data?.id;
      if (typeof id !== "string" || !id || id.length > 128) {
        pool.markFailed(server);
        continue;
      }

      pool.markSuccess(server);
      return { id, server };
    } catch (error) {
      if (parentSignal?.aborted) {
        throw error instanceof Error && error.name === "AbortError"
          ? error
          : new DOMException("Aborted", "AbortError");
      }
      pool.markFailed(server);
    } finally {
      cleanup();
    }
  }

  throw new Error("All Audius servers are unavailable");
}
