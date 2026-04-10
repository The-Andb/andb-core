import { IAIProvider, AIResponse } from './interfaces/ai-provider.interface';
import { GeminiProvider } from './providers/gemini.provider';
import { AIPromptBuilder } from './prompt-builder';

export class AIService {
  private readonly provider: IAIProvider;

  constructor() {
    this.provider = new GeminiProvider();
  }

  configure(apiKey: string, providerName: string = 'gemini'): boolean {
    if (providerName === 'gemini') {
      this.provider.configure(apiKey);
      return true;
    }
    return false;
  }

  async reviewSchema(context: { sourceDdl: string; targetDdl: string; stats?: any; serverInfo?: any }): Promise<AIResponse> {
    const prompt = AIPromptBuilder.buildReviewPrompt(context);
    const systemInstruction = AIPromptBuilder.getSystemInstruction();
    
    return await this.provider.ask(prompt, { 
      systemInstruction,
      temperature: 0.2 
    });
  }

  async askDBA(question: string, context?: any): Promise<AIResponse> {
    const systemInstruction = AIPromptBuilder.getSystemInstruction();
    let prompt = question;
    
    if (context) {
      prompt += `\n\nContext for reference:\n${JSON.stringify(context, null, 2)}`;
    }
    
    return await this.provider.ask(prompt, { 
      systemInstruction,
      temperature: 0.7 
    });
  }
}
