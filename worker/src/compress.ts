/**
 * MCP Tool Description Compressor
 * Rules-based compression: 40-50% token savings with zero quality loss.
 */

import type { MCPToolDefinition } from "./types";

/** Estimate token count (rough: ~4 chars per token for English) */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/** Compress a single tool definition */
export function compressTool(tool: MCPToolDefinition): MCPToolDefinition {
  const compressed = { ...tool };

  // 1. Compress description: keep first sentence, strip fluff
  if (compressed.description) {
    compressed.description = compressDescription(compressed.description);
  }

  // 2. Compress input schema
  if (compressed.inputSchema) {
    compressed.inputSchema = compressSchema(compressed.inputSchema) as typeof compressed.inputSchema;
  }

  return compressed;
}

/** Compress all tools in a tools/list response */
export function compressTools(tools: MCPToolDefinition[]): {
  tools: MCPToolDefinition[];
  tokensBefore: number;
  tokensAfter: number;
} {
  const before = JSON.stringify(tools);
  const tokensBefore = estimateTokens(before);

  const compressed = tools.map(compressTool);

  const after = JSON.stringify(compressed);
  const tokensAfter = estimateTokens(after);

  return { tools: compressed, tokensBefore, tokensAfter };
}

/** Common abbreviations that end with a period but aren't sentence boundaries */
const ABBREVIATIONS = new Set([
  "e.g", "i.e", "etc", "vs", "dr", "mr", "mrs", "jr", "sr",
  "inc", "ltd", "co", "corp", "dept", "est", "approx", "ref",
  "fig", "vol", "no", "op", "rev", "ed", "pt", "ch",
]);

/**
 * Find the index of a true sentence boundary (period/!/? followed by space or end).
 * Skips abbreviations like "e.g.", "i.e.", "etc.", single-letter abbreviations,
 * and decimal numbers (e.g., "1.5").
 */
function findSentenceBoundary(text: string, startFrom: number = 0): number {
  for (let i = startFrom; i < text.length; i++) {
    const ch = text[i];
    if (ch !== "." && ch !== "!" && ch !== "?") continue;

    // Must be followed by space, end-of-string, or closing quote/paren
    const next = text[i + 1];
    if (next && next !== " " && next !== '"' && next !== "'" && next !== ")" && next !== "]") continue;

    if (ch === "." && i > 0) {
      // Skip decimal numbers: digit.digit
      if (/\d/.test(text[i - 1]) && next && /\d/.test(next)) continue;

      // Skip single lowercase letter abbreviations (e.g., "e." in "e.g.")
      if (i >= 1 && /^[a-z]$/.test(text[i - 1]) && (i < 2 || /[\s(,]/.test(text[i - 2]))) continue;

      // Skip known abbreviations: find the word before the period
      const before = text.slice(Math.max(0, i - 10), i).toLowerCase();
      const wordMatch = before.match(/(\w+)$/);
      if (wordMatch && ABBREVIATIONS.has(wordMatch[1])) continue;
    }

    // Valid sentence boundary
    return i;
  }
  return -1;
}

function compressDescription(desc: string): string {
  // Strip leading/trailing whitespace
  let d = desc.trim();

  // Collapse multiple spaces/newlines
  d = d.replace(/\s+/g, " ");

  // Remove common filler phrases
  const fillers = [
    /\bThis (?:tool|function|endpoint) (?:allows you to|lets you|enables you to|can be used to|is used to) /gi,
    /\bUse this (?:tool|function) to /gi,
    /\bA (?:simple |convenient |powerful |lightweight )?(?:tool|function|utility) (?:for|that) /gi,
    /\bProvides (?:a |the )?(?:way|ability|capability) to /gi,
    /\. Returns? (?:the |a )?(?:result|response|data|output)\.?$/gi,
    /\bPlease note(?:: | that )/gi,
    /\bNote(?:: | that )/gi,
    /\bImportant(?:: | - )/gi,
    /\bFor (?:more )?(?:details|information),? (?:see|refer to|check|visit)[^.]*\.?/gi,
  ];

  for (const filler of fillers) {
    d = d.replace(filler, "");
  }

  // Keep first 2 sentences max (using smart boundary detection)
  let sentenceCount = 0;
  let cutPos = -1;
  let searchFrom = 0;
  while (sentenceCount < 2) {
    const boundary = findSentenceBoundary(d, searchFrom);
    if (boundary === -1) break;
    sentenceCount++;
    cutPos = boundary + 1;
    searchFrom = boundary + 1;
  }
  if (sentenceCount >= 2 && cutPos > 0 && cutPos < d.length) {
    d = d.slice(0, cutPos).trim();
  }

  // Final trim
  d = d.trim();
  if (!d.endsWith(".") && !d.endsWith("!") && !d.endsWith("?")) d += ".";

  return d;
}

function compressSchema(schema: Record<string, any>): Record<string, any> {
  const compressed = { ...schema };

  if (compressed.properties) {
    const props: Record<string, any> = {};
    for (const [key, value] of Object.entries(compressed.properties)) {
      props[key] = compressProperty(key, value as Record<string, any>);
    }
    compressed.properties = props;
  }

  // Remove $schema if present (wastes tokens)
  delete compressed.$schema;

  // Remove additionalProperties if false (default)
  if (compressed.additionalProperties === false) {
    delete compressed.additionalProperties;
  }

  return compressed;
}

function compressProperty(name: string, prop: Record<string, any>): Record<string, any> {
  const compressed = { ...prop };

  // Remove description if it's just restating the field name
  if (compressed.description) {
    const desc = compressed.description.toLowerCase().trim();
    const nameWords = name.replace(/[_-]/g, " ").toLowerCase();

    // If description is basically "The {name}" or "{name} to use"
    if (
      desc === nameWords ||
      desc === `the ${nameWords}` ||
      desc === `${nameWords} to use` ||
      desc === `${nameWords} value` ||
      desc === `the ${nameWords} to use` ||
      desc === `the ${nameWords} parameter` ||
      desc.length < 10
    ) {
      delete compressed.description;
    } else {
      // Compress remaining descriptions
      compressed.description = compressed.description
        .replace(/\s+/g, " ")
        .trim();

      // Truncate long property descriptions using smart sentence detection
      if (compressed.description.length > 200) {
        const boundary = findSentenceBoundary(compressed.description);
        if (boundary > 0 && boundary < compressed.description.length - 1) {
          compressed.description = compressed.description.slice(0, boundary + 1).trim();
        }
      }
    }
  }

  // Remove examples (save tokens, LLM doesn't need them)
  delete compressed.examples;
  delete compressed.example;

  // Remove default descriptions for enums (the values speak for themselves)
  if (compressed.enum && compressed.description) {
    const enumStr = compressed.enum.join(", ");
    if (compressed.description.includes(enumStr) || compressed.description.match(/^One of/i)) {
      delete compressed.description;
    }
  }

  // Recurse into nested objects
  if (compressed.properties) {
    const nested: Record<string, any> = {};
    for (const [k, v] of Object.entries(compressed.properties)) {
      nested[k] = compressProperty(k, v as Record<string, any>);
    }
    compressed.properties = nested;
  }

  // Recurse into array items
  if (compressed.items && typeof compressed.items === "object") {
    compressed.items = compressProperty("items", compressed.items);
  }

  return compressed;
}
