"use client";
import { useEffect } from "react";
type Props={width?:number|string;height?:number;slot?:string};
export function AdSlot({width="100%",height=280,slot}:Props){
 useEffect(()=>{if(!slot)return;try{(window as any).adsbygoogle=(window as any).adsbygoogle||[];(window as any).adsbygoogle.push({});}catch{}},[slot]);
 return <div className="relative flex w-full items-center justify-center overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950" style={{width,minWidth:0,height,minHeight:height}} aria-label="Advertisement">
  <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-400">Advertisement</span>
  {slot&&<ins className="adsbygoogle absolute inset-0 block" style={{width:"100%",height:"100%"}} data-ad-client={process.env.NEXT_PUBLIC_ADSENSE_CLIENT} data-ad-slot={slot} data-ad-format="auto" data-full-width-responsive="true"/>}
 </div>;
}