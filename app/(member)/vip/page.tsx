import { VipCentre } from "@/components/feature/economy/vip-centre";
import { getEconomyDashboard } from "@/lib/server/services/economy";
import { requireUser } from "@/lib/server/session";

export default async function VipPage() {
  const user = await requireUser();
  const dashboard = await getEconomyDashboard(user.id);
  return <VipCentre initialData={dashboard} />;
}
