import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans_Thai, Plus_Jakarta_Sans } from "next/font/google";
import { LogProvider } from "@/components/LogProvider";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { getPublicCatalog } from "@/lib/publicData";
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

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Published events and roster (cached; sample fixture until Supabase is configured).
  const { events, members } = await getPublicCatalog();
  return (
    <html lang="en" className={`${jakarta.variable} ${plexThai.variable} antialiased`}>
      <body className="flex min-h-dvh flex-col">
        <LogProvider events={events} members={members}>
          <SiteHeader />
          {children}
          <SiteFooter />
        </LogProvider>
      </body>
    </html>
  );
}
