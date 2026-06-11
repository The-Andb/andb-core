const { CoreBridge } = require('../dist/core-bridge');
const { DesktopStorageStrategy } = require('../../andb-desktop/electron/storage/strategy/desktop-storage.strategy');
const path = require('path');

async function run() {
  const dbPath = '/Volumes/FlexibleWorkplace/side-pr/TheAndbData/andb-storage.db';
  const projectBaseDir = '/Volumes/FlexibleWorkplace/side-pr/TheAndbData';
  const userDataPath = '/Users/anph/Library/Application Support/TheAndb_v3_dev';
  
  console.log('Initializing CoreBridge with strategy and DB...');
  const strategy = new DesktopStorageStrategy();
  await CoreBridge.init(userDataPath, dbPath, strategy, projectBaseDir);
  console.log('CoreBridge initialized successfully! Check if columns are healed.');
}

run().catch(console.error);
