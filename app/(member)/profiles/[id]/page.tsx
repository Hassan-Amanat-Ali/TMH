import { notFound } from "next/navigation";
import { ProfileDetailView } from "@/components/feature/discovery/profile-detail-view";
import { getCurrentUser } from "@/lib/server/session";
import { getProfileDetail } from "@/lib/server/services/discovery";
import { getEconomyDashboard } from "@/lib/server/services/economy";

export default async function ProfileDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  const [profile, economy] = await Promise.all([
    getProfileDetail(id, user?.id),
    user ? getEconomyDashboard(user.id) : Promise.resolve(null),
  ]);

  if (!profile) {
    notFound();
  }

  return <ProfileDetailView profile={profile} gifts={economy?.gifts || []} giftBalance={economy?.balance || 0} />;
}
