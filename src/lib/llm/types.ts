export type ChatMessage = { 
  role: "system" | "user" | "assistant" | "tool"; 
  content: string; 
  name?: string; 
  tool_call_id?: string;
  tool_calls?: ToolCall[];
};

export type ToolDef = { 
  name: string; 
  description: string; 
  parameters: Record<string, any> 
};

export type ToolCall = { 
  id: string;
  name: string; 
  args: any 
};

export interface StreamChunk {
  type: "text" | "tool_call" | "event" | "error" | "done";
  data?: any;
  content?: string;
  delta?: string;
  tool?: ToolCall;
  error?: string;
}

export interface LLMAdapter {
  chatStream(input: {
    messages: ChatMessage[];
    tools?: ToolDef[];
    toolChoice?: "auto" | { name: string };
    temperature?: number;
    maxTokens?: number;
    system?: string;
  }): AsyncIterable<StreamChunk>;
  
  chat(input: {
    messages: ChatMessage[];
    tools?: ToolDef[];
    toolChoice?: "auto" | { name: string };
    temperature?: number;
    maxTokens?: number;
    system?: string;
  }): Promise<ChatMessage>;
  
  isAvailable(): Promise<boolean>;
  getModelName(): string;
}

export interface LLMConfig {
  provider: 'openai' | 'gemini' | 'claude';
  apiKey?: string;
  model?: string;
  baseUrl?: string;
}

export interface CompletionUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}