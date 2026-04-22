import { AIService } from './ai.service';
import { ProjectConfigService } from '../config/project-config.service';
import { allAITools } from './tools';

export class AIOrchestrator {
  constructor(
    private readonly aiService: AIService,
    private readonly configService: ProjectConfigService,
    private readonly schemaOrchestrator: any,
    private readonly storageService: any,
    public knowledgeService?: any
  ) { }

  private getSystemPrompt(locale: string): string {
    const isVi = locale === 'vi';
    const languageName = isVi ? 'Vietnamese' : 'English';

    return `You are the "AI-DBA Assistant" for **TheAndb** — a senior-level database engineering teammate.

## Identity & Tone
- You talk like a **peer engineer** (10+ years backend/DBA experience), NOT a teacher or customer support.
- Be **direct, concise, and blunt**. No fluff, no unnecessary theory, no greeting padding.
- Light sarcasm and witty remarks are welcome — keep it intelligent, not childish.
- If something is wrong or inefficient, say it clearly. Don't sugarcoat.
- **Never** over-explain basics. The user already knows fundamentals.
- Prefer short, punchy sentences over long paragraphs.

## Technical Depth
- Skip basic explanations unless explicitly asked.
- Focus on: **why + tradeoffs + production impact**.
- Go deep on: query optimization, execution plans, partition strategy, index design, schema evolution risks.
- If multiple options exist, rank them with quick pros/cons.
- Default to **production-ready** solutions, not textbook prototypes.
- Challenge incorrect assumptions — don't blindly agree.

## TheAndb Context
- Tool for Global Schema Mapping, DDL Versioning, SQL Optimization.
- Author: ph4n4n (Phan An).

## Tool Usage
- You have access to database tools: get_workspace_summary, inspect_query, analyze_ddl_risk, suggest_indexes, check_data_health, compare_schema.
- Use them proactively to back up your answers with real data. Don't guess when you can query.
- Use get_workspace_summary first if the user asks broad questions about their setup.

## Output Rules
- Language: **${languageName}** only.
- Format: Markdown with **bullet points**. No walls of text.
- Start with the answer immediately. No introductions.
- Actionable insights over general advice. Always.
`;
  }

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
        config: this.configService 
      })
    }));
  }

  async ask(payload: any) {
    const { question, context, locale } = payload;
    const targetLang = locale === 'vi' ? 'Vietnamese' : 'professional English';

    // RAG: Search knowledge base
    const docContext = this.knowledgeService ? this.knowledgeService.search(question) : '';
    const knowledgeBlock = docContext ? `\n\n[PRODUCT KNOWLEDGE CONTEXT]\n${docContext}\n\n` : '';

    const finalLanguageName = locale === 'vi' ? 'Vietnamese' : 'English';
    const localizedQuestion = `
    ${this.getSystemPrompt(locale)}
    ${knowledgeBlock}
    
    User Question: ${question}
    
    [MANDATORY RESPONSE CONSTRAINT]
    - Language: ${finalLanguageName}
    - Format: Markdown (Use BULLET POINTS)
    - Brevity: Extreme (No fluff, no greetings)
    - Technical Depth: Expert DBA
    `;

    const tools = this.getToolsWithContext();
    const content = await this.aiService.ask(localizedQuestion, context, tools);
    return { content };
  }

  async review(payload: any) {
    const { context, locale } = payload;

    // Support both new nested shape and legacy flat shape
    const sourceDdl = context.source?.ddl || context.sourceDdl || '';
    const isSingleReview = !sourceDdl || sourceDdl.trim() === '';
    const mode = isSingleReview ? 'Single Schema Analysis' : 'Migration Review';

    const isVi = locale === 'vi';
    const finalLanguageName = isVi ? 'Vietnamese' : 'English';
    const localizedMode = isVi ? 'Chế độ' : 'Mode';
    const localizedInstr = isVi ? 'Hướng dẫn Phân tích' : 'Analysis Instructions';

    // RAG: Search knowledge base for review context (using object names/types)
    const query = `${context.objectName || ''} ${context.objectType || ''} review`.trim();
    const docContext = this.knowledgeService ? this.knowledgeService.search(query) : '';
    const knowledgeBlock = docContext ? `\n\n[PRODUCT KNOWLEDGE CONTEXT]\n${docContext}\n\n` : '';

    const prompt = `
      ${this.getSystemPrompt(locale)}
      ${knowledgeBlock}
      
      ${localizedMode}: ${mode}
      Context: ${JSON.stringify(context, null, 2)}
      
      [${localizedInstr}]:
      1. Focus: Performance, security, and standards.
      2. Brevity: EXTREME BREVITY. Use bullet points only.
      3. Format: Markdown blocks, bold risks.
      4. Language: YOU MUST RESPOND IN ${finalLanguageName.toUpperCase()}.
      
      [CRITICAL FINAL REMINDER]
      - Target Language: ${finalLanguageName}
      - Output Style: BULLET POINTS, NO FLUFF.
      - Start your analysis directly in ${finalLanguageName}.
    `;

    const tools = this.getToolsWithContext();
    const content = await this.aiService.ask(prompt, context, tools);
    return { content };
  }
}
