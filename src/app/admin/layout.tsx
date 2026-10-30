import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminChrome } from "@/components/admin/AdminChrome";
import { requireAdmin } from "@/lib/admin/data";
import { t } from "@/lib/strings";

export const metadata: Metadata = {
  title: t.admin.title,
  robots: { index: false, follow: false },
};

/**
 * Three layers keep admin private: src/proxy.ts answers 404 before rendering,
 * AdminGate checks again on the server, and RLS only lets admins write.
 * Nothing admin-specific sits outside the gate, so the static shell reveals nothing.
 */
export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
      <Suspense
        fallback={
          <p role="status" className="py-16 text-center text-sm text-muted">
            {t.admin.loading}
          </p>
        }
      >
        <AdminGate>{children}</AdminGate>
      </Suspense>
    </main>
  );
}

async function AdminGate({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return <AdminChrome>{children}</AdminChrome>;
}
