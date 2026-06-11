const tableSQL = `CREATE TABLE \`mail_identifiers\` (
  \`id\` BIGINT NOT NULL AUTO_INCREMENT,
  \`username\` VARCHAR(255) NOT NULL DEFAULT '',
  \`header_message_id\` VARCHAR(200) DEFAULT NULL,
  \`imap_folder\` VARCHAR(100) DEFAULT NULL,
  \`jmap_id\` VARCHAR(255) DEFAULT NULL,
  \`new_uid_bin\` VARBINARY(1000) GENERATED ALWAYS AS (concat(unhex(lpad(hex(cast(\`imap_new_uid\` AS UNSIGNED)),8,_latin1'0')),unhex(_utf8mb4'00000000'),CONVERT(\`imap_folder\` USING BINARY))) VIRTUAL,
  \`imap_new_uid\` INT DEFAULT NULL,
  \`uidvalidity\` VARCHAR(32) DEFAULT NULL,
  \`uid_bin\` VARBINARY(1000) GENERATED ALWAYS AS (concat(unhex(lpad(hex(cast(\`imap_uid\` AS UNSIGNED)),8,_latin1'0')),unhex(_utf8mb4'00000000'),CONVERT(\`imap_folder\` USING BINARY))) STORED,
  \`imap_uid\` INT DEFAULT NULL,
  \`imap_u_info\` TEXT,
  \`created_date\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  \`updated_date\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  \`deleted_date\` datetime DEFAULT NULL,
  \`event_detail\` json DEFAULT NULL,
  PRIMARY KEY (\`id\`,\`username\`),
  KEY \`idx_new_uid\` (\`username\`,\`imap_folder\`,\`imap_new_uid\`),
  UNIQUE KEY \`idx_uid\` (\`username\`,\`imap_uid\`,\`imap_folder\`),
  KEY \`idx_username_uid_bin\` (\`username\`,\`uid_bin\`),
  KEY \`imap_mapping_uid_jmap_id_IDX\` (\`jmap_id\`) USING BTREE,
  UNIQUE KEY \`uq_jmap\` (\`username\`,\`jmap_id\`),
  UNIQUE KEY \`uq_message_id\` (\`username\`,\`header_message_id\`),
  UNIQUE KEY \`uq_uid\` (\`username\`,\`imap_uid\`,\`imap_folder\`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1
/*!50100 PARTITION BY KEY (username)
PARTITIONS 32 */`;

const firstParen = tableSQL.indexOf('(');
let lastParen = -1;
let depth = 0;
let scanInQuote = false;
let scanQuoteChar = '';

for (let i = firstParen; i < tableSQL.length; i++) {
  const char = tableSQL[i];
  if (scanInQuote) {
    if (char === scanQuoteChar && tableSQL[i - 1] !== '\\') {
      scanInQuote = false;
    }
  } else {
    if (char === "'" || char === '"' || char === '`') {
      scanInQuote = true;
      scanQuoteChar = char;
    } else if (char === '(') {
      depth++;
    } else if (char === ')') {
      depth--;
      if (depth === 0) {
        lastParen = i;
        break;
      }
    }
  }
}
console.log('firstParen:', firstParen);
console.log('lastParen:', lastParen);
console.log('Sub:', tableSQL.substring(lastParen));
