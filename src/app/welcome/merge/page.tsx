import type { Metadata } from "next";
import { MergeView } from "@/components/auth/MergeView";

export const metadata: Metadata = { title: "Bring your guest log" };

// Reached after sign-in. Skips itself when this device has nothing new to add.
export default function MergePage() {
  return <MergeView />;
}
