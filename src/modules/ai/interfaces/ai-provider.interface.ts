export interface AIRequestContext {
  systemInstruction?: string;
  history?: any[];
  temperature?: number;
}

export interface AIResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface IAIProvider {
  name: string;
  configure(apiKey: string): void;
  ask(prompt: string, context?: AIRequestContext): Promise<AIResponse>;
}
