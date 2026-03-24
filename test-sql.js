const { Parser } = require('node-sql-parser');
const parser = new Parser();

const ddl = `
CREATE TABLE \`users\` (
  \`id\` int(11) NOT NULL AUTO_INCREMENT,
  \`username\` varchar(50) NOT NULL,
  \`password\` varchar(255) NOT NULL,
  PRIMARY KEY (\`id\`),
  DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
);
`;

try {
  const ast = parser.astify(ddl);
  console.log(JSON.stringify(ast, null, 2));
} catch (e) {
  console.error("Parse error:", e);
}
