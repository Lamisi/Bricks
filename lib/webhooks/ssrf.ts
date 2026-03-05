import "server-only";
import { lookup } from "dns/promises";

// Private / reserved IPv4 CIDR blocks (SSRF targets)
const PRIVATE_RANGES: [number, number][] = [
  [0x7f000000, 0xff000000], // 127.0.0.0/8   loopback
  [0x0a000000, 0xff000000], // 10.0.0.0/8    RFC-1918
  [0xac100000, 0xfff00000], // 172.16.0.0/12 RFC-1918
  [0xc0a80000, 0xffff0000], // 192.168.0.0/16 RFC-1918
  [0xa9fe0000, 0xffff0000], // 169.254.0.0/16 link-local
  [0x64400000, 0xffc00000], // 100.64.0.0/10  shared address
  [0xe0000000, 0xf0000000], // 224.0.0.0/4    multicast
  [0xf0000000, 0xf0000000], // 240.0.0.0/4    reserved
  [0x00000000, 0xff000000], // 0.0.0.0/8      this network
];

function ipv4ToInt(ip: string): number {
  return ip
    .split(".")
    .reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0;
}

function isPrivateIpv4(ip: string): boolean {
  const n = ipv4ToInt(ip);
  return PRIVATE_RANGES.some(([net, mask]) => (n & mask) === net);
}

function isPrivateIpv6(ip: string): boolean {
  // Normalised lowercase check for common reserved IPv6
  const lower = ip.toLowerCase().replace(/^\[/, "").replace(/\]$/, "");
  return (
    lower === "::1" ||
    lower.startsWith("fc") ||
    lower.startsWith("fd") ||
    lower.startsWith("fe80:") ||
    lower === "::"
  );
}

/**
 * Validates that a webhook URL is safe to use as an outbound target.
 * Throws with a descriptive message if the URL is invalid or SSRF-risky.
 */
export async function validateWebhookUrl(rawUrl: string): Promise<void> {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error("Invalid URL format");
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("Webhook URL must use http or https");
  }

  const { hostname } = parsed;

  // Reject raw IP literals
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(hostname)) {
    if (isPrivateIpv4(hostname)) {
      throw new Error("Webhook URL must not point to a private IP address");
    }
  } else if (hostname.startsWith("[")) {
    // IPv6 literal
    if (isPrivateIpv6(hostname)) {
      throw new Error("Webhook URL must not point to a private IP address");
    }
  } else {
    // Resolve hostname and check all returned IPs
    let addresses: string[];
    try {
      const result = await lookup(hostname, { all: true });
      addresses = result.map((r) => r.address);
    } catch {
      throw new Error(`Could not resolve hostname: ${hostname}`);
    }
    for (const addr of addresses) {
      if (/^\d{1,3}(\.\d{1,3}){3}$/.test(addr) && isPrivateIpv4(addr)) {
        throw new Error("Webhook URL resolves to a private IP address");
      }
      if (isPrivateIpv6(addr)) {
        throw new Error("Webhook URL resolves to a private IPv6 address");
      }
    }
  }
}
