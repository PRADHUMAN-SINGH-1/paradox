export type Category = { slug: string; label: string; query: string };

export const CATEGORIES: Category[] = [
  { slug: 'coding-agents', label: 'Coding Agents', query: 'coding agent' },
  { slug: 'research-agents', label: 'Research Agents', query: 'research agent' },
  { slug: 'browser-agents', label: 'Browser Agents', query: 'browser agent' },
  { slug: 'automation-agents', label: 'Automation Agents', query: 'automation agent' },
  { slug: 'rag-agents', label: 'RAG Agents', query: 'RAG agent' },
  { slug: 'data-agents', label: 'Data Agents', query: 'data agent embeddings' },
  { slug: 'devops-agents', label: 'DevOps Agents', query: 'devops agent' },
  { slug: 'security-agents', label: 'Security Agents', query: 'security agent' },
  { slug: 'ai-assistants', label: 'AI Assistants', query: 'ai assistant agent' },
  { slug: 'mcp-tooling', label: 'MCP / Tooling', query: 'MCP agent' },
  { slug: 'multi-agent', label: 'Multi-Agent Systems', query: 'multi-agent' },
  { slug: 'computer-use', label: 'Computer Use', query: 'computer use agent' },
];

export type CatalogEntry = {
  owner: string;
  repo: string;
  category: string;
  summary: string;
  topics: string[];
};

export function fullName(entry: CatalogEntry): string {
  return `${entry.owner}/${entry.repo}`;
}
