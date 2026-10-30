import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { MemberHistoryView } from "@/components/member/MemberHistoryView";
import { getPublicCatalog } from "@/lib/publicData";
import { t } from "@/lib/strings";

async function findMember(slug: string) {
  const { members } = await getPublicCatalog();
  return members.find((m) => m.slug === slug);
}

export async function generateStaticParams() {
  const { members } = await getPublicCatalog();
  // Cache Components needs at least one param; an empty roster gets a placeholder that 404s.
  return members.length ? members.map((m) => ({ slug: m.slug })) : [{ slug: "__none__" }];
}

export async function generateMetadata(props: PageProps<"/members/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const member = await findMember(slug);
  return { title: member ? `${member.nickname} · ${member.group}` : "Member not found" };
}

// Members added in admin after the build have no prerendered page, so their
// slug is runtime data: read it inside <Suspense>. Prebuilt slugs still render
// fully at build time because the catalog read is cached.
export default function MemberPage(props: PageProps<"/members/[slug]">) {
  return (
    <Suspense
      fallback={
        <main className="mx-auto w-full max-w-xl py-16 text-center text-sm text-muted">
          <p role="status">{t.memberPage.loading}</p>
        </main>
      }
    >
      <Member params={props.params} />
    </Suspense>
  );
}

async function Member({ params }: { params: PageProps<"/members/[slug]">["params"] }) {
  const { slug } = await params;
  const member = await findMember(slug);
  if (!member) notFound();
  return <MemberHistoryView memberId={member.id} />;
}
