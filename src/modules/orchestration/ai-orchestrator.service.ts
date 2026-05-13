import { AIService } from './ai.service';
import { ProjectConfigService } from '../config/project-config.service';
import { allAITools } from './tools';
import { IPromptProvider } from '../../common/interfaces/prompt.interface';

export class AIOrchestrator {
  constructor(
    private readonly aiService: AIService,
    private readonly configService: ProjectConfigService,
    private readonly schemaOrchestrator: any,
    private readonly storageService: any,
    public knowledgeService?: any,
    private readonly promptProvider?: IPromptProvider,
    private readonly emitAppEvent?: (event: any) => void
  ) { }

  async configure(payload: any) {
    const { apiKey, provider, modelVersion } = payload;

    // Save to user settings in SQLite for persistence across restarts
    if (this.storageService) {
      if (apiKey) await this.storageService.saveUserSetting('ai_api_key', apiKey);
      if (provider) await this.storageService.saveUserSetting('ai_provider', provider);
      if (modelVersion) await this.storageService.saveUserSetting('ai_model_version', modelVersion);
    }

    this.aiService.configure(apiKey, provider, modelVersion);
    return { success: true };
  }

  /**
   * Rehydrate AI settings from persistent storage on startup
   */
  async rehydrate() {
    if (!this.storageService) return;
    try {
      const settings = await this.storageService.getUserSettings();
      const apiKey = settings?.ai_api_key;
      const provider = settings?.ai_provider || 'gemini';
      const modelVersion = settings?.ai_model_version || 'gemini-1.5-flash';

      if (apiKey) {
        console.log(`[AIOrchestrator] Rehydrating AI Service (Model: ${modelVersion})`);
        this.aiService.configure(apiKey, provider, modelVersion);
      }
    } catch (e: any) {
      console.warn(`[AIOrchestrator] Rehydration failed: ${e.message}`);
    }
  }

  private getToolsWithContext() {
    return allAITools.map(tool => ({
      ...tool,
      handler: (input: any) => tool.handler(input, {
        orchestrator: this.schemaOrchestrator,
        config: this.configService,
        emitAppEvent: this.emitAppEvent
      })
    }));
  }

  async ask(payload: any) {
    const { question, context, locale } = payload;
    const persona = context?.persona || 'coworker';

    // Sync UI state to core config for accurate tool execution
    if (context?.activeProjectId) {
      this.configService.setActiveProjectId(context.activeProjectId);
    }

    // RAG: Search knowledge base
    const docContext = this.knowledgeService ? this.knowledgeService.search(question) : '';
    const knowledgeBlock = docContext ? `\n\n[PRODUCT KNOWLEDGE CONTEXT]\n${docContext}\n\n` : '';

    // Fetch system prompt from external provider if available
    let systemPrompt = '';
    if (this.promptProvider) {
      systemPrompt = await this.promptProvider.get('CORE_SYSTEM', {
        locale,
        persona,
        knowledge: knowledgeBlock
      });
    }

    const finalPrompt = `
      ${systemPrompt}
      
      User Question: ${question}
    `;

    const tools = this.getToolsWithContext();
    
    console.log(`[AIOrchestrator] Calling AI Service with ${tools.length} tools. Question: ${question}`);
    
    const content = await this.aiService.ask(question, context, tools, systemPrompt);
    return { content };
  }

  async review(payload: any) {
    const { context, locale } = payload;

    // Support both new nested shape and legacy flat shape
    const sourceDdl = context.source?.ddl || context.sourceDdl || '';
    const isSingleReview = !sourceDdl || sourceDdl.trim() === '';
    const mode = isSingleReview ? 'Single Schema Analysis' : 'Migration Review';

    // RAG: Search knowledge base for review context
    const query = `${context.objectName || ''} ${context.objectType || ''} review`.trim();
    const docContext = this.knowledgeService ? this.knowledgeService.search(query) : '';
    const knowledgeBlock = docContext ? `\n\n[PRODUCT KNOWLEDGE CONTEXT]\n${docContext}\n\n` : '';

    // Fetch review specific prompt
    let systemPrompt = '';
    if (this.promptProvider) {
      systemPrompt = await this.promptProvider.get('REVIEW_SCHEMA', {
        locale,
        persona: context?.persona || 'dba',
        knowledge: knowledgeBlock,
        mode,
        contextJson: JSON.stringify(context, null, 2)
      });
    }

    const prompt = `[CONTEXT DATA]:\n${JSON.stringify(context, null, 2)}`;

    const tools = this.getToolsWithContext();
    const content = await this.aiService.ask(prompt, context, tools, systemPrompt);
    return { content };
  }
}
