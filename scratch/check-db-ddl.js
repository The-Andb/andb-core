const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Security decrypt helper
const keyDir = '/Volumes/FlexibleWorkplace/side-pr/TheAndbData/security';
const privateKeyPath = path.join(keyDir, 'private.pem');

function decrypt(text) {
  if (!text || !text.startsWith('ENC:')) return text;
  try {
    const privateKey = fs.readFileSync(privateKeyPath, 'utf-8');
    const buffer = Buffer.from(text.substring(4), 'base64');
    const decrypted = crypto.privateDecrypt(privateKey, buffer);
    return decrypted.toString('utf-8');
  } catch (e) {
    console.error('Decryption failed', e);
    return text;
  }
}

async function run() {
  const encPassword = 'ENC:QtAdpDOAqIok9+kh0ZqsDrmXPksqOZ0sTvXrtH6JKCJcBkapJ/HcBWQQh31m4o78Xt7F2CbVGYvzDaMRdSXqmNM/aKLFumuMW30Q+rgxisqDjMc04KBTEPc0/j2xL2caZ55bpL4SAT3MUP88NRCClFj1yexK+O1YAqe+bVCSoVPga/evnWyR9GLSDOtSfUwadzojQr08ZPIsIyuqKnvpg4fDMZdwjL8skF0xrKRAU0Mhx+UDV/rXNLH83p4j6d8zbezVaiht98YYYSDll5kIMxuxU4ZWk5OtvVhEhO0YQ2MZbkhqqwUOLN80nsy7EQMcW25H5o0VNh9trDwpq6K+Ew==';
  const password = decrypt(encPassword);
  
  const connection = await mysql.createConnection({
    host: 'k8s-dev-cluster-encrypted-241004-1000.cluster-cla60mus40wf.ap-southeast-1.rds.amazonaws.com',
    port: 3306,
    user: 'anph',
    password: password,
    database: 'preflow_41'
  });
  
  console.log('Connected to MySQL!');
  
  const [rows] = await connection.query('SHOW CREATE PROCEDURE `admin_getGroups`');
  console.log('SHOW CREATE PROCEDURE output:');
  console.log(JSON.stringify(rows[0], null, 2));
  
  await connection.end();
}

run().catch(console.error);
