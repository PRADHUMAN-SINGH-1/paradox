"use client";
import dynamic from "next/dynamic";
const registry:Record<string,any>={
 "classroom-bingo":dynamic(()=>import("./BingoTool"),{ssr:false}),
 "word-search-puzzles":dynamic(()=>import("./WordSearchTool"),{ssr:false}),
 "random-teams":dynamic(()=>import("./RandomTeamsTool"),{ssr:false}),
 "decision-wheel":dynamic(()=>import("./DecisionWheelTool"),{ssr:false})
};
export function ToolRenderer({toolId,query}:{toolId?:string;query:string}){const Tool=toolId?registry[toolId]:null;return Tool?<Tool query={query}/>:<div className="rounded-xl border border-dashed p-8"><p className="font-mono text-xs uppercase text-zinc-500">TOOL NOT MAPPED</p><p className="mt-2">This opportunity is not published until an implemented interactive component is mapped.</p></div>}