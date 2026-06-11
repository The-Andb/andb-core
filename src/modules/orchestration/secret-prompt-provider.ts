import * as fs from 'fs';
import * as path from 'path';
// @ts-ignore
const { getLogger } = require('andb-logger');

import { IPromptProvider } from '../../common/interfaces/prompt.interface';

export interface PromptContext {
  mode?: 'review' | 'explain' | 'fix' | 'chat' | string;
  locale?: string;
  [key: string]: any;
}

export class SecretPromptProvider implements IPromptProvider {
  private readonly logger = getLogger({ logName: 'SecretPromptProvider' });
  private secretsPath: string;
  private readonly isPackageSource: boolean = false;

  constructor(secretsPath?: string) {
    // Priority 1: Manual path provided (Runtime/User Secrets)
    if (secretsPath) {
      this.secretsPath = secretsPath;
      return;
    }

    // Priority 2: Workspace package @the-andb/secrets (Internal Secrets)
    try {
      const secretsPkgPath = path.dirname(require.resolve('@the-andb/secrets/package.json'));
      this.secretsPath = secretsPkgPath;
      this.isPackageSource = true;
      if (typeof this.logger.debug === 'function') {
        this.logger.debug(`📦 Using internal secrets from package: ${this.secretsPath}`);
      }
    } catch (e) {
      // Priority 3: Fallback to local cwd/secrets
      this.secretsPath = path.join(process.cwd(), 'secrets');
      if (typeof this.logger.debug === 'function') {
        this.logger.debug(`⚠️ @the-andb/secrets package not found. Using fallback: ${this.secretsPath}`);
      }
    }
  }

  public setSecretsPath(newPath: string) {
    this.secretsPath = newPath;
    (this as any).isPackageSource = false;
    this.logger.info(`📁 Secrets path updated to: ${this.secretsPath}`);
  }

  /**
   * Compliance with IPromptProvider
   */
  public async get(key: string, variables?: Record<string, any>): Promise<string> {
    return this.getPrompt(key, variables || {});
  }

  /**
   * Retrieves a prompt by name and injects context variables.
   * Pro-tip: Prompts are stored as .md files in the secrets directory.
   */
  public async getPrompt(name: string, context: PromptContext): Promise<string> {
    let filePath = path.join(this.secretsPath, 'prompts', `${name}.md`);
    
    try {
      if (!fs.existsSync(filePath)) {
        // Try common subdirectories: core/, personas/, reviews/
        const commonDirs = ['core', 'personas', 'reviews'];
        let found = false;
        for (const dir of commonDirs) {
           const subPath = path.join(this.secretsPath, 'prompts', dir, `${name.toLowerCase()}.md`);
           if (fs.existsSync(subPath)) {
              filePath = subPath;
              found = true;
              break;
           }
           // Also try case-insensitive or mapping CORE_SYSTEM -> system_base
           if (name === 'CORE_SYSTEM') {
              const baseSystemPath = path.join(this.secretsPath, 'prompts', 'core', 'system_base.md');
              if (fs.existsSync(baseSystemPath)) {
                 filePath = baseSystemPath;
                 found = true;
                 break;
              }
           }
           if (name === 'REVIEW_SCHEMA') {
              const reviewPath = path.join(this.secretsPath, 'prompts', 'reviews', 'migration.md');
              if (fs.existsSync(reviewPath)) {
                 filePath = reviewPath;
                 found = true;
                 break;
              }
           }
        }

        if (!found) {
           this.logger.warn(`⚠️ Prompt file not found for key: ${name}. Falling back to default.`);
           return this.getDefaultPrompt(name, context);
        }
      }

      let content = fs.readFileSync(filePath, 'utf-8');
      
      // Inject context variables using {{var}} syntax
      Object.entries(context).forEach(([key, value]) => {
        const regex = new RegExp(`{{${key}}}`, 'g');
        content = content.replace(regex, String(value));
      });

      return content;
    } catch (e: any) {
      this.logger.error(`❌ Error loading prompt ${name}: ${e.message}`);
      return this.getDefaultPrompt(name, context);
    }
  }

  /**
   * Fallback prompts if the secrets repo is not available or missing a file.
   * This ensures the app doesn't break.
   */
  private getDefaultPrompt(name: string, context: PromptContext): string {
    switch (name) {
      case 'schema-review':
        return `You are a Senior DBA expert in SQL performance and safety. 
                Mode: ${context.mode}. Language: ${context.locale}.
                Analyze the following DDL for potential risks.`;
      case 'chat-assistant':
        return `You are the Andb AI Assistant. You help users with database management. 
                Language: ${context.locale}.`;
      default:
        return 'You are a helpful AI assistant.';
    }
  }
}

export const secretPromptProvider = new SecretPromptProvider();
