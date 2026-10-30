import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MemberHistoryView } from "@/components/member/MemberHistoryView";
import { sampleMembers } from "@/data/fixture";

// M1 reads the sample fixture. M2 swaps this for a Supabase lookup.
function findMember(slug: string) {
  return sampleMembers.find((m) => m.slug === slug);
}

export function generateStaticParams() {
  return sampleMembers.map((m) => ({ slug: m.slug }));
}

export async function generateMetadata(props: PageProps<"/members/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const member = findMember(slug);
  return { title: member ? `${member.nickname} · ${member.group}` : "Member not found" };
}

export default async function MemberPage(props: PageProps<"/members/[slug]">) {
  const { slug } = await props.params;
  const member = findMember(slug);
  if (!member) notFound();
  return <MemberHistoryView memberId={member.id} />;
}
