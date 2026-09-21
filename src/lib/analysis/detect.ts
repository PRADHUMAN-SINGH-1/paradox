import type { Detection, FileHit } from './types.ts';
import { redactSensitiveText } from './sanitize.ts';

const RULES: Array<{ name: string; category: Detection['category']; test: RegExp }> = [
  { name: 'OpenAI', category: 'model', test: /openai|gpt-4|gpt-3\.5|text-embedding-3/i },
  { name: 'Anthropic', category: 'model', test: /@anthropic-ai|anthropic|claude/i },
  { name: 'Gemini / Google AI', category: 'model', test: /@google\/genai|google-generativeai|gemini-|generativelanguage\.googleapis/i },
  { name: 'Hugging Face', category: 'model', test: /huggingface|transformers|hf_hub/i },
  { name: 'Ollama', category: 'model', test: /ollama/i },
  { name: 'Mistral', category: 'model', test: /mistral/i },
  { name: 'Groq', category: 'model', test: /groq/i },
  { name: 'OpenRouter', category: 'model', test: /openrouter/i },
  { name: 'LiteLLM', category: 'framework', test: /litellm/i },
  { name: 'LangChain', category: 'framework', test: /langchain/i },
  { name: 'LangGraph', category: 'framework', test: /langgraph/i },
  { name: 'LlamaIndex', category: 'framework', test: /llama-index|llama_index|llamaindex/i },
  { name: 'MCP', category: 'tool', test: /modelcontextprotocol|@modelcontextprotocol|mcp[_-]server/i },
  { name: 'Browser automation', category: 'capability', test: /playwright|puppeteer|selenium|browser-use|chromedp/i },
  { name: 'RAG', category: 'capability', test: /\brag\b|retrieval[- ]augmented|vectorstore|vector.store/i },
  { name: 'Vector database', category: 'tool', test: /chromadb|pinecone|weaviate|qdrant|faiss|pgvector/i },
  { name: 'Tool calling', category: 'capability', test: /tool[_-]?call|function[_-]?call|tools:\s*\[/i },
];

function snippet(text: string, re: RegExp): string {
  const m = text.match(re);
  if (!m || m.index == null) return '';
  const start = Math.max(0, m.index - 40);
  return text.slice(start, start + 120).replace(/\s+/g, ' ').trim();
}

export function detectSignals(files: FileHit[]): Detection[] {
  const out: Detection[] = [];
  const seen = new Set<string>();
  for (const file of files) {
    // README/docs are documentation evidence, not implementation evidence.
    // A provider/model name appearing only there must not become a detected
    // implementation signal.
    if (/^readme(?:\.|$)/i.test(file.path) || /(?:^|\/)docs?(?:\/|$)/i.test(file.path)) continue;
    for (const rule of RULES) {
      if (seen.has(rule.name)) continue;
      if (rule.test.test(file.content) || rule.test.test(file.path)) {
        seen.add(rule.name);
        out.push({
          name: rule.name,
          category: rule.category,
          file: file.path,
          evidence: snippet(file.content, rule.test) || file.path,
        });
      }
    }
  }
  return out;
}
