import * as fs from 'fs';
import * as path from 'path';

export interface KnowledgeChunk {
  file: string;
  section: string;
  content: string;
}

export class KnowledgeService {
  private docsPaths: string[] = [];
  private chunks: KnowledgeChunk[] = [];
  private isLoaded = false;

  constructor(initialDocsPath?: string) {
    if (initialDocsPath) {
      this.docsPaths.push(initialDocsPath);
    }
  }

  public addPath(p: string) {
    if (p && !this.docsPaths.includes(p)) {
      this.docsPaths.push(p);
    }
  }

  /**
   * Load and parse all documentation files into searchable chunks.
   */
  public async load() {
    if (this.isLoaded) return;

    try {
      for (const docsPath of this.docsPaths) {
        if (!fs.existsSync(docsPath)) {
          console.warn(`[KnowledgeService] Docs path not found: ${docsPath}`);
          continue;
        }

        const files = fs.readdirSync(docsPath).filter(f => f.endsWith('.md'));
        
        for (const file of files) {
          const content = fs.readFileSync(path.join(docsPath, file), 'utf8');
          this.parseFile(file, content);
        }
        console.log(`[KnowledgeService] Loaded chunks from ${docsPath}`);
      }

      this.isLoaded = true;
      console.log(`[KnowledgeService] Total loaded ${this.chunks.length} chunks.`);
    } catch (error: any) {
      console.error(`[KnowledgeService] Failed to load knowledge base: ${error.message}`);
    }
  }

  private parseFile(fileName: string, content: string) {
    // Simple parser: split by H2 headers (##)
    const sections = content.split(/\n(?=## )/);
    
    for (const section of sections) {
      const titleMatch = section.match(/^#+ (.*)/);
      const title = titleMatch ? titleMatch[1] : fileName;
      
      this.chunks.push({
        file: fileName,
        section: title,
        content: section.trim()
      });
    }
  }

  /**
   * Hybrid search: combines keyword matching with semantic-like scoring.
   * Foundation for real Vector Embeddings if a provider is configured.
   */
  public search(query: string, limit = 5): string {
    if (!query || this.chunks.length === 0) return '';
    
    const queryTokens = this.tokenize(query);
    if (queryTokens.length === 0) return '';

    // Hybrid Scoring logic
    const scored = this.chunks.map(chunk => {
      let score = 0;
      const contentTokens = this.tokenize(chunk.content);
      const sectionTokens = this.tokenize(chunk.section);

      // 1. Keyword Overlap (TF-IDF inspired)
      queryTokens.forEach(token => {
        // High boost for Section/Title matches
        if (sectionTokens.includes(token)) {
          score += 10;
          if (chunk.section.toLowerCase() === token) score += 20; // Exact match
        }

        // Content matches
        const count = contentTokens.filter(t => t === token).length;
        if (count > 0) {
          score += Math.log(1 + count) * 2;
        }

        // Fuzzy match for similar words (Levenshtein-ish)
        if (token.length > 4) {
          sectionTokens.forEach(st => {
            if (st.includes(token) || token.includes(st)) score += 2;
          });
        }
      });

      // 2. Semantic Proximity (Simplified: checking if many query terms appear close together)
      const lowerContent = chunk.content.toLowerCase();
      let matchCount = 0;
      queryTokens.forEach(t => { if (lowerContent.includes(t)) matchCount++; });
      if (matchCount > 1) {
        score += (matchCount / queryTokens.length) * 5;
      }

      return { chunk, score };
    });

    const relevant = scored
      .filter(s => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(s => {
        return `[Source: ${s.chunk.file} > ${s.chunk.section}]\n${s.chunk.content}`;
      })
      .join('\n\n---\n\n');

    return relevant;
  }

  private tokenize(text: string): string[] {
    return text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(k => k.length > 2);
  }
}
