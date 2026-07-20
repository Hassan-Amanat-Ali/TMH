import { SearchExperience } from "@/components/feature/discovery/search-experience";
import { getCurrentUser } from "@/lib/server/session";
import { type DiscoveryFilters, getDiscoveryData } from "@/lib/server/services/discovery";
import type { Gender } from "@/lib/prisma/client";

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function parseAgeRange(value?: string): Pick<DiscoveryFilters, "minAge" | "maxAge"> {
  if (!value || value === "any") return {};
  const [min, max] = value.split("-").map((part) => Number(part));
  return {
    ...(Number.isFinite(min) ? { minAge: min } : {}),
    ...(Number.isFinite(max) ? { maxAge: max } : {}),
  };
}

function parseFilters(params: Record<string, string | string[] | undefined>): DiscoveryFilters {
  const gender = first(params.gender);
  const countryCode = first(params.country);
  const age = first(params.age);

  return {
    gender: gender === "WOMAN" || gender === "LADYBOY" || gender === "MAN" || gender === "OTHER" ? (gender as Gender) : "ALL",
    countryCode: countryCode || undefined,
    ...parseAgeRange(age),
    onlineOnly: first(params.online) === "1",
    verifiedOnly: first(params.verified) === "1",
    newOnly: first(params.new) === "1",
  };
}

export default async function SearchPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await getCurrentUser();
  const params = await searchParams;
  const filters = parseFilters(params);
  const data = await getDiscoveryData(user?.id, filters);

  return <SearchExperience profiles={data.profiles} gridAds={data.gridAds} swipeAds={data.swipeAds} initialFilters={filters} isSignedIn={Boolean(user)} />;
}
