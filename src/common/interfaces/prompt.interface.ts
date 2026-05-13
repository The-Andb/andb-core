/**
 * Interface for fetching AI prompts and instructions from an external registry.
 * This decouples the core logic from volatile system prompts.
 */
export interface IPromptProvider {
  /**
   * Fetches a prompt by its key and injects variables.
   * @param key The unique identifier for the prompt (e.g., 'CORE_SYSTEM', 'PERSONA_DBA')
   * @param variables Optional key-value pairs to inject into the prompt template
   */
  get(key: string, variables?: Record<string, any>): Promise<string>;
}
