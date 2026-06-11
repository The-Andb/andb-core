const { Container } = require('../dist/container');

async function main() {
  const container = new Container();
  await container.boot();
  
  const configService = container.get('ProjectConfigService');
  const driverFactory = container.get('DriverFactoryService');
  
  const envName = 'DEV'; // Let's check DEV
  const connection = configService.getConnection(envName);
  if (!connection) {
    console.error('No connection config for DEV');
    process.exit(1);
  }
  
  const driver = await driverFactory.create(connection.type, connection.config);
  await driver.connect();
  
  try {
    const results = await driver.query('SHOW CREATE TABLE `mail_identifiers`');
    console.log('RAW DDL FROM MYSQL:');
    console.log(JSON.stringify(results[0]));
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await driver.disconnect();
  }
}

main();
