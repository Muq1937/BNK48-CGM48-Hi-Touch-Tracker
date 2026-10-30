import { EventsWorkspace } from "@/components/admin/EventsWorkspace";
import { getAdminData } from "@/lib/admin/data";

export default async function AdminPage() {
  return <EventsWorkspace data={await getAdminData()} eventId={null} />;
}
