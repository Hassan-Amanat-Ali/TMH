import { EngagementList } from "@/components/feature/self-service/engagement-list";
import { requireUser } from "@/lib/server/session";
import { getVisitors } from "@/lib/server/services/member-self-service";

export default async function VisitorsPage() {
  const user = await requireUser();
  const visitors = await getVisitors(user.id);
  return <EngagementList title="Profile visitors" eyebrow="ผู้เข้าชม · Visitors" items={visitors} empty="Profile visits will appear here after members view you." />;
}
