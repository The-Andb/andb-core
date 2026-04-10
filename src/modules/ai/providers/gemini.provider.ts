import { IAIProvider, AIRequestContext, AIResponse } from '../interfaces/ai-provider.interface';

export class GeminiProvider implements IAIProvider {
  public readonly name = 'gemini';
  private apiKey: string | null = null;
  private readonly model = 'gemini-1.5-flash';

  configure(apiKey: string): void {
    this.apiKey = apiKey;
  }

  async ask(prompt: string, context?: AIRequestContext): Promise<AIResponse> {
    if (!this.apiKey) {
      throw new Error('Gemini API Key not configured');
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;

    const body = {
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }]
        }
      ],
      systemInstruction: context?.systemInstruction 
        ? { parts: [{ text: context.systemInstruction }] }
        : undefined,
      generationConfig: {
        temperature: context?.temperature ?? 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 2048,
        responseMimeType: 'text/plain'
      }
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Gemini API Error: ${error.error?.message || response.statusText}`);
      }

      const data = await response.json();
      const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      
      return { 
        content,
        usage: data.usageMetadata ? {
          promptTokens: data.usageMetadata.promptTokenCount,
          completionTokens: data.usageMetadata.candidatesTokenCount,
          totalTokens: data.usageMetadata.totalTokenCount
        } : undefined
      };
    } catch (e: any) {
      throw new Error(`Failed to call Gemini API: ${e.message}`);
    }
  }
}
