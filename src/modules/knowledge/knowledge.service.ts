import * as fs from 'fs';
import * as path from 'path';

export interface KnowledgeChunk {
  file: string;
  section: string;
  content: string;
}

export class KnowledgeService {
  private chunks: KnowledgeChunk[] = [];
  private isLoaded = false;

  constructor(private readonly docsPath: string) {}

  /**
   * Load and parse all documentation files into searchable chunks.
   */
  public async load() {
    if (this.isLoaded) return;

    try {
      if (!fs.existsSync(this.docsPath)) {
        console.warn(`[KnowledgeService] Docs path not found: ${this.docsPath}`);
        return;
      }

      const files = fs.readdirSync(this.docsPath).filter(f => f.endsWith('.md'));
      
      for (const file of files) {
        const content = fs.readFileSync(path.join(this.docsPath, file), 'utf8');
        this.parseFile(file, content);
      }

      this.isLoaded = true;
      console.log(`[KnowledgeService] Loaded ${this.chunks.length} chunks from ${files.length} files.`);
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
   * keyword-based search with improved weighting.
   */
  public search(query: string, limit = 3): string {
    if (!query || this.chunks.length === 0) return '';
    
    const keywords = query.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(k => k.length > 2);
      
    if (keywords.length === 0) return '';

    // Score chunks by keyword matches
    const scored = this.chunks.map(chunk => {
      let score = 0;
      const lowerContent = chunk.content.toLowerCase();
      const lowerSection = chunk.section.toLowerCase();

      for (const kw of keywords) {
        // Boost for exact word match vs partial match
        if (lowerContent.includes(kw)) {
          score += 1;
          if (new RegExp(`\\b${kw}\\b`, 'i').test(lowerContent)) score += 2;
        }
        
        if (lowerSection.includes(kw)) {
          score += 5; // Title match is very important
          if (new RegExp(`\\b${kw}\\b`, 'i').test(lowerSection)) score += 5;
        }
      }

      return { chunk, score };
    });

    const relevant = scored
      .filter(s => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(s => {
        return `### Internal Documentation: ${s.chunk.section} (from ${s.chunk.file})\n${s.chunk.content}`;
      })
      .join('\n\n---\n\n');

    return relevant;
  }
}
