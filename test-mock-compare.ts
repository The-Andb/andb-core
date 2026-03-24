import { Container } from './src/container';
import { DesktopStorageStrategy } from './src/modules/storage/strategy/desktop-storage.strategy';
import { ComparisonResult } from './src/common/interfaces';

async function testSaveComparison() {
  const strategy = new DesktopStorageStrategy();
  await strategy.initialize('sqlite', [], process.cwd());
  
  const mockComparison: ComparisonResult = {
    source_env: 'DEV',
    target_env: 'UAT',
    database_name: 'preflow_41',
    ddl_type: 'tables',
    ddl_name: 'admin_email_recipient',
    status: 'UPDATED',
    alter_statements: JSON.stringify(['ALTER TABLE admin_email_recipient ADD COLUMN new_flag INT;'])
  };

  await strategy.saveComparison(mockComparison);
  console.log('Saved comparison successfully.');
}

testSaveComparison().catch(console.error);
