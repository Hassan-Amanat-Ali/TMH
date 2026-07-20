import { VerificationForm } from "@/components/feature/self-service/verification-form";
import { requireUser } from "@/lib/server/session";
import { getOwnProfile } from "@/lib/server/services/member-self-service";

export default async function VerifyMePage() {
  const user = await requireUser();
  const profile = await getOwnProfile(user.id);
  return (
    <section className="px-4 py-8 sm:px-6 lg:px-8">
      <VerificationForm currentStatus={profile.verificationStatus} />
    </section>
  );
}
