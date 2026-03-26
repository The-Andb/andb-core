
import * as fs from 'fs';
import * as path from 'path';
import { ParserService } from '../src/modules/parser/parser.service';
import { ComparatorService } from '../src/modules/comparator/comparator.service';
import { SemanticDiffService } from '../src/modules/comparator/semantic-diff.service';
import { MysqlMigrator } from '../src/modules/migrator/mysql/mysql.migrator';

async function run() {
  const f1Path = path.join(__dirname, 'f1.sql');
  const f2Path = path.join(__dirname, 'f2.sql');

  if (!fs.existsSync(f1Path) || !fs.existsSync(f2Path)) {
    console.error('❌ f1.sql or f2.sql not found in scripts directory.');
    process.exit(1);
  }

  const f1 = fs.readFileSync(f1Path, 'utf8');
  const f2 = fs.readFileSync(f2Path, 'utf8');

  const parser = new ParserService();
  const semantic = new SemanticDiffService();
  const comparator = new ComparatorService(parser, {} as any, {} as any);
  const migrator = new MysqlMigrator();

  console.log('🚀 THE ANDB - CORE PLAYGROUND');
  console.log('-------------------------------');
  console.log(`Comparing: scripts/f1.sql -> scripts/f2.sql\n`);

  // Phase 1: Semantic Analysis
  console.log('📋 [PHASE 1] SEMANTIC ANALYSIS');
  try {
    const report = await semantic.compare(f1, f2);
    if (report.summary.length === 0) {
      console.log('✅ No semantic differences detected.');
    } else {
      report.summary.forEach(s => console.log(`  - ${s}`));
      console.log('\nDetailed changes:');
      console.log(JSON.stringify(report.tables, null, 2));
    }
  } catch (e: any) {
    console.warn(`⚠️  Semantic analysis failed: ${e.message}`);
  }

  // Phase 2: Migration SQL Generation
  console.log('\n🛠️  [PHASE 2] MIGRATION SQL');
  try {
    const result = await comparator.compareArbitraryDDL(f1, f2);
    if (result.status === 'equal') {
      console.log('✅ SQL definitions are identical.');
    } else {
        console.log(`Status: ${result.status.toUpperCase()}`);
        if (result.alterStatements && result.alterStatements.length > 0) {
            console.log('\nGenerated SQL:');
            console.log(result.alterStatements.join('\n'));
        } else {
            console.log('⚠️  Change detected but no SQL generated.');
        }
    }
  } catch (e: any) {
    console.error(`❌ Migration generation failed: ${e.message}`);
  }
}

run().catch(console.error);
