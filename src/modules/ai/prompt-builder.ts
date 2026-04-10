export class AIPromptBuilder {
  static getSystemInstruction(): string {
    return `You are a World-Class Database Architect and Senior DBA Expert (TheAndb AI).
Your purpose is to assist developers in reviewing database schema changes (DDL), optimizing performance, and identifying potential safety risks in migration scripts.

### GUIDELINES:
1. **Purity**: Only provide technical, database-focused advice. 
2. **Safety First**: Always warn about destructive operations (DROP without backups, large ALTERS on production).
3. **Optimized SQL**: Suggest better indexing or data types where appropriate.
4. **Style**: Use a professional, concise tone. Use Markdown for formatting.
5. **Context**: You will receive Source and Target DDL. Analyze the delta.`;
  }

  static buildReviewPrompt(context: { sourceDdl: string; targetDdl: string; stats?: any; serverInfo?: any }): string {
    let prompt = `Please review these schema changes:

### Source DDL:
\`\`\`sql
${context.sourceDdl}
\`\`\`

### Target DDL:
\`\`\`sql
${context.targetDdl}
\`\`\`
`;

    if (context.stats) {
      prompt += `\n### Target Table Statistics:\n${JSON.stringify(context.stats, null, 2)}`;
    }

    if (context.serverInfo) {
      prompt += `\n### Database Environment:\n${JSON.stringify(context.serverInfo, null, 2)}`;
    }

    prompt += `\n\nProvide a high-level review of these changes, highlighting any risks or optimization opportunities.`;
    return prompt;
  }
}
