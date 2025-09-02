import { LLMAdapter, ChatMessage, ToolDef, StreamChunk, LLMConfig } from './types';

export class OpenAIAdapter implements LLMAdapter {
  private apiKey: string;
  private model: string;
  private baseUrl: string;

  constructor(config: LLMConfig) {
    this.apiKey = config.apiKey || process.env.VITE_OPENAI_API_KEY || '';
    this.model = config.model || process.env.VITE_OPENAI_MODEL || 'gpt-3.5-turbo';
    this.baseUrl = config.baseUrl || 'https://api.openai.com/v1';
    
    // Support OpenRouter
    if (this.apiKey.startsWith('sk-or-')) {
      this.baseUrl = 'https://openrouter.ai/api/v1';
    }
  }

  async *chatStream(input: {
    messages: ChatMessage[];
    tools?: ToolDef[];
    toolChoice?: "auto" | { name: string };
    temperature?: number;
    maxTokens?: number;
    system?: string;
  }): AsyncIterable<StreamChunk> {
    const messages = [...input.messages];
    if (input.system) {
      messages.unshift({ role: 'system', content: input.system });
    }

    const isOpenRouter = this.apiKey.startsWith('sk-or-');
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
    };

    if (isOpenRouter) {
      headers['HTTP-Referer'] = window.location.origin;
      headers['X-Title'] = 'StudyFlow AI';
    }

    const body: any = {
      model: isOpenRouter ? `openai/${this.model}` : this.model,
      messages,
      temperature: input.temperature ?? 0.7,
      max_tokens: input.maxTokens ?? 2000,
      stream: true,
    };

    if (input.tools && input.tools.length > 0) {
      body.tools = input.tools.map(tool => ({
        type: 'function',
        function: {
          name: tool.name,
          description: tool.description,
          parameters: tool.parameters,
        }
      }));
      body.tool_choice = input.toolChoice === 'auto' ? 'auto' : 
        input.toolChoice ? { type: 'function', function: { name: input.toolChoice.name } } : 
        'auto';
    }

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const error = await response.text();
        yield { type: 'error', error: `OpenAI API error: ${error}` };
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) {
        yield { type: 'error', error: 'No response body' };
        return;
      }

      const decoder = new TextDecoder();
      let buffer = '';
      let currentToolCall: any = null;

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
              const choice = parsed.choices?.[0];
              
              if (choice?.delta?.content) {
                yield { 
                  type: 'text', 
                  delta: choice.delta.content,
                  content: choice.delta.content 
                };
              }

              if (choice?.delta?.tool_calls) {
                for (const toolCall of choice.delta.tool_calls) {
                  if (toolCall.id) {
                    currentToolCall = {
                      id: toolCall.id,
                      name: toolCall.function?.name || '',
                      args: '',
                    };
                  }
                  if (toolCall.function?.arguments) {
                    if (currentToolCall) {
                      currentToolCall.args += toolCall.function.arguments;
                    }
                  }
                  if (currentToolCall && currentToolCall.name && currentToolCall.args) {
                    try {
                      const args = JSON.parse(currentToolCall.args);
                      yield {
                        type: 'tool_call',
                        tool: {
                          id: currentToolCall.id,
                          name: currentToolCall.name,
                          args,
                        }
                      };
                      currentToolCall = null;
                    } catch {
                      // Arguments not complete yet
                    }
                  }
                }
              }

              if (choice?.finish_reason === 'stop') {
                yield { type: 'done' };
              }
            } catch (e) {
              console.error('Error parsing SSE data:', e);
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
      const response = await fetch(`${this.baseUrl}/models`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  getModelName(): string {
    return this.model;
  }
}