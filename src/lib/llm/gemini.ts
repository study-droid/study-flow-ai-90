import { LLMAdapter, ChatMessage, ToolDef, StreamChunk, LLMConfig } from './types';

export class GeminiAdapter implements LLMAdapter {
  private apiKey: string;
  private model: string;

  constructor(config: LLMConfig) {
    this.apiKey = config.apiKey || process.env.VITE_GEMINI_API_KEY || '';
    this.model = config.model || process.env.VITE_GEMINI_MODEL || 'gemini-1.5-flash';
  }

  private convertMessages(messages: ChatMessage[]): any[] {
    const contents: any[] = [];
    
    for (const msg of messages) {
      if (msg.role === 'system') {
        // Gemini doesn't have system role, prepend to first user message
        continue;
      }
      
      contents.push({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }]
      });
    }

    // Prepend system messages to first user message
    const systemMessages = messages.filter(m => m.role === 'system');
    if (systemMessages.length > 0 && contents.length > 0) {
      const systemText = systemMessages.map(m => m.content).join('\n');
      if (contents[0].role === 'user') {
        contents[0].parts[0].text = `${systemText}\n\n${contents[0].parts[0].text}`;
      }
    }

    return contents;
  }

  private convertTools(tools?: ToolDef[]): any[] | undefined {
    if (!tools || tools.length === 0) return undefined;

    return [{
      function_declarations: tools.map(tool => ({
        name: tool.name,
        description: tool.description,
        parameters: {
          type: 'object',
          properties: tool.parameters.properties || {},
          required: tool.parameters.required || []
        }
      }))
    }];
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

    const contents = this.convertMessages(messages);
    const tools = this.convertTools(input.tools);

    const body: any = {
      contents,
      generationConfig: {
        temperature: input.temperature ?? 0.7,
        maxOutputTokens: input.maxTokens ?? 2000,
      }
    };

    if (tools) {
      body.tools = tools;
      if (input.toolChoice && typeof input.toolChoice === 'object') {
        body.tool_config = {
          function_calling_config: {
            mode: 'ANY',
            allowed_function_names: [input.toolChoice.name]
          }
        };
      }
    }

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:streamGenerateContent?key=${this.apiKey}`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const error = await response.text();
        yield { type: 'error', error: `Gemini API error: ${error}` };
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) {
        yield { type: 'error', error: 'No response body' };
        return;
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        
        // Gemini streams JSON objects separated by newlines
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim()) continue;
          
          try {
            const parsed = JSON.parse(line);
            
            if (parsed.candidates?.[0]?.content?.parts) {
              for (const part of parsed.candidates[0].content.parts) {
                if (part.text) {
                  yield {
                    type: 'text',
                    delta: part.text,
                    content: part.text
                  };
                }
                
                if (part.functionCall) {
                  yield {
                    type: 'tool_call',
                    tool: {
                      id: `call_${Date.now()}`,
                      name: part.functionCall.name,
                      args: part.functionCall.args
                    }
                  };
                }
              }
            }

            if (parsed.candidates?.[0]?.finishReason === 'STOP') {
              yield { type: 'done' };
            }
          } catch (e) {
            console.error('Error parsing Gemini response:', e);
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
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${this.apiKey}`,
        { method: 'GET' }
      );
      return response.ok;
    } catch {
      return false;
    }
  }

  getModelName(): string {
    return this.model;
  }
}