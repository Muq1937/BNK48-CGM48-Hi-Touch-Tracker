// SAMPLE DATA ONLY. These are placeholder names and invented events used for
// development until M2 swaps this fixture for public reads from Supabase.
// They are not real BNK48 / CGM48 rosters or events. The real roster is
// entered by an admin from the official sites.

import type { PublicEvent, PublicMember } from "@/lib/types";

const bnk = (slug: string, nickname: string): PublicMember => ({
  id: `sample-bnk-${slug}`,
  slug,
  nickname,
  group: "BNK48",
  status: "active",
});

const cgm = (slug: string, nickname: string): PublicMember => ({
  id: `sample-cgm-${slug}`,
  slug,
  nickname,
  group: "CGM48",
  status: "active",
});

export const sampleMembers: PublicMember[] = [
  bnk("fah", "Fah"),
  bnk("mint", "Mint"),
  bnk("ploy", "Ploy"),
  bnk("nam", "Nam"),
  bnk("kaew", "Kaew"),
  bnk("pim", "Pim"),
  cgm("bow", "Bow"),
  cgm("jan", "Jan"),
  cgm("fern", "Fern"),
  cgm("praew", "Praew"),
];

const m = (slug: string) => {
  const member = sampleMembers.find((x) => x.slug === slug);
  if (!member) throw new Error(`Unknown sample member: ${slug}`);
  return member.id;
};

export const sampleEvents: PublicEvent[] = [
  {
    id: "sample-event-3",
    name: "Sample Joint High Touch",
    date: "2026-10-18",
    venue: "Sample Convention Hall",
    city: "Bangkok",
    scope: "JOINT",
    rounds: [
      { id: "sample-e3-r1", position: 1, memberIds: [m("fah"), m("bow"), m("ploy")] },
      { id: "sample-e3-r2", position: 2, memberIds: [m("mint"), m("jan"), m("fern")] },
      { id: "sample-e3-r3", position: 3, memberIds: [m("nam"), m("praew"), m("pim"), m("kaew")] },
    ],
  },
  {
    id: "sample-event-2",
    name: "Sample CGM48 High Touch",
    date: "2026-09-20",
    venue: "Sample Mall Hall",
    city: "Chiang Mai",
    scope: "CGM48",
    rounds: [
      { id: "sample-e2-r1", position: 1, memberIds: [m("bow"), m("jan")] },
      { id: "sample-e2-r2", position: 2, memberIds: [m("fern"), m("praew")] },
    ],
  },
  {
    id: "sample-event-1",
    name: "Sample BNK48 High Touch",
    date: "2026-08-16",
    venue: "Sample Exhibition Centre",
    city: "Bangkok",
    scope: "BNK48",
    rounds: [
      { id: "sample-e1-r1", position: 1, memberIds: [m("fah"), m("mint"), m("ploy")] },
      { id: "sample-e1-r2", position: 2, memberIds: [m("nam"), m("kaew")] },
      { id: "sample-e1-r3", position: 3, memberIds: [m("pim"), m("fah"), m("nam")] },
    ],
  },
];
