import "server-only";

import { isIP } from "node:net";
import { resolve4, resolve6 } from "node:dns/promises";
import { WorkflowHttpError } from "./errors";

function privateAddress(address: string) {
  if (address === "::1" || address === "::" || address.startsWith("fc") || address.startsWith("fd")) return true;
  if (address.startsWith("fe8") || address.startsWith("fe9") || address.startsWith("fea") || address.startsWith("feb")) return true;
  const parts = address.split(".").map(Number);
  if (parts.length !== 4) return false;
  const [a, b] = parts;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 100 && b >= 64 && b <= 127) ||
    a >= 224
  );
}
export async function assertPublicHttpUrl(raw: string) {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new WorkflowHttpError(400, "URL is invalid.");
  }
  if (!["https:", "http:"].includes(url.protocol) || url.username || url.password) {
    throw new WorkflowHttpError(400, "URL must be a public HTTP or HTTPS address.");
  }
  const host = url.hostname.replace(/^\[|\]$/g, "");
  const addresses = isIP(host)
    ? [host]
    : [...(await resolve4(host).catch(() => [])), ...(await resolve6(host).catch(() => []))];
  if (addresses.length === 0 || addresses.some(privateAddress)) {
    throw new WorkflowHttpError(400, "Private-network and unresolvable URLs are blocked.");
  }
  return url;
}

export function safeOutboundHeaders(headers?: Record<string, string>) {
  const blocked = new Set(["host", "cookie", "proxy-authorization"]);
  return Object.fromEntries(
    Object.entries(headers || {}).filter(([name]) => !blocked.has(name.toLowerCase())),
  );
}
