import { notFound } from "next/navigation";
import { ProfileDetailView } from "@/components/feature/discovery/profile-detail-view";
import { getCurrentUser } from "@/lib/server/session";
import { getProfileDetail } from "@/lib/server/services/discovery";

export default async function ProfileDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  const profile = await getProfileDetail(id, user?.id);

  if (!profile) {
    notFound();
  }

  return <ProfileDetailView profile={profile} />;
}
