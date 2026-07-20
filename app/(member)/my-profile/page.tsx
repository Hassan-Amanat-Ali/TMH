import { ProfileEditor } from "@/components/feature/self-service/profile-editor";
import { requireUser } from "@/lib/server/session";
import { getOwnProfile } from "@/lib/server/services/member-self-service";

export default async function MyProfilePage() {
  const user = await requireUser();
  const profile = await getOwnProfile(user.id);
  return <ProfileEditor profile={profile} />;
}
