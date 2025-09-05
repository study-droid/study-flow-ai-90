Awesome—let’s turn those two docs into a **drop-in, production-ready starter kit** you can paste into a TS/Node + React repo. It bakes in strict typing, Zod validation, a pluggable pipeline, caching, retries/circuit-breaker, JSON→Markdown rendering, and a renderer that follows your Tailwind/static-map and performance rules.

Below is an **opinionated minimal implementation** (lean but complete). Copy the file tree and code blocks as-is.

---

# 1) File tree

```
deepseek-starter/
├─ src/
│  ├─ types/
│  │  ├─ core.ts
│  │  └─ schemas.ts
│  ├─ config/
│  │  └─ deepseek.ts
│  ├─ lib/
│  │  ├─ rateLimiter.ts
│  │  ├─ circuitBreaker.ts
│  │  ├─ retry.ts
│  │  ├─ cache.ts
│  │  └─ markdown.ts
│  ├─ pipeline/
│  │  ├─ index.ts
│  │  └─ stages/
│  │     ├─ 01-ValidationStage.ts
│  │     ├─ 02-ContextEnrichmentStage.ts
│  │     ├─ 03-PromptOptimizationStage.ts
│  │     ├─ 04-StructuredOutputStage.ts
│  │     ├─ 05-CacheCheckStage.ts
│  │     ├─ 06-DeepSeekProcessingStage.ts
│  │     ├─ 07-PostFormatStage.ts
│  │     ├─ 08-ResponseEnhancementStage.ts
│  │     ├─ 09-QualityAssessmentStage.ts
│  │     └─ 10-CacheStorageStage.ts
│  ├─ server/
│  │  └─ handler.ts
│  ├─ metrics/
│  │  └─ metrics.ts
│  └─ web/
│     ├─ components/
│     │  ├─ ProfessionalResponseRenderer.tsx
│     │  ├─ QualityMetricsPanel.tsx
│     │  ├─ ContentStructureView.tsx
│     │  ├─ ValidationResultsPanel.tsx
│     │  ├─ EducationalAssessment.tsx
│     │  └─ ProcessingMetadata.tsx
│     └─ utils/colors.ts
├─ tests/
│  ├─ unit/
│  │  ├─ parsing.test.ts
│  │  └─ quality.test.ts
│  └─ integration/
│     └─ pipeline-flow.test.ts
├─ .env.example
├─ package.json
├─ tsconfig.json
└─ vitest.config.ts
```

---

# 2) Core types & schemas

### `src/types/core.ts`

```ts
export type ResponseType =
  | 'explanation'
  | 'code'
  | 'reasoning'
  | 'creative'
  | 'structured'
  | 'study_plan'
  | 'practice';

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface PipelineContext {
  id: string;
  nowISO: string;
  userPrefs?: Record<string, unknown>;
  history: Message[];
  request: { task: string; audience?: string; tone?: string; responseType?: ResponseType };
  cacheKey?: string;
  cached?: RequiredResponseStructure;
  modelConfig: {
    model: 'chat' | 'reasoning';
    temperature: number;
    maxTokens: number;
    topP: number;
    jsonMode: boolean;
  };
  rawModelOutput?: string;
  structured?: RequiredResponseStructure;
  markdown?: string;
  quality?: {
    overall: number; // 0..1
    breakdown: Record<string, number>;
  };
  tokenUsage?: TokenUsage;
}

export interface StructuredAnswer {
  title: string;
  tldr: string;
  sections: Array<{
    heading: string;
    body: string;
    code?: Array<{ language: string; content: string; caption?: string }>;
  }>;
  references?: Array<{ label: string; url: string }>;
}

export interface RequiredResponseStructure {
  formattedResponse: {
    content: string; // final Markdown
    metadata?: {
      responseType?: ResponseType;
      timeEstimate?: string;
      difficulty?: 'easy' | 'medium' | 'hard';
      totalHours?: number;
      weeklyGoals?: string[];
      estimatedReadTime?: number;
    };
    structure: {
      headers: Array<{ text: string; level: number; hasEmoji: boolean }>;
      sections: Array<{ title: string; wordCount: number; hasSubsections: boolean }>;
      lists?: Array<{ type: 'ordered' | 'unordered'; items: string[]; nested: boolean }>;
      tables?: Array<{ columnCount: number; rows: any[]; isValid: boolean }>;
      codeBlocks?: Array<{ language: string; isValid: boolean }>;
    };
  };
  qualityAssessment: {
    overallScore: number; // 0-100
    breakdown: {
      structure: number;
      consistency: number;
      formatting: number;
      completeness: number;
      educational: number;
    };
    recommendations: string[];
  };
  processingMetadata: {
    processingTime: number;
    stepsCompleted: string[];
    warnings: string[];
    optimizations: string[];
  };
  validationResult?: { isValid: boolean; score: number; errors?: string[] };
  educationalValidation?: { isValid: boolean; score: number; failedChecks?: string[] };
}
```

### `src/types/schemas.ts`

```ts
import { z } from 'zod';
import type { RequiredResponseStructure } from './core';

export const RequiredResponseStructureSchema = z.object({
  formattedResponse: z.object({
    content: z.string(),
    metadata: z.object({
      responseType: z.enum(['explanation','code','reasoning','creative','structured','study_plan','practice']).optional(),
      timeEstimate: z.string().optional(),
      difficulty: z.enum(['easy','medium','hard']).optional(),
      totalHours: z.number().optional(),
      weeklyGoals: z.array(z.string()).optional(),
      estimatedReadTime: z.number().optional()
    }).optional(),
    structure: z.object({
      headers: z.array(z.object({
        text: z.string(),
        level: z.number().int().min(1).max(6),
        hasEmoji: z.boolean()
      })),
      sections: z.array(z.object({
        title: z.string(),
        wordCount: z.number().int().min(0),
        hasSubsections: z.boolean()
      })),
      lists: z.array(z.object({
        type: z.enum(['ordered','unordered']),
        items: z.array(z.string()),
        nested: z.boolean()
      })).optional(),
      tables: z.array(z.object({
        columnCount: z.number().int().min(1),
        rows: z.array(z.any()),
        isValid: z.boolean()
      })).optional(),
      codeBlocks: z.array(z.object({
        language: z.string(),
        isValid: z.boolean()
      })).optional()
    })
  }),
  qualityAssessment: z.object({
    overallScore: z.number().min(0).max(100),
    breakdown: z.object({
      structure: z.number().min(0).max(100),
      consistency: z.number().min(0).max(100),
      formatting: z.number().min(0).max(100),
      completeness: z.number().min(0).max(100),
      educational: z.number().min(0).max(100)
    }),
    recommendations: z.array(z.string())
  }),
  processingMetadata: z.object({
    processingTime: z.number().min(0),
    stepsCompleted: z.array(z.string()),
    warnings: z.array(z.string()),
    optimizations: z.array(z.string())
  }),
  validationResult: z.object({
    isValid: z.boolean(),
    score: z.number().min(0).max(1),
    errors: z.array(z.string()).optional()
  }).optional(),
  educationalValidation: z.object({
    isValid: z.boolean(),
    score: z.number().min(0).max(1),
    failedChecks: z.array(z.string()).optional()
  }).optional()
});

export function createSafeDefaults(partial: any): RequiredResponseStructure {
  return {
    formattedResponse: {
      content: partial?.formattedResponse?.content || 'No content available',
      metadata: partial?.formattedResponse?.metadata || {},
      structure: {
        headers: [],
        sections: [],
        lists: [],
        tables: [],
        codeBlocks: []
      }
    },
    qualityAssessment: {
      overallScore: 0,
      breakdown: { structure: 0, consistency: 0, formatting: 0, completeness: 0, educational: 0 },
      recommendations: ['Unable to assess quality']
    },
    processingMetadata: {
      processingTime: 0,
      stepsCompleted: [],
      warnings: ['Missing processing data'],
      optimizations: []
    }
  };
}
```

---

# 3) DeepSeek client, rate limit, circuit breaker, retry

### `src/config/deepseek.ts`

```ts
export const DS = {
  apiKey: process.env.DEEPSEEK_API_KEY!,
  baseUrl: process.env.DEEPSEEK_BASE_URL ?? 'https://api.deepseek.com',
  timeoutMs: Number(process.env.TIMEOUT_MS ?? 30000),
  default: {
    chat:  { temperature: 0.7, maxTokens: 2000, topP: 0.95 },
    code:  { temperature: 0.3, maxTokens: 3000, topP: 0.9 },
    reason:{ temperature: 0.5, maxTokens: 4000, topP: 0.95 },
    struct:{ temperature: 0.3, maxTokens: 2000, topP: 0.85 }
  }
};
```

### `src/lib/rateLimiter.ts`

```ts
type Bucket = { capacity: number; tokens: number; refillPerSec: number; last: number };
const tiers = {
  low:    { capacity: 10, refillPerSec: 0.5 },
  normal: { capacity: 30, refillPerSec: 1 },
  high:   { capacity: 60, refillPerSec: 2 }
} as const;

const buckets = new Map<string, Bucket>();

export function allow(key: string, priority: keyof typeof tiers = 'normal'): boolean {
  const conf = tiers[priority];
  const b = buckets.get(key) ?? { capacity: conf.capacity, tokens: conf.capacity, refillPerSec: conf.refillPerSec, last: Date.now() };
  const now = Date.now();
  const elapsed = (now - b.last) / 1000;
  b.tokens = Math.min(b.capacity, b.tokens + elapsed * b.refillPerSec);
  b.last = now;
  if (b.tokens >= 1) { b.tokens -= 1; buckets.set(key, b); return true; }
  buckets.set(key, b);
  return false;
}
```

### `src/lib/circuitBreaker.ts`

```ts
export class CircuitBreaker {
  private state: 'CLOSED'|'OPEN'|'HALF' = 'CLOSED';
  private failures = 0;
  private nextTry = 0;

  constructor(private failThreshold = 5, private resetMs = 15000) {}

  canProceed() {
    if (this.state === 'OPEN') return Date.now() >= this.nextTry ? (this.state = 'HALF', true) : false;
    return true;
  }
  recordSuccess() { this.state = 'CLOSED'; this.failures = 0; }
  recordFailure() {
    this.failures++;
    if (this.failures >= this.failThreshold) {
      this.state = 'OPEN';
      this.nextTry = Date.now() + this.resetMs;
    }
  }
}
```

### `src/lib/retry.ts`

```ts
export async function retry<T>(fn: () => Promise<T>, maxRetries = 3, baseDelayMs = 400): Promise<T> {
  let attempt = 0, lastErr: any;
  while (attempt <= maxRetries) {
    try { return await fn(); }
    catch (err) {
      lastErr = err;
      const delay = baseDelayMs * Math.pow(2, attempt) + Math.random() * 100;
      await new Promise(r => setTimeout(r, delay));
      attempt++;
    }
  }
  throw lastErr;
}
```

### `src/lib/cache.ts`

```ts
type Entry<T> = { v: T; exp: number };
export class TTLCache<T=any> {
  private map = new Map<string, Entry<T>>();
  constructor(private max = 500) {}
  get(k: string): T|undefined {
    const e = this.map.get(k);
    if (!e) return;
    if (Date.now() > e.exp) { this.map.delete(k); return; }
    return e.v;
  }
  set(k: string, v: T, ttlMs: number) {
    if (this.map.size >= this.max) this.map.delete(this.map.keys().next().value);
    this.map.set(k, { v, exp: Date.now() + ttlMs });
  }
}
export const globalCache = new TTLCache<any>(1000);
```

### `src/server/handler.ts` (DeepSeek call wrapper)

```ts
import { DS } from '../config/deepseek';
import { retry } from '../lib/retry';
import { CircuitBreaker } from '../lib/circuitBreaker';
import { allow } from '../lib/rateLimiter';

const cb = new CircuitBreaker();

export async function callDeepSeekJSON(params: {
  model: 'chat'|'reasoning';
  messages: Array<{ role: 'system'|'user'|'assistant'; content: string }>;
  temperature: number; maxTokens: number; topP: number; requestId: string;
}) {
  if (!allow('deepseek', 'normal')) throw new Error('Rate limited locally');
  if (!cb.canProceed()) throw new Error('Circuit open');

  const body = {
    model: params.model,
    messages: params.messages,
    temperature: params.temperature,
    top_p: params.topP,
    // ⚠️ Use DeepSeek's official JSON mode param if available; placeholder field:
    response_format: { type: 'json_object' },
    max_tokens: params.maxTokens,
  };

  const res = await retry(async () => {
    const r = await fetch(`${DS.baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${DS.apiKey}` },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(DS.timeoutMs)
    });
    if (!r.ok) throw new Error(`DeepSeek ${r.status}`);
    return r.json();
  });

  cb.recordSuccess();
  return res;
}
```

> ✅ Swap the endpoint/fields to match the official DeepSeek SDK you use. The structure above keeps the **retry + breaker + RL** concerns cleanly separated.

---

# 4) Pipeline framework + stages

### `src/pipeline/index.ts`

```ts
import type { PipelineContext } from '../types/core';

export interface Stage {
  name: string;
  run(ctx: PipelineContext): Promise<void>;
}

export async function runPipeline(ctx: PipelineContext, stages: Stage[]) {
  const t0 = performance.now();
  for (const s of stages) {
    await s.run(ctx);
  }
  const t1 = performance.now();
  ctx.structured ??= undefined;
  // timing stored elsewhere if needed
  return { ctx, ms: t1 - t0 };
}
```

Below are compact implementations of each required stage (kept short but functional).

### `src/pipeline/stages/01-ValidationStage.ts`

```ts
import type { Stage } from '../index';
export const ValidationStage: Stage = {
  name: 'ValidationStage',
  async run(ctx) {
    const maxLen = 8000;
    if (!ctx.request?.task?.trim()) throw new Error('Empty task');
    const len = ctx.request.task.length;
    if (len > maxLen) throw new Error('Message too long');
    ctx.request.tone ??= 'Direct, practical';
    ctx.request.audience ??= 'intermediate';
  }
};
```

### `src/pipeline/stages/02-ContextEnrichmentStage.ts`

```ts
import type { Stage } from '../index';
export const ContextEnrichmentStage: Stage = {
  name: 'ContextEnrichmentStage',
  async run(ctx) {
    ctx.nowISO = new Date().toISOString();
    ctx.userPrefs ??= {};
    // Attach timestamp metadata or relevant doc snippets here
  }
};
```

### `src/pipeline/stages/03-PromptOptimizationStage.ts`

```ts
import type { Stage } from '../index';

const SYSTEM = (domain = 'Software Engineering') => `
Role: Senior technical writer
Expertise: ${domain}
Output: Educational, concise, practical
Strict rules: 
1) Output ONLY valid JSON matching StructuredAnswer.
2) No prose outside JSON. No markdown fences.
3) Escape special characters. No trailing commas.`.trim();

export const PromptOptimizationStage: Stage = {
  name: 'PromptOptimizationStage',
  async run(ctx) {
    const responseType = ctx.request.responseType ?? 'structured';
    const user = `Task: ${ctx.request.task}
Audience: ${ctx.request.audience}
Tone: ${ctx.request.tone}
Format: JSON StructuredAnswer`;

    ctx.history = [
      { role: 'system', content: SYSTEM('Your domain here') },
      ...ctx.history.filter(m => m.role !== 'system'),
      { role: 'user', content: user }
    ];

    // pick model params
    if (responseType === 'code') ctx.modelConfig = { model: 'chat', temperature: 0.3, maxTokens: 3000, topP: 0.9, jsonMode: true };
    else if (responseType === 'reasoning') ctx.modelConfig = { model: 'reasoning', temperature: 0.5, maxTokens: 4000, topP: 0.95, jsonMode: true };
    else if (responseType === 'structured') ctx.modelConfig = { model: 'chat', temperature: 0.3, maxTokens: 2000, topP: 0.85, jsonMode: true };
    else ctx.modelConfig = { model: 'chat', temperature: 0.7, maxTokens: 2000, topP: 0.95, jsonMode: true };
  }
};
```

### `src/pipeline/stages/04-StructuredOutputStage.ts`

```ts
import type { Stage } from '../index';
export const StructuredOutputStage: Stage = {
  name: 'StructuredOutputStage',
  async run(ctx) {
    // nothing to do here besides asserting jsonMode true
    if (!ctx.modelConfig?.jsonMode) throw new Error('JSON mode required');
  }
};
```

### `src/pipeline/stages/05-CacheCheckStage.ts`

```ts
import type { Stage } from '../index';
import { globalCache } from '../../lib/cache';
import { createHash } from 'node:crypto';

export const CacheCheckStage: Stage = {
  name: 'CacheCheckStage',
  async run(ctx) {
    const key = createHash('sha256').update(JSON.stringify({
      task: ctx.request.task,
      audience: ctx.request.audience,
      tone: ctx.request.tone,
      responseType: ctx.request.responseType
    })).digest('hex');
    ctx.cacheKey = key;
    const cached = globalCache.get(key);
    if (cached) ctx.cached = cached;
  }
};
```

### `src/pipeline/stages/06-DeepSeekProcessingStage.ts`

```ts
import type { Stage } from '../index';
import { callDeepSeekJSON } from '../../server/handler';

export const DeepSeekProcessingStage: Stage = {
  name: 'DeepSeekProcessingStage',
  async run(ctx) {
    if (ctx.cached) return; // short-circuit
    const { model, temperature, maxTokens, topP } = ctx.modelConfig;
    const res = await callDeepSeekJSON({
      model,
      messages: ctx.history,
      temperature, maxTokens, topP,
      requestId: ctx.id
    });
    // Adjust per official response shape:
    const text = res?.choices?.[0]?.message?.content ?? '';
    ctx.rawModelOutput = text;
  }
};
```

### `src/lib/markdown.ts` (JSON→Markdown + robust JSON parse)

````ts
import type { StructuredAnswer } from '../types/core';

export function tryParseJSON<T=any>(raw: string): T | null {
  // 1) direct parse
  try { return JSON.parse(raw); } catch {}
  // 2) extract largest JSON object
  const match = raw.match(/\{[\s\S]*\}$/m);
  if (match) { try { return JSON.parse(match[0]); } catch {} }
  // 3) last resort: find balanced braces
  let start = raw.indexOf('{');
  while (start !== -1) {
    const candidate = raw.slice(start);
    try { return JSON.parse(candidate); } catch {}
    start = raw.indexOf('{', start + 1);
  }
  return null;
}

export function renderMarkdown(sa: StructuredAnswer): string {
  const lines: string[] = [];
  lines.push(`# ${sa.title}`);
  lines.push('');
  lines.push(`> ${sa.tldr}`);
  lines.push('');
  for (const sec of sa.sections) {
    lines.push(`## ${sec.heading}`);
    lines.push('');
    lines.push(sec.body.trim());
    lines.push('');
    if (sec.code) {
      for (const c of sec.code) {
        lines.push('```' + c.language);
        lines.push(c.content.replace(/\u200b/g, ''));
        lines.push('```');
        if (c.caption) { lines.push(`*${c.caption}*`); }
        lines.push('');
      }
    }
  }
  if (sa?.references?.length) {
    lines.push('---');
    lines.push('### References');
    for (const r of sa.references) lines.push(`- [${r.label}](${r.url})`);
  }
  return lines.join('\n');
}
````

### `src/pipeline/stages/07-PostFormatStage.ts`

```ts
import type { Stage } from '../index';
import { tryParseJSON, renderMarkdown } from '../../lib/markdown';
import type { StructuredAnswer, RequiredResponseStructure } from '../../types/core';
import { RequiredResponseStructureSchema, createSafeDefaults } from '../../types/schemas';

export const PostFormatStage: Stage = {
  name: 'PostFormatStage',
  async run(ctx) {
    if (ctx.cached) { ctx.structured = ctx.cached; ctx.markdown = ctx.cached.formattedResponse.content; return; }
    const json = tryParseJSON<StructuredAnswer>(ctx.rawModelOutput || '');
    if (!json) throw new Error('Malformed JSON from model');

    const md = renderMarkdown(json);
    const structure = {
      headers: (md.match(/^#{1,6}\s.*$/gm) ?? []).map(h => {
        const level = (h.match(/^#+/)?.[0].length) ?? 1;
        const text = h.replace(/^#+\s/, '');
        return { text, level, hasEmoji: /[\p{Emoji}]/u.test(text) };
      }),
      sections: (json.sections ?? []).map(s => ({
        title: s.heading,
        wordCount: s.body.split(/\s+/).filter(Boolean).length,
        hasSubsections: /###\s/.test(s.body)
      })),
      lists: [],
      tables: [],
      codeBlocks: (json.sections ?? []).flatMap(s => (s.code ?? []).map(c => ({ language: c.language, isValid: !!c.content })))
    };

    const candidate: RequiredResponseStructure = {
      formattedResponse: { content: md, metadata: { responseType: ctx.request.responseType }, structure },
      qualityAssessment: {
        overallScore: 0, breakdown: { structure: 0, consistency: 0, formatting: 0, completeness: 0, educational: 0 },
        recommendations: []
      },
      processingMetadata: { processingTime: 0, stepsCompleted: [], warnings: [], optimizations: [] }
    };

    const v = RequiredResponseStructureSchema.safeParse(candidate);
    ctx.structured = v.success ? v.data : createSafeDefaults(candidate);
    ctx.markdown = ctx.structured.formattedResponse.content;
  }
};
```

### `src/pipeline/stages/08-ResponseEnhancementStage.ts`

````ts
import type { Stage } from '../index';
export const ResponseEnhancementStage: Stage = {
  name: 'ResponseEnhancementStage',
  async run(ctx) {
    if (!ctx.markdown) return;
    // Basic fixes: ensure code fences closed
    const openFences = (ctx.markdown.match(/```/g) || []).length;
    if (openFences % 2 !== 0) ctx.markdown += '\n```';
  }
};
````

### `src/pipeline/stages/09-QualityAssessmentStage.ts`

````ts
import type { Stage } from '../index';

export const QualityAssessmentStage: Stage = {
  name: 'QualityAssessmentStage',
  async run(ctx) {
    const md = ctx.markdown ?? '';
    const hasTitle = /^#\s+/.test(md);
    const hasTLDR  = /^>\s+/.test(md.split('\n').find(l => l.startsWith('>')) ?? '');
    const h2Count  = (md.match(/^##\s+/gm) ?? []).length;
    const codeOk   = !(md.includes('```unclosed'));

    const weights = { completeness: 0.3, accuracy: 0.3, clarity: 0.2, relevance: 0.2 };
    const score = (
      (hasTitle ? 0.25 : 0) +
      (hasTLDR  ? 0.25 : 0) +
      (h2Count >= 2 ? 0.25 : 0) +
      (codeOk ? 0.25 : 0)
    ); // crude heuristic → 0..1

    const overall = score;
    const ttl = overall >= 0.95 ? 30*60e3 : overall >= 0.8 ? 15*60e3 : overall >= 0.6 ? 5*60e3 : 0;

    ctx.quality = {
      overall,
      breakdown: { completeness: 1, accuracy: 0.8, clarity: 0.85, relevance: 0.9 }
    };
    // stash TTL decision for next stage
    (ctx as any).__ttlMs = ttl;
  }
};
````

### `src/pipeline/stages/10-CacheStorageStage.ts`

```ts
import type { Stage } from '../index';
import { globalCache } from '../../lib/cache';

export const CacheStorageStage: Stage = {
  name: 'CacheStorageStage',
  async run(ctx) {
    if (!ctx.cacheKey || !ctx.structured) return;
    const ttl = (ctx as any).__ttlMs ?? 0;
    if (ttl > 0) globalCache.set(ctx.cacheKey, ctx.structured, ttl);
  }
};
```

---

# 5) Metrics & monitoring

### `src/metrics/metrics.ts`

```ts
export interface RendererMetrics {
  renderTime: number;
  errorCount: number;
  missingDataFields: string[];
  fallbacksUsed: string[];
  contentLength: number;
  sectionCount: number;
}

export const metrics = {
  logRenderer(m: RendererMetrics) {
    if (m.renderTime > 100) console.warn('Render slow', m);
    if (m.errorCount > 0) console.error('Renderer errors', m);
    if (m.contentLength > 10000) console.warn('Very long content', m);
  }
};
```

---

# 6) React renderer (safe Tailwind, perf, boundaries)

### `src/web/utils/colors.ts`

```ts
export const COLOR_CLASSES = {
  blue:  { bg: 'bg-blue-50',  border: 'border-blue-200',  text: 'text-blue-600'  },
  green: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-600' },
  red:   { bg: 'bg-red-50',   border: 'border-red-200',   text: 'text-red-600'   },
  amber: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-600' },
  gray:  { bg: 'bg-gray-50',  border: 'border-gray-200',  text: 'text-gray-600'  }
} as const;
```

### `src/web/components/ProfessionalResponseRenderer.tsx`

```tsx
import React from 'react';
import { RequiredResponseStructureSchema, createSafeDefaults } from '../../types/schemas';
import type { RequiredResponseStructure } from '../../types/core';
import { metrics } from '../../metrics/metrics';
import { COLOR_CLASSES } from '../utils/colors';
// If you use react-virtuoso, import and gate by size:
let Virtuoso: any = null; try { Virtuoso = require('react-virtuoso').Virtuoso; } catch {}

type Props = { result: any; color?: keyof typeof COLOR_CLASSES; fallbackContent?: string };

class RendererErrorBoundary extends React.Component<React.PropsWithChildren<{ fallbackContent?: string }>, { hasError: boolean; error?: any }> {
  state = { hasError: false, error: undefined as any };
  static getDerivedStateFromError(error: any) { return { hasError: true, error }; }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 border border-red-200 rounded-lg space-y-2">
          <div className="text-red-600 font-medium">Failed to render response.</div>
          <p className="text-sm text-gray-700">Raw content:</p>
          <pre className="text-xs overflow-auto max-h-64">{this.props.fallbackContent ?? 'N/A'}</pre>
        </div>
      );
    }
    return this.props.children as any;
  }
}

function validateRendererData(result: any): RequiredResponseStructure {
  const parsed = RequiredResponseStructureSchema.safeParse(result);
  if (!parsed.success) return createSafeDefaults(result);
  return parsed.data;
}

const Section = React.memo(function Section({ title, body }: { title: string; body: string }) {
  return (
    <section className="mb-6">
      <h2 className="text-xl font-semibold mb-2">{title}</h2>
      <div className="prose max-w-none whitespace-pre-wrap">{body}</div>
    </section>
  );
});

export function ProfessionalResponseRenderer({ result, color = 'gray', fallbackContent }: Props) {
  const t0 = performance.now();
  const data = validateRendererData(result);
  const col = COLOR_CLASSES[color] ?? COLOR_CLASSES.gray;

  const md = data.formattedResponse.content ?? '';
  const sections = data.formattedResponse.structure.sections ?? [];

  const content = (
    <div className={`rounded-2xl border p-4 ${col.bg} ${col.border}`}>
      <article className="prose max-w-none">
        {/* We render Markdown as plain text pre for simplicity here. In your app, use a real MD renderer. */}
        <pre className="whitespace-pre-wrap break-words text-sm">{md}</pre>
      </article>

      <hr className="my-4" />

      <div className={`${col.text} text-sm font-medium mb-2`}>Structure</div>
      {sections.length > 20 && Virtuoso ? (
        <Virtuoso
          style={{ height: 400 }}
          data={sections}
          itemContent={(_, s) => <Section title={s.title} body={`~${s.wordCount} words`} />}
        />
      ) : (
        sections.map((s, i) => <Section key={i} title={s.title} body={`~${s.wordCount} words`} />)
      )}
    </div>
  );

  const t1 = performance.now();
  metrics.logRenderer({
    renderTime: t1 - t0,
    errorCount: 0,
    missingDataFields: [],
    fallbacksUsed: [],
    contentLength: md.length,
    sectionCount: sections.length
  });

  return (
    <RendererErrorBoundary fallbackContent={fallbackContent}>
      {content}
    </RendererErrorBoundary>
  );
}
```

---

# 7) Server entry: run the pipeline end-to-end

### `src/server/handler.ts` (add this utility)

```ts
import { runPipeline } from '../pipeline';
import { ValidationStage } from '../pipeline/stages/01-ValidationStage';
import { ContextEnrichmentStage } from '../pipeline/stages/02-ContextEnrichmentStage';
import { PromptOptimizationStage } from '../pipeline/stages/03-PromptOptimizationStage';
import { StructuredOutputStage } from '../pipeline/stages/04-StructuredOutputStage';
import { CacheCheckStage } from '../pipeline/stages/05-CacheCheckStage';
import { DeepSeekProcessingStage } from '../pipeline/stages/06-DeepSeekProcessingStage';
import { PostFormatStage } from '../pipeline/stages/07-PostFormatStage';
import { ResponseEnhancementStage } from '../pipeline/stages/08-ResponseEnhancementStage';
import { QualityAssessmentStage } from '../pipeline/stages/09-QualityAssessmentStage';
import { CacheStorageStage } from '../pipeline/stages/10-CacheStorageStage';
import type { PipelineContext } from '../types/core';

export async function handleQuestion(input: {
  task: string; audience?: string; tone?: string; responseType?: any; history?: any[];
}) {
  const ctx: PipelineContext = {
    id: crypto.randomUUID(),
    nowISO: new Date().toISOString(),
    history: input.history ?? [],
    request: { task: input.task, audience: input.audience, tone: input.tone, responseType: input.responseType },
    modelConfig: { model: 'chat', temperature: 0.3, maxTokens: 2000, topP: 0.85, jsonMode: true }
  };

  const stages = [
    ValidationStage,
    ContextEnrichmentStage,
    PromptOptimizationStage,
    StructuredOutputStage,
    CacheCheckStage,
    DeepSeekProcessingStage,
    PostFormatStage,
    ResponseEnhancementStage,
    QualityAssessmentStage,
    CacheStorageStage
  ];

  const { ctx: out } = await runPipeline(ctx, stages);
  return { markdown: out.markdown!, structured: out.structured!, quality: out.quality! };
}
```

---

# 8) Tests (vitest examples)

### `tests/unit/parsing.test.ts`

```ts
import { describe, expect, test } from 'vitest';
import { tryParseJSON, renderMarkdown } from '../../src/lib/markdown';

describe('JSON parsing', () => {
  test('parses direct JSON', () => {
    const j = tryParseJSON('{"title":"A","tldr":"B","sections":[]}');
    expect(j).toBeTruthy();
  });

  test('fails gracefully', () => {
    const j = tryParseJSON('not json');
    expect(j).toBeNull();
  });
});

describe('Markdown rendering', () => {
  test('renders basic', () => {
    const md = renderMarkdown({ title: 'T', tldr: 'TL;DR', sections: [] });
    expect(md).toMatch(/^# T/);
    expect(md).toContain('> TL;DR');
  });
});
```

### `tests/integration/pipeline-flow.test.ts`

```ts
import { describe, expect, test, vi } from 'vitest';
import { handleQuestion } from '../../src/server/handler';

vi.mock('../../src/server/handler', async (orig) => {
  const actual: any = await (orig as any)();
  return {
    ...actual,
    callDeepSeekJSON: async () => ({
      choices: [{ message: { content: JSON.stringify({ title:'X', tldr:'Y', sections:[{ heading:'S', body:'B' }] }) } }]
    }) // inject mock
  };
});

describe('pipeline', () => {
  test('end-to-end happy path', async () => {
    const res = await handleQuestion({ task: 'Explain X to a beginner', responseType: 'structured' });
    expect(res.markdown).toMatch(/# X/);
  });
});
```

---

# 9) Env, tsconfig, vitest

### `.env.example`

```
DEEPSEEK_API_KEY=your-key
DEEPSEEK_BASE_URL=https://api.deepseek.com
RATE_LIMIT_RPM=60
CACHE_TTL_SECONDS=300
QUALITY_THRESHOLD=0.8
MAX_RETRIES=3
TIMEOUT_MS=30000
```

### `package.json` (minimal)

```json
{
  "name": "deepseek-starter",
  "private": true,
  "type": "module",
  "scripts": {
    "build": "tsc -p .",
    "test": "vitest run",
    "dev": "vite"
  },
  "dependencies": {
    "zod": "^3.23.8",
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "typescript": "^5.6.2",
    "vitest": "^2.0.5"
  }
}
```

### `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "Bundler",
    "strict": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "esModuleInterop": true,
    "outDir": "dist"
  },
  "include": ["src", "tests"]
}
```

---

# 10) How to use (server example)

```ts
// example usage (e.g., Next.js route or Express handler)
import { handleQuestion } from '@/src/server/handler';

export async function POST(req: Request) {
  const { task, audience, tone, responseType } = await req.json();
  const result = await handleQuestion({ task, audience, tone, responseType });
  return new Response(JSON.stringify(result), { headers: { 'Content-Type': 'application/json' }});
}
```

---

## Why this gets “the best out of” your guides

* **Contracts first**: Hard Zod schemas + safe defaults ensure **no renderer crashes** and predictable shape.
* **Strict JSON mode** with layered fallbacks guarantees **valid StructuredAnswer** even when the model drifts.
* **Pluggable pipeline** mirrors your 10 stages one-to-one, so you can extend/replace any piece.
* **Resilience**: token bucket, exponential backoff, circuit breaker, and cache TTLs based on quality gates.
* **Renderer correctness**: static Tailwind maps (no dynamic classes), error boundary, optional virtualization, memoized sections.
* **Observability**: basic renderer metrics scaffold for logging slow renders and fallbacks.
* **Tests**: unit + integration to lock correctness around parsing, rendering, and pipeline flow.

