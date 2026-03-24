import { ParserService } from './src/modules/parser/parser.service';
import * as util from 'util';

const parser = new ParserService();

const testCases = [
  {
    name: '1. Comments in between columns',
    ddl: `
CREATE TABLE \`users\` (
  \`id\` int NOT NULL AUTO_INCREMENT,
  -- This is a comment
  \`email\` varchar(255) NOT NULL, /* inline comment */
  \`name\` varchar(50) DEFAULT NULL,
  PRIMARY KEY (\`id\`)
) ENGINE=InnoDB;
    `
  },
  {
    name: '2. Complex ENUM with commas inside',
    ddl: `
CREATE TABLE \`students\` (
  \`id\` int NOT NULL,
  \`grade\` enum('A+, B+', 'C, D', 'F') NOT NULL DEFAULT 'C, D',
  PRIMARY KEY (\`id\`)
) ENGINE=InnoDB;
    `
  },
  {
    name: '3. Default JSON_ARRAY or Expressions',
    ddl: `
CREATE TABLE \`settings\` (
  \`id\` int NOT NULL,
  \`config\` json DEFAULT (JSON_ARRAY()),
  \`created_at\` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`)
);
    `
  },
  {
    name: '4. Partition Clauses',
    ddl: `
CREATE TABLE \`logs\` (
  \`id\` int NOT NULL,
  \`message\` text NOT NULL,
  \`created_at\` date NOT NULL
) ENGINE=InnoDB
PARTITION BY RANGE (YEAR(\`created_at\`)) (
    PARTITION p0 VALUES LESS THAN (1990),
    PARTITION p1 VALUES LESS THAN (2000),
    PARTITION p2 VALUES LESS THAN MAXVALUE
);
    `
  }
];

console.log('--- AST VS REGEX PARSER BENCHMARK ---');

for (const t of testCases) {
  console.log(`\n=== Test: ${t.name} ===`);
  const regexResult = parser.parseTableDetailedRegex(t.ddl.trim());
  const astResult = parser.parseTableDetailed(t.ddl.trim());
  
  if (astResult) {
      console.log('AST Columns count:', astResult.columns.length);
      console.log('AST Parsed Columns:', astResult.columns.map(c => c.name + ' (' + c.type + ')').join(', '));
  } else {
      console.log('AST parser failed to parse.');
  }

  if (regexResult) {
      console.log('REG Columns count:', regexResult.columns.length);
  } else {
      console.log('REG parser failed to parse.');
  }
  
  // Custom inspection
  if (t.name.includes('ENUM')) {
     console.log('AST Enum Default:', astResult?.columns.find(c => c.name === 'grade')?.default);
     console.log('REG Enum Default:', regexResult?.columns.find(c => c.name === 'grade')?.default);
  }

  if (t.name.includes('JSON')) {
     console.log('AST JSON Default:', astResult?.columns.find(c => c.name === 'config')?.default);
     console.log('REG JSON Default:', regexResult?.columns.find(c => c.name === 'config')?.default);
  }

  if (t.name.includes('Partition')) {
     console.log('AST Partitions:', astResult?.partitions ? 'Detected' : 'None');
     console.log('REG Partitions:', regexResult?.partitions ? 'Detected' : 'None');
  }
}
