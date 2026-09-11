import type { Metadata } from "next";
import { notFound } from "next/navigation";
import opportunities from "@/data/verified_opportunities.json";
import { ToolRenderer } from "@/components/tools/ToolRenderer";
import { AdSlot } from "@/components/AdSlot";

export const revalidate=86400;
type Opportunity=(typeof opportunities.opportunities)[number];

export function generateStaticParams(){return opportunities.opportunities.map(({slug})=>({slug}));}

async function getOpportunity(slug:string){return opportunities.opportunities.find(x=>x.slug===slug);}

export async function generateMetadata({params}:{params:Promise<{slug:string}>}):Promise<Metadata>{
 const {slug}=await params;const item=await getOpportunity(slug);if(!item)return {};
 return {title:`${item.query} — Free Tool | PARADOX`,description:`Free browser utility for ${item.query}. No account required.`,alternates:{canonical:`/tools/${item.slug}`}};
}

export default async function ToolPage({params}:{params:Promise<{slug:string}>}){
 const {slug}=await params;const item=await getOpportunity(slug);if(!item)notFound();
 const jsonLd={"@context":"https://schema.org","@type":"WebApplication",name:item.query,description:`Free browser utility for ${item.query}.`,applicationCategory:"UtilitiesApplication",operatingSystem:"Web Browser",isAccessibleForFree:true,offers:{"@type":"Offer",price:"0",priceCurrency:"USD"},url:`https://paradox.engineer/tools/${item.slug}`};
 return <main className="mx-auto max-w-6xl px-4 py-16">
  <header className="mb-10"><p className="font-mono text-xs uppercase tracking-[.16em] text-zinc-500">PARADOX / TOOL / {item.geo??"GLOBAL"}</p><h1 className="mt-3 text-4xl font-semibold tracking-tight md:text-6xl">{item.query}</h1><p className="mt-4 max-w-2xl text-zinc-500">A focused free utility generated from a verified public demand signal.</p></header>
  <section aria-label="Interactive tool" className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950"><ToolRenderer toolId={item.toolId} query={item.query}/></section>
  <section aria-label="Context" className="mt-8 grid gap-4 md:grid-cols-3">
   <article className="rounded-xl border p-5"><span className="font-mono text-xs text-zinc-500">DEMAND VELOCITY</span><strong className="mt-2 block font-mono text-2xl">{item.metrics.demandVelocity}</strong></article>
   <article className="rounded-xl border p-5"><span className="font-mono text-xs text-zinc-500">UTILITY INTENT</span><strong className="mt-2 block font-mono text-2xl">{item.metrics.utilityIntent}</strong></article>
   <article className="rounded-xl border p-5"><span className="font-mono text-xs text-zinc-500">MARKET</span><strong className="mt-2 block text-2xl">{item.geo??"Global"}</strong></article>
  </section>
  <section className="mt-8"><AdSlot height={280}/></section>
  <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(jsonLd)}}/>
 </main>;
}