import 'reflect-metadata';
import { CoreBridge } from './src/index';

async function test() {
  try {
    const dataPath = '/Volumes/FlexibleWorkplace/side-pr/TheAndbData';
    const sqlitePath = '/Volumes/FlexibleWorkplace/side-pr/TheAndbData/the_andb.db';
    
    // Use the native CLI storage strategy instead of desktop one
    const { CliStorageStrategy } = require('./src/modules/storage/strategy/cli-storage.strategy');
    const strategy = new CliStorageStrategy();
    
    await CoreBridge.init(dataPath, sqlitePath, strategy, dataPath);
    
    console.log("Testing compare...");
    const result = await CoreBridge.execute('compare', {
      srcEnv: 'DEV',
      destEnv: 'UAT',
      type: 'tables'
    });
    
    console.log("Compare result:", JSON.stringify(result, null, 2));
    
  } catch (err) {
    console.error(err);
  }
}

test();
