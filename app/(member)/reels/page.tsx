import { ReelsExperience } from "@/components/feature/reels/reels-experience";
import { getReelFeed } from "@/lib/server/services/reels";
import { requireUser } from "@/lib/server/session";

export default async function ReelsPage() {
  const user = await requireUser();
  const data = await getReelFeed(user.id);
  return <ReelsExperience initialData={data} />;
}
