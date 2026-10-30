import { Dashboard } from "@/components/dashboard/Dashboard";
import { t } from "@/lib/strings";

export default function HomePage() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 pt-8 pb-12 sm:px-6">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold tracking-widest text-muted uppercase">{t.groups}</p>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight sm:text-4xl">{t.hero.title}</h1>
          <p className="mt-2 max-w-xl text-body-2">{t.hero.body}</p>
        </div>
        <a
          href="#log"
          className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-xl bg-ink px-5 text-sm font-bold text-white"
        >
          {t.hero.cta}
        </a>
      </div>
      <Dashboard />
    </main>
  );
}
