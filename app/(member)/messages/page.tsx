import { MessagingView } from "@/components/feature/messaging/messaging-view";
import { requireUser } from "@/lib/server/session";
import { getConversationDetail, getOrCreateConversation, listConversations, markConversationRead } from "@/lib/server/services/messaging";

export default async function MessagesPage({ searchParams }: { searchParams: Promise<{ conversation?: string; with?: string; favourite?: string; label?: string; archived?: string }> }) {
  const user = await requireUser();
  const params = await searchParams;
  let conversationId = params.conversation;
  const filters = {
    favourite: params.favourite === "1",
    label: params.label || undefined,
    archived: params.archived === "1",
  };

  if (!conversationId && params.with) {
    try {
      const conversation = await getOrCreateConversation(user.id, params.with);
      conversationId = conversation.id;
    } catch {
      conversationId = undefined;
    }
  }

  const [conversations, active] = await Promise.all([
    listConversations(user.id, filters),
    conversationId ? getConversationDetail(user.id, conversationId) : Promise.resolve(null),
  ]);

  if (active) {
    await markConversationRead(user.id, active.id).catch(() => undefined);
  }

  return <MessagingView currentUserId={user.id} initialConversations={conversations} initialConversation={active} initialFilters={filters} />;
}
