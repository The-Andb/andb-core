import { GoogleGenerativeAI } from '@google/generative-ai';
const { getLogger } = require('andb-logger');

export class AIService {
  private readonly logger = getLogger({ logName: 'AIService' });
  private genAI: any = null;
  private modelName: string = 'gemini-1.5-flash';
  private apiKey: string | null = null;
  private availableModels: string[] = [];

  public configure(apiKey: string, provider: string = 'gemini', modelName?: string) {
    this.apiKey = apiKey;
    
    // Normalize model name
    let internalModelName = modelName || 'gemini-1.5-flash';
    if (internalModelName.includes('gemini-2.0-flash')) {
      // Force fallback because gemini-2.0-flash throws 404 for new users
      internalModelName = 'gemini-1.5-flash';
    } else if (internalModelName.includes('gemini-1.5-flash')) {
      internalModelName = 'gemini-1.5-flash';
    }
    
    this.modelName = internalModelName;

    if (provider === 'gemini') {
      try {
        this.genAI = new GoogleGenerativeAI(apiKey);
        this.logger.info(`✨ AI Service configured (Model: ${this.modelName})`);
        this.discoverModels();
      } catch (e: any) {
        this.logger.error('Failed to initialize AI Service:', e.message);
        throw e;
      }
    }
  }

  private async discoverModels() {
    if (!this.apiKey) return;
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${this.apiKey}`;
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        this.availableModels = data.models?.map((m: any) => m.name.replace('models/', '')) || [];
      }
    } catch (e: any) {
      this.logger.error(`❌ Discovery error: ${e.message}`);
    }
  }

  public async ask(question: string, context?: any, tools?: any[]): Promise<string> {
    if (!this.apiKey) {
      throw new Error('AI Service not configured. Please provide an API Key first.');
    }

    // Dynamic model discovery fallback
    if (this.availableModels.length === 0) {
      await this.discoverModels();
    }
    
    if (this.availableModels.length > 0 && !this.availableModels.includes(this.modelName)) {
      // Find the best fallback model available to this API key
      const fallback = 
        this.availableModels.find(m => m.includes('1.5-flash') && !m.includes('8b') && !m.includes('exp')) ||
        this.availableModels.find(m => m.includes('flash') && !m.includes('exp')) || 
        this.availableModels.find(m => m.includes('pro')) || 
        this.availableModels.find(m => m.includes('gemini')) ||
        this.availableModels[0];
        
      if (fallback) {
        this.logger.info(`Model ${this.modelName} not available. Auto-falling back to ${fallback}`);
        this.modelName = fallback;
      }
    }

    const toolDeclarations = tools?.map(t => ({
      name: t.name,
      description: t.description,
      parameters: this.zodToGeminiSchema(t.inputSchema)
    }));

    let messages = [
      {
        role: 'user',
        parts: [{ text: `${question}\n\nContext:\n${JSON.stringify(context || {}, null, 2)}` }]
      }
    ];

    try {
      return await this.executeChatLoop(this.modelName, messages, toolDeclarations, tools);
    } catch (error: any) {
      this.logger.error(`AI execution error: ${error.message}`);
      throw error;
    }
  }

  private async executeChatLoop(model: string, messages: any[], toolDeclarations?: any[], tools?: any[]): Promise<string> {
    const maxIterations = 5;
    let currentIteration = 0;

    while (currentIteration < maxIterations) {
      const payload = {
        contents: messages,
        tools: toolDeclarations ? [{ functionDeclarations: toolDeclarations }] : [],
        generationConfig: { temperature: 0.2, maxOutputTokens: 2048 }
      };

      const data = await this.callGeminiApi(model, payload);
      const candidate = data.candidates?.[0];
      const message = candidate?.content;
      
      messages.push(message);

      const toolCalls = message?.parts?.filter((p: any) => p.functionCall);
      if (!toolCalls || toolCalls.length === 0) {
        return message?.parts?.map((p: any) => p.text).join('') || 'No response';
      }

      // Execute tool calls
      const toolResultsParts = [];
      for (const call of toolCalls) {
        const tool = tools?.find(t => t.name === call.functionCall.name);
        if (tool) {
          this.logger.info(`🛠️ Executing Tool: ${tool.name}`);
          try {
            const result = await tool.handler(call.functionCall.args);
            toolResultsParts.push({
              functionResponse: {
                name: tool.name,
                response: { content: result }
              }
            });
          } catch (e: any) {
            toolResultsParts.push({
              functionResponse: {
                name: tool.name,
                response: { error: e.message }
              }
            });
          }
        }
      }

      messages.push({
        role: 'function', // In v1beta, role for tool responses is often 'function' or 'user' depending on SDK, but REST API expects it in a specific structure
        parts: toolResultsParts
      });

      currentIteration++;
    }

    return 'Maximum tool execution iterations reached.';
  }

  private async callGeminiApi(model: string, payload: any): Promise<any> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.apiKey}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Google AI API Error ${response.status}: ${errorBody}`);
    }

    return await response.json();
  }

  private zodToGeminiSchema(zodSchema: any): any {
    // Basic mapping of Zod to JSON Schema (Gemini style)
    const jsonSchema = zodSchema._def ? this.mapZodType(zodSchema) : zodSchema;
    return jsonSchema;
  }

  private mapZodType(zodType: any): any {
    const type = zodType._def.typeName;
    switch (type) {
      case 'ZodString':
        return { type: 'STRING', description: zodType.description };
      case 'ZodNumber':
        return { type: 'NUMBER', description: zodType.description };
      case 'ZodBoolean':
        return { type: 'BOOLEAN', description: zodType.description };
      case 'ZodObject':
        const properties: any = {};
        const required: string[] = [];
        for (const key in zodType._def.shape()) {
          properties[key] = this.mapZodType(zodType._def.shape()[key]);
          if (!zodType._def.shape()[key].isOptional()) {
            required.push(key);
          }
        }
        return { type: 'OBJECT', properties, required };
      case 'ZodArray':
        return { type: 'ARRAY', items: this.mapZodType(zodType._def.type) };
      case 'ZodEnum':
        return { type: 'STRING', enum: zodType._def.values };
      case 'ZodOptional':
        return this.mapZodType(zodType._def.innerType);
      case 'ZodUnion':
        // Gemini tool schemas are a bit restrictive with unions, simplifiying to the first object or general object
        return { type: 'OBJECT', description: 'Complex type (Union)' };
      default:
        return { type: 'STRING' };
    }
  }

  public async generateContent(prompt: string): Promise<string> {
    return this.ask(prompt);
  }
}
