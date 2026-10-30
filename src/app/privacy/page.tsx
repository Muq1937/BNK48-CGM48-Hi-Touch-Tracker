import type { Metadata } from "next";
import { CONTACT_EMAIL, t } from "@/lib/strings";

export const metadata: Metadata = { title: "Privacy policy" };

type PolicySection = {
  id: string;
  heading: string;
  body?: readonly string[];
  items?: readonly string[];
  after?: readonly string[];
};

export default function PrivacyPage() {
  const sections: readonly PolicySection[] = t.privacy.sections;
  const text = "mt-2 text-[15px] leading-relaxed text-body-2";

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-extrabold tracking-tight">{t.privacy.title}</h1>
      <p className="mt-1 text-sm text-muted">{t.privacy.updated}</p>
      <p className={`${text} mt-4`}>{t.privacy.intro}</p>

      {sections.map((s) => (
        <section key={s.id} aria-labelledby={s.id} className="mt-8">
          <h2 id={s.id} className="text-lg font-bold">
            {s.heading}
          </h2>
          {s.body?.map((p) => (
            <p key={p} className={text}>
              {p}
            </p>
          ))}
          {s.items && (
            <ul className={`${text} list-disc space-y-1.5 pl-5`}>
              {s.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          )}
          {s.after?.map((p) => (
            <p key={p} className={text}>
              {p}
            </p>
          ))}
        </section>
      ))}

      <section aria-labelledby="contact" className="mt-8">
        <h2 id="contact" className="text-lg font-bold">
          {t.privacy.contactHeading}
        </h2>
        <p className={text}>
          {t.privacy.contactBody}{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} className="font-bold text-ink underline underline-offset-2">
            {CONTACT_EMAIL}
          </a>
        </p>
      </section>
    </main>
  );
}
