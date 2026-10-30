import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans_Thai, Plus_Jakarta_Sans } from "next/font/google";
import { LogProvider } from "@/components/LogProvider";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { sampleEvents, sampleMembers } from "@/data/fixture";
import { t } from "@/lib/strings";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const plexThai = IBM_Plex_Sans_Thai({
  variable: "--font-plex-thai",
  subsets: ["thai", "latin"],
  weight: ["400", "600"],
});

export const metadata: Metadata = {
  title: { default: t.appName, template: `%s · ${t.appName}` },
  description: "A fanmade tracker for BNK48 and CGM48 high touch events.",
};

export const viewport: Viewport = {
  themeColor: "#16161A",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  // M1: public data comes from a typed sample fixture. M2 swaps this for Supabase reads.
  return (
    <html lang="en" className={`${jakarta.variable} ${plexThai.variable} antialiased`}>
      <body className="flex min-h-dvh flex-col">
        <LogProvider events={sampleEvents} members={sampleMembers}>
          <SiteHeader viewer={{ kind: "guest" }} />
          {children}
          <SiteFooter />
        </LogProvider>
      </body>
    </html>
  );
}
