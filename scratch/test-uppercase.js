const keywords = new Set([
  'ACCESSIBLE',
  'ADD',
  'ALL',
  'ALTER',
  'ANALYZE',
  'AND',
  'AS',
  'ASC',
  'ASENSITIVE',
  'BEFORE',
  'BETWEEN',
  'BIGINT',
  'BINARY',
  'BLOB',
  'BOTH',
  'BY',
  'CALL',
  'CASCADE',
  'CASE',
  'CHANGE',
  'CHAR',
  'CHARACTER',
  'CHECK',
  'COLLATE',
  'COLUMN',
  'CREATE',
  'PROCEDURE',
  'VIEW',
  'TRIGGER'
]);

function uppercaseKeywords(query) {
  return query
    .replace(/`[^`]*`|'[^']*'|"[^"]*"|\b[a-zA-Z_]+\b/g, (match) => {
      if (match.startsWith('`') || match.startsWith("'") || match.startsWith('"')) {
        return match; // Keep literals and identifiers untouched
      }
      return keywords.has(match.toUpperCase()) ? match.toUpperCase() : match;
    })
    .replace(/\`(GROUP|USER|GROUPS)\`/ig, (match, p1) => `\`${p1.toLowerCase()}\``)
    .replace(/\t/g, '  ');
}

const input = "CREATE DEFINER=`root`@`localhost` PROCEDURE `admin_getGroups`() BEGIN SELECT 1; END";
console.log("Input:", input);
console.log("Output:", uppercaseKeywords(input));
