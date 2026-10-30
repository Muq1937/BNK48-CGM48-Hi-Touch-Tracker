import type { Metadata } from "next";
import { WelcomeView } from "@/components/auth/WelcomeView";

export const metadata: Metadata = { title: "Sign in" };

// Never forced: guests land on the dashboard. This page is reached from "Sign in".
export default function WelcomePage() {
  return <WelcomeView />;
}
