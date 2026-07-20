import { EngagementList } from "@/components/feature/self-service/engagement-list";
import { requireUser } from "@/lib/server/session";
import { getFavourites, getLikedYou } from "@/lib/server/services/member-self-service";

export default async function LikesPage() {
  const user = await requireUser();
  const [likedYou, favourites] = await Promise.all([getLikedYou(user.id), getFavourites(user.id)]);
  return (
    <>
      <EngagementList title="Liked you" eyebrow="ถูกใจคุณ · Likes" items={likedYou} empty="No likes yet. New likes will appear here." />
      <EngagementList title="Saved favourites" eyebrow="รายการโปรด · Favourites" items={favourites} empty="Profiles you favourite will appear here." />
    </>
  );
}
