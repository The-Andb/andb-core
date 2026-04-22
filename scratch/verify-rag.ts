import * as path from 'path';
import { KnowledgeService } from '../src/modules/knowledge/knowledge.service';

async function verify() {
  const docsPath = path.join(__dirname, '../../docs');
  console.log(`Checking docs at: ${docsPath}`);
  
  const knowledge = new KnowledgeService(docsPath);
  await knowledge.load();

  const queries = [
    'What is the MCP server?',
    'How do I compare schemas?',
    'What features does the GUI have?',
    'Tell me about semantic diffing'
  ];

  for (const q of queries) {
    console.log(`\n--- Query: "${q}" ---`);
    const result = knowledge.search(q);
    if (result) {
      console.log(result);
    } else {
      console.log('No relevant context found.');
    }
  }
}

verify().catch(console.error);
