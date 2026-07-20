import { MarketingHomePage } from "@/components/feature/content/home-page";
import { getDiscoveryData } from "@/lib/server/services/discovery";
import { getReelFeed } from "@/lib/server/services/reels";
import { getCurrentUser } from "@/lib/server/session";

export default async function HomePage() {
  const user = await getCurrentUser().catch(() => null);
  const [discovery, reelFeed] = await Promise.all([
    getDiscoveryData(user?.id),
    getReelFeed(user?.id, 4),
  ]);

  return <MarketingHomePage profiles={discovery.profiles} reels={reelFeed.reels} isSignedIn={Boolean(user)} />;
}
