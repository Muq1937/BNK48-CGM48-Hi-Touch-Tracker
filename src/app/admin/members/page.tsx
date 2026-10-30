import { RosterManager } from "@/components/admin/RosterManager";
import { getAdminData } from "@/lib/admin/data";

export default async function AdminMembersPage() {
  const data = await getAdminData();
  const lineupCounts: Record<string, number> = {};
  for (const event of data.events) {
    for (const round of event.rounds) {
      for (const id of round.memberIds) lineupCounts[id] = (lineupCounts[id] ?? 0) + 1;
    }
  }
  return <RosterManager members={data.members} lineupCounts={lineupCounts} />;
}
