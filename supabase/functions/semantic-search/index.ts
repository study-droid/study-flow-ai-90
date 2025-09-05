import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { pipeline } from 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.6.0'

serve(async (req) => {
  const { query } = await req.json()

  const pipe = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
  const output = await pipe(query, { pooling: 'mean', normalize: true });

  return new Response(
    JSON.stringify({ embedding: Array.from(output.data) }),
    { headers: { 'Content-Type': 'application/json' } },
  )
})
