import { LLMAdapter, ChatMessage, ToolDef, StreamChunk, LLMConfig } from './types';

export class ClaudeAdapter implements LLMAdapter {
  private apiKey: string;
  private model: string;

  constructor(config: LLMConfig) {
    this.apiKey = config.apiKey || process.env.VITE_CLAUDE_API_KEY || '';
    this.model = config.model || process.env.VITE_CLAUDE_MODEL || 'claude-3-5-sonnet-20241022';
  }

  private convertMessages(messages: ChatMessage[], system?: string): { messages: any[], system?: string } {
    const convertedMessages: any[] = [];
    let systemPrompt = system || '';

    for (const msg of messages) {
      if (msg.role === 'system') {
        systemPrompt = systemPrompt ? `${systemPrompt}\n\n${msg.content}` : msg.content;
      } else if (msg.role === 'tool') {
        convertedMessages.push({
          role: 'user',
          content: [{
            type: 'tool_result',
            tool_use_id: msg.tool_call_id,
            content: msg.content
          }]
        });
      } else if (msg.role === 'assistant' && msg.tool_calls) {
        const content: any[] = [];
        if (msg.content) {
          content.push({ type: 'text', text: msg.content });
        }
        for (const toolCall of msg.tool_calls) {
          content.push({
            type: 'tool_use',
            id: toolCall.id,
            name: toolCall.name,
            input: toolCall.args
          });
        }
        convertedMessages.push({ role: 'assistant', content });
      } else {
        convertedMessages.push({
          role: msg.role,
          content: msg.content
        });
      }
    }

    return { messages: convertedMessages, system: systemPrompt };
  }

  private convertTools(tools?: ToolDef[]): any[] | undefined {
    if (!tools || tools.length === 0) return undefined;

    return tools.map(tool => ({
      name: tool.name,
      description: tool.description,
      input_schema: {
        type: 'object',
        properties: tool.parameters.properties || {},
        required: tool.parameters.required || []
      }
    }));
  }

  async *chatStream(input: {
    messages: ChatMessage[];
    tools?: ToolDef[];
    toolChoice?: "auto" | { name: string };
    temperature?: number;
    maxTokens?: number;
    system?: string;
  }): AsyncIterable<StreamChunk> {
    const { messages: convertedMessages, system } = this.convertMessages(input.messages, input.system);
    const tools = this.convertTools(input.tools);

    const body: any = {
      model: this.model,
      messages: convertedMessages,
      max_tokens: input.maxTokens ?? 2000,
      temperature: input.temperature ?? 0.7,
      stream: true
    };

    if (system) {
      body.system = system;
    }

    if (tools) {
      body.tools = tools;
      if (input.toolChoice && typeof input.toolChoice === 'object') {
        body.tool_choice = {
          type: 'tool',
          name: input.toolChoice.name
        };
      } else if (input.toolChoice === 'auto') {
        body.tool_choice = { type: 'auto' };
      }
    }

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json',
          'anthropic-beta': 'messages-2023-12-15'
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const error = await response.text();
        yield { type: 'error', error: `Claude API error: ${error}` };
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) {
        yield { type: 'error', error: 'No response body' };
        return;
      }

      const decoder = new TextDecoder();
      let buffer = '';
      let currentToolUse: any = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              yield { type: 'done' };
              continue;
            }

            try {
              const parsed = JSON.parse(data);
              
              if (parsed.type === 'content_block_start') {
                if (parsed.content_block?.type === 'tool_use') {
                  currentToolUse = {
                    id: parsed.content_block.id,
                    name: parsed.content_block.name,
                    input: ''
                  };
                }
              } else if (parsed.type === 'content_block_delta') {
                if (parsed.delta?.type === 'text_delta') {
                  yield {
                    type: 'text',
                    delta: parsed.delta.text,
                    content: parsed.delta.text
                  };
                } else if (parsed.delta?.type === 'input_json_delta' && currentToolUse) {
                  currentToolUse.input += parsed.delta.partial_json;
                }
              } else if (parsed.type === 'content_block_stop') {
                if (currentToolUse && currentToolUse.name) {
                  try {
                    const args = JSON.parse(currentToolUse.input);
                    yield {
                      type: 'tool_call',
                      tool: {
                        id: currentToolUse.id,
                        name: currentToolUse.name,
                        args
                      }
                    };
                  } catch (e) {
                    console.error('Error parsing tool input:', e);
                  }
                  currentToolUse = null;
                }
              } else if (parsed.type === 'message_stop') {
                yield { type: 'done' };
              }
            } catch (e) {
              console.error('Error parsing Claude SSE data:', e);
            }
          }
        }
      }
    } catch (error) {
      yield { 
        type: 'error', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  async chat(input: {
    messages: ChatMessage[];
    tools?: ToolDef[];
    toolChoice?: "auto" | { name: string };
    temperature?: number;
    maxTokens?: number;
    system?: string;
  }): Promise<ChatMessage> {
    let fullContent = '';
    const toolCalls: any[] = [];

    for await (const chunk of this.chatStream(input)) {
      if (chunk.type === 'text' && chunk.content) {
        fullContent += chunk.content;
      } else if (chunk.type === 'tool_call' && chunk.tool) {
        toolCalls.push(chunk.tool);
      }
    }

    return {
      role: 'assistant',
      content: fullContent,
      tool_calls: toolCalls.length > 0 ? toolCalls : undefined,
    };
  }

  async isAvailable(): Promise<boolean> {
    if (!this.apiKey) return false;
    
    try {
      // Claude doesn't have a simple test endpoint, so we'll make a minimal request
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-3-haiku-20240307',
          messages: [{ role: 'user', content: 'Hi' }],
          max_tokens: 1,
        }),
      });
      return response.status !== 401;
    } catch {
      return false;
    }
  }

  getModelName(): string {
    return this.model;
  }
}