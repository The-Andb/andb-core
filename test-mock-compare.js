const { BaseStorageStrategy } = require('./dist/modules/storage/strategy/base-storage.strategy');
const fs = require('fs');

// Patch fs to monitor writes
const origWrite = fs.writeFileSync;
fs.writeFileSync = function(file, content, options) {
  console.log(`[TEST FS MOCK] Caught Write -> ${file}`);
  return origWrite.call(fs, file, content, options);
};

class MockStorageStrategy extends BaseStorageStrategy {
  constructor() {
    super();
    // mock datasource setter
    Object.defineProperty(this, 'ds', {
      get: () => ({
        getRepository: () => ({
          save: async () => { console.log('Mocked DB save()'); },
          delete: async () => {},
          findOne: async () => {},
          find: async () => {} 
        }),
        query: async () => {}
      })
    });
    this.projectBaseDir = '/tmp/test-andb-storage';
  }
}

async function run() {
  const strategy = new MockStorageStrategy();
  const mockComparison = {
    source_env: 'DEV',
    target_env: 'UAT',
    database_name: 'preflow_41',
    ddl_type: 'tables',
    ddl_name: 'admin_email_recipient',
    status: 'UPDATED',
    alter_statements: JSON.stringify(['ALTER TABLE admin_email_recipient ADD COLUMN new_flag INT;'])
  };

  console.log('--- STARTING MOCK SAVE COMPARISON ---');
  await strategy.saveComparison(mockComparison);
  console.log('--- MOCK SAVE COMPARISON FINISHED ---');
}

run().catch(console.error);
