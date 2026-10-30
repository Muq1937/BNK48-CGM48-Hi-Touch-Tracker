import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MemberHistoryView } from "@/components/member/MemberHistoryView";
import { getPublicCatalog } from "@/lib/publicData";

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

export default async function MemberPage(props: PageProps<"/members/[slug]">) {
  const { slug } = await props.params;
  const member = await findMember(slug);
  if (!member) notFound();
  return <MemberHistoryView memberId={member.id} />;
}
