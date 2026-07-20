import { MarketingHomePage } from "@/components/feature/content/home-page";
import { getDiscoveryData } from "@/lib/server/services/discovery";
import { getCurrentUser } from "@/lib/server/session";

export default async function HomePage() {
  const user = await getCurrentUser().catch(() => null);
  const discovery = await getDiscoveryData(user?.id);

  return <MarketingHomePage profiles={discovery.profiles} isSignedIn={Boolean(user)} />;
}
