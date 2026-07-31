import { ProfileEditor } from "@/components/feature/self-service/profile-editor";
import { ProfileDetailView } from "@/components/feature/discovery/profile-detail-view";
import Link from "next/link";
import { requireUser } from "@/lib/server/session";
import { getOwnProfile } from "@/lib/server/services/member-self-service";
import { getProfileDetail } from "@/lib/server/services/discovery";

export default async function MyProfilePage({ searchParams }: { searchParams: Promise<{ edit?: string; preview?: string }> }) {
  const user = await requireUser();
  const params = await searchParams;
  if (params.edit === "1") {
    const profile = await getOwnProfile(user.id);
    return <ProfileEditor profile={profile} returnToView />;
  }
  const previewProfile = await getProfileDetail(user.id, user.id);
  if (previewProfile) {
    return (
      <ProfileDetailView
        profile={previewProfile}
        preview
        previewAction={(
          <Link href="/my-profile?edit=1" className="inline-flex min-h-11 w-full items-center justify-center rounded-full bg-burgundy px-5 py-2.5 text-sm font-bold !text-cream hover:bg-burgundy-dark">
            Edit profile
          </Link>
        )}
      />
    );
  }
  const profile = await getOwnProfile(user.id);
  return <ProfileEditor profile={profile} />;
}
