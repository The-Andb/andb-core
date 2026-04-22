import * as fs from 'fs';
import * as path from 'path';
import { VaultMigrationService } from './src/modules/storage/migration/vault-migration.service';
import { ProjectConfigService } from './src/modules/config/project-config.service';

const mockProjectDir = path.join(process.cwd(), 'scratch', 'mock_vault');

async function testMigration() {
  console.log('--- Testing Vault Migration ---');
  
  // 1. Setup mock legacy structure
  const legacyDir = path.join(mockProjectDir, 'db', 'DEV', 'my_legacy_db');
  fs.mkdirSync(legacyDir, { recursive: true });
  fs.writeFileSync(path.join(legacyDir, 'table1.sql'), 'CREATE TABLE table1 (...)');
  
  console.log(`Created mock legacy vault at: ${legacyDir}`);

  // 2. Setup mock config
  const mockConfigService = {
    getConnection: (env: string) => ({ type: 'mysql' })
  } as any;

  // 3. Run migration
  const migration = new VaultMigrationService(mockConfigService, mockProjectDir);
  await migration.migrate();

  // 4. Verify
  const newPath = path.join(mockProjectDir, 'db', 'DEV', 'mysql', 'my_legacy_db');
  if (fs.existsSync(newPath) && fs.existsSync(path.join(newPath, 'table1.sql'))) {
    console.log('✅ Migration SUCCESS: Folder moved to mysql isolated path');
  } else {
    console.error('❌ Migration FAILED: Folder not found at ' + newPath);
  }
}

testMigration().catch(console.error);
