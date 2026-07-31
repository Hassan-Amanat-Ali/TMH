import { ProfileEditor } from "@/components/feature/self-service/profile-editor";
import { ProfileDetailView } from "@/components/feature/discovery/profile-detail-view";
import { requireUser } from "@/lib/server/session";
import { getOwnProfile } from "@/lib/server/services/member-self-service";
import { getProfileDetail } from "@/lib/server/services/discovery";

export default async function MyProfilePage({ searchParams }: { searchParams: Promise<{ preview?: string }> }) {
  const user = await requireUser();
  const params = await searchParams;
  if (params.preview === "1") {
    const previewProfile = await getProfileDetail(user.id, user.id);
    if (previewProfile) return <ProfileDetailView profile={previewProfile} preview />;
  }
  const profile = await getOwnProfile(user.id);
  return <ProfileEditor profile={profile} />;
}
