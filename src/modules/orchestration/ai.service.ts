import { GoogleGenerativeAI } from '@google/generative-ai';
// @ts-ignore
const { getLogger } = require('andb-logger');

export class AIService {
  private readonly logger = getLogger({ logName: 'AIService' });
  private genAI: GoogleGenerativeAI | null = null;
  private modelName: string = 'gemini-1.5-flash';
  private provider: string = 'gemini';
  private apiKey: string | null = null;
  private availableModels: string[] = [];

  public configure(apiKey: string, provider: string = 'gemini', modelName?: string) {
    this.apiKey = apiKey;
    this.provider = provider;
    
    // Normalize model name
    let internalModelName = modelName;
    
    if (provider === 'gemini') {
      internalModelName = internalModelName || 'gemini-1.5-flash';
      if (internalModelName.includes('gemini-2.0-flash')) {
        internalModelName = 'gemini-1.5-flash';
      }
    } else if (provider === 'openai') {
      internalModelName = internalModelName || 'gpt-4o';
    } else if (provider === 'anthropic') {
      internalModelName = internalModelName || 'claude-3-5-sonnet-20240620';
    }
    
    this.modelName = internalModelName || 'unknown';

    if (provider === 'gemini') {
      try {
        this.genAI = new GoogleGenerativeAI(apiKey);
        this.logger.info(`✨ Gemini configured (Model: ${this.modelName})`);
        this.discoverModels();
      } catch (e: any) {
        this.logger.error('Failed to initialize Gemini:', e.message);
        throw e;
      }
    } else {
      this.logger.info(`✨ ${provider.toUpperCase()} configured (Model: ${this.modelName})`);
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

  public async ask(question: string, context?: any, tools?: any[], systemInstruction?: string): Promise<string> {
    if (!this.apiKey) {
      throw new Error('AI Service not configured. Please provide an API Key first.');
    }

    // Route to specialized providers
    if (this.provider === 'openai') {
      return this.askOpenAI(question, context, systemInstruction);
    }
    
    if (this.provider === 'anthropic') {
      return this.askAnthropic(question, context, systemInstruction);
    }

    // Default to Gemini Strategy (Legacy/Main)
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

    try {
      let messages = [
        {
          role: 'user',
          parts: [{ text: `${question}\n\nContext:\n${JSON.stringify(context || {}, null, 2)}` }]
        }
      ];

      return await this.executeChatLoop(this.modelName, messages, toolDeclarations, tools, systemInstruction);
    } catch (error: any) {
      this.logger.error(`AI execution error: ${error.message}`);
      throw error;
    }
  }

  private async askOpenAI(question: string, context?: any, systemInstruction?: string): Promise<string> {
    const url = 'https://api.openai.com/v1/chat/completions';
    const messages = [];
    
    if (systemInstruction) {
      messages.push({ role: 'system', content: systemInstruction });
    }
    
    messages.push({ 
      role: 'user', 
      content: `${question}\n\nContext:\n${JSON.stringify(context || {}, null, 2)}` 
    });

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: this.modelName,
        messages,
        temperature: 0.2
      })
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`OpenAI Error ${response.status}: ${err}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || 'No response from OpenAI';
  }

  private async askAnthropic(question: string, context?: any, systemInstruction?: string): Promise<string> {
    const url = 'https://api.anthropic.com/v1/messages';
    
    const body: any = {
      model: this.modelName,
      max_tokens: 2048,
      messages: [
        { 
          role: 'user', 
          content: `${question}\n\nContext:\n${JSON.stringify(context || {}, null, 2)}` 
        }
      ],
      temperature: 0.2
    };

    if (systemInstruction) {
      body.system = systemInstruction;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey || '',
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Anthropic Error ${response.status}: ${err}`);
    }

    const data = await response.json();
    return data.content?.[0]?.text || 'No response from Anthropic';
  }

  private async executeChatLoop(model: string, messages: any[], toolDeclarations?: any[], tools?: any[], systemInstruction?: string): Promise<string> {
    const maxIterations = 5;
    let currentIteration = 0;

    while (currentIteration < maxIterations) {
      const payload: any = {
        contents: messages,
        tools: toolDeclarations ? [{ functionDeclarations: toolDeclarations }] : [],
        generationConfig: { temperature: 0.2, maxOutputTokens: 2048 }
      };

      if (systemInstruction) {
        payload.systemInstruction = {
          parts: [{ text: systemInstruction }]
        };
      }

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
    
    let lastError: any = null;
    const maxRetries = 3;
    const baseDelay = 1000;

    for (let i = 0; i <= maxRetries; i++) {
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (response.ok) {
          return await response.json();
        }

        const errorBody = await response.text();
        lastError = new Error(`Google AI API Error ${response.status}: ${errorBody}`);
        
        // Only retry on transient errors (429: Rate Limit, 500: Internal, 503: Service Unavailable, 504: Gateway Timeout)
        if (![429, 500, 503, 504].includes(response.status)) {
          throw lastError;
        }

        if (i < maxRetries) {
          const delay = baseDelay * Math.pow(2, i);
          this.logger.warn(`⚠️ Gemini API transient error (${response.status}). Retrying in ${delay}ms... (Attempt ${i + 1}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      } catch (e: any) {
        lastError = e;
        // Network errors (fetch failed) should also be retried
        if (i < maxRetries && (e.message.includes('fetch') || e.message.includes('network') || e.message.includes('ETIMEDOUT'))) {
          const delay = baseDelay * Math.pow(2, i);
          this.logger.warn(`🌐 Network error. Retrying in ${delay}ms... (Attempt ${i + 1}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        throw e;
      }
    }

    throw lastError;
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
