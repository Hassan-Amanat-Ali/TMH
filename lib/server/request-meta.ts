type HeaderLike =
  | Headers
  | Record<string, string | string[] | undefined>
  | {
      get(name: string): string | null | undefined;
    };

function readHeader(headers: HeaderLike | undefined, name: string): string {
  if (!headers) return "";
  if ("get" in headers && typeof headers.get === "function") {
    return String(headers.get(name) || "");
  }
  const record = headers as Record<string, string | string[] | undefined>;
  const value = record[name] ?? record[name.toLowerCase()];
  return Array.isArray(value) ? String(value[0] || "") : String(value || "");
}

export function requestMetaFromHeaders(headers: HeaderLike | undefined) {
  const forwardedFor = readHeader(headers, "x-forwarded-for");
  const realIp = readHeader(headers, "x-real-ip");
  const ipAddress = forwardedFor.split(",")[0]?.trim() || realIp || "";
  const ipCountry = (
    readHeader(headers, "x-vercel-ip-country") ||
    readHeader(headers, "cf-ipcountry") ||
    readHeader(headers, "x-country-code")
  )
    .trim()
    .toUpperCase();

  const vpnHeader = (
    readHeader(headers, "x-vercel-ip-risk") ||
    readHeader(headers, "x-vpn-suspected") ||
    readHeader(headers, "x-ip-threat")
  ).toLowerCase();

  return {
    ipAddress,
    ipCountry: ipCountry || null,
    vpnSuspected: vpnHeader.includes("vpn") || vpnHeader.includes("proxy") || vpnHeader === "true",
  };
}
