import dynamic from "next/dynamic";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import opportunities from "@/data/verified_opportunities.json";
import AdSlot from "@/components/AdSlot";

export const revalidate = 43200;

type Opportunity = (typeof opportunities.opportunities)[number];

const toolComponents: Record<string, ReturnType<typeof dynamic>> = {
  calculator: dynamic(() => import("@/components/tools/CalculatorTool")),
  generator: dynamic(() => import("@/components/tools/GeneratorTool")),
  converter: dynamic(() => import("@/components/tools/ConverterTool")),
};

const findOpportunity = (slug: string) =>
  opportunities.opportunities.find((item) => item.slug === decodeURIComponent(slug));

export function generateStaticParams() {
  return opportunities.opportunities.map((item) => ({ slug: item.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const item = findOpportunity(slug);
  if (!item) return { title: "Tool not found — PARADOX" };
  return {
    title: `${item.query} — Free Tool | PARADOX`,
    description: `Use a free browser tool for ${item.query}. No account required.`,
    alternates: { canonical: `https://paradox.engineer/tools/${item.slug}` },
  };
}

export default async function ToolPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const item = findOpportunity(slug);
  if (!item) notFound();

  const Tool = toolComponents[item.toolId] ?? toolComponents.generator;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: item.query,
    url: `https://paradox.engineer/tools/${item.slug}`,
    description: `Free browser utility for ${item.query}.`,
    applicationCategory: "UtilitiesApplication",
    operatingSystem: "Any",
    isAccessibleForFree: true,
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  };

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-5 py-12 text-[var(--ink)]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <header className="mb-10">
        <p className="mb-3 font-mono text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
          PARADOX / {item.toolId}
        </p>
        <h1 className="max-w-4xl text-4xl font-semibold tracking-tight md:text-6xl">{item.query}</h1>
        <p className="mt-4 max-w-2xl text-lg text-[var(--muted)]">
          A focused browser utility. No account, no upload, no unnecessary steps.
        </p>
      </header>

      <section className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 shadow-sm">
          <div className="mb-5 flex items-center justify-between border-b border-[var(--line)] pb-4">
            <span className="font-mono text-xs uppercase tracking-wider text-[var(--muted)]">01 / TOOL</span>
            <span className="font-mono text-xs text-[var(--muted)]">FREE</span>
          </div>
          <Tool query={item.query} />
        </div>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5">
            <p className="font-mono text-xs uppercase tracking-wider text-[var(--muted)]">02 / CONTEXT</p>
            <p className="mt-3 text-sm leading-6">
              This page was selected because a public demand signal matched an existing PARADOX utility.
              {item.geo ? ` Signal geography: ${item.geo}.` : ""}
            </p>
          </div>
          <AdSlot />
        </aside>
      </section>

      <section className="mt-10 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6">
        <p className="font-mono text-xs uppercase tracking-wider text-[var(--muted)]">03 / WHY IT EXISTS</p>
        <div className="mt-4 grid gap-6 md:grid-cols-3">
          <div><strong>Useful</strong><p className="mt-1 text-sm text-[var(--muted)]">The page contains a working utility, not keyword-only copy.</p></div>
          <div><strong>Free</strong><p className="mt-1 text-sm text-[var(--muted)]">Core interaction requires no account or paid API.</p></div>
          <div><strong>Focused</strong><p className="mt-1 text-sm text-[var(--muted)]">One intent, one tool, one obvious action.</p></div>
        </div>
      </section>
    </main>
  );
}
