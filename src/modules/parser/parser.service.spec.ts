import { Test, TestingModule } from '@nestjs/testing';
import { ParserService } from './parser.service';

describe('ParserService', () => {
  let service: ParserService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ParserService],
    }).compile();

    service = module.get<ParserService>(ParserService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  const tests = [
    {
      name: "Remove DEFINER simple",
      input: "CREATE DEFINER=`root`@`localhost` PROCEDURE `test`() BEGIN SELECT 1; END",
      expected: "CREATE PROCEDURE `test`() BEGIN SELECT 1; END"
    },
    {
      name: "Remove DEFINER complex user",
      input: "CREATE DEFINER=`some-user`@`%.example.com` FUNCTION `func`() RETURNS INT BEGIN RETURN 1; END",
      expected: "CREATE FUNCTION `func`() RETURNS INT BEGIN RETURN 1; END"
    },
    {
      name: "Ignore Whitespace",
      input: "CREATE   PROCEDURE    `test`()\nBEGIN\n  SELECT 1;\nEND",
      expected: "CREATE PROCEDURE `test`() BEGIN SELECT 1; END",
      options: { ignoreWhitespace: true }
    },
    {
      name: "Full cleanup (Definer + Whitespace)",
      input: "CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_test`()\nBEGIN\n  SELECT * FROM users;\nEND",
      expected: "CREATE PROCEDURE `sp_test`() BEGIN SELECT * FROM users; END",
      options: { ignoreDefiner: true, ignoreWhitespace: true }
    },
    {
      name: "Preserve body spacing if not ignoring whitespace (only header clean)",
      input: "CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_test`()\nBEGIN\n  SELECT internal;\nEND",
      expected: "CREATE PROCEDURE `sp_test`()\nBEGIN\n  SELECT internal;\nEND",
      options: { ignoreDefiner: true, ignoreWhitespace: false }
    }
  ];

  tests.forEach(testCase => {
    it(testCase.name, () => {
      const result = service.normalize(testCase.input, testCase.options || { ignoreDefiner: true });

      const normalizeSpace = (s: string) => s.replace(/\s+/g, ' ').trim();

      if (testCase.options?.ignoreWhitespace) {
        expect(result).toBe(testCase.expected);
      } else {
        expect(normalizeSpace(result)).toBe(normalizeSpace(testCase.expected));
      }
    });
  });

  describe('parseTable', () => {
    it('should parse a complex CREATE TABLE with columns, PK, indexes, and FK', () => {
      const ddl = `CREATE TABLE \`orders\` (
  \`id\` int NOT NULL AUTO_INCREMENT,
  \`user_id\` int NOT NULL,
  \`total\` decimal(10,2) DEFAULT '0.00',
  PRIMARY KEY (\`id\`),
  KEY \`idx_user_id\` (\`user_id\`),
  CONSTRAINT \`fk_user\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\` (\`id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`;

      const result = service.parseTable(ddl);
      expect(result).not.toBeNull();
      expect(result!.tableName).toBe('orders');
      expect(Object.keys(result!.columns)).toEqual(['id', 'user_id', 'total']);
      expect(result!.indexes['idx_user_id']).toBeDefined();
      expect(result!.foreignKeys['fk_user']).toBeDefined();
      expect(result!.primaryKey).toContain('id');
    });

    it('should return null for invalid DDL', () => {
      expect(service.parseTable('SELECT 1')).toBeNull();
      expect(service.parseTable('')).toBeNull();
    });

    it('should handle FULLTEXT and SPATIAL keys', () => {
      const ddl = `CREATE TABLE \`articles\` (
  \`id\` int NOT NULL,
  \`title\` varchar(255),
  \`geo\` geometry,
  FULLTEXT KEY \`ft_title\` (\`title\`),
  SPATIAL KEY \`sp_geo\` (\`geo\`)
) ENGINE=InnoDB`;

      const result = service.parseTable(ddl);
      expect(result).not.toBeNull();
      expect(result!.indexes['ft_title']).toBeDefined();
      expect(result!.indexes['sp_geo']).toBeDefined();
    });

    it('should handle table with no indexes', () => {
      const ddl = `CREATE TABLE \`simple\` (
  \`id\` int,
  \`name\` varchar(255)
)`;

      const result = service.parseTable(ddl);
      expect(result).not.toBeNull();
      expect(Object.keys(result!.indexes)).toHaveLength(0);
      expect(Object.keys(result!.foreignKeys)).toHaveLength(0);
    });
  });

  describe('parseTrigger', () => {
    it('should parse BEFORE INSERT trigger', () => {
      const ddl = 'CREATE TRIGGER `tr_before_insert` BEFORE INSERT ON `users` FOR EACH ROW BEGIN SET NEW.created = NOW(); END';
      const result = service.parseTrigger(ddl);

      expect(result).not.toBeNull();
      expect(result!.triggerName).toBe('tr_before_insert');
      expect(result!.timing).toBe('BEFORE');
      expect(result!.event).toBe('INSERT');
      expect(result!.tableName).toBe('users');
    });

    it('should parse AFTER UPDATE trigger', () => {
      const ddl = 'CREATE TRIGGER `tr_after_update` AFTER UPDATE ON `orders` FOR EACH ROW BEGIN END';
      const result = service.parseTrigger(ddl);

      expect(result!.timing).toBe('AFTER');
      expect(result!.event).toBe('UPDATE');
      expect(result!.tableName).toBe('orders');
    });

    it('should parse BEFORE DELETE trigger', () => {
      const ddl = 'CREATE TRIGGER `tr_before_delete` BEFORE DELETE ON `logs` FOR EACH ROW BEGIN END';
      const result = service.parseTrigger(ddl);

      expect(result!.timing).toBe('BEFORE');
      expect(result!.event).toBe('DELETE');
    });

    it('should return null for invalid trigger DDL', () => {
      expect(service.parseTrigger('SELECT 1')).toBeNull();
      expect(service.parseTrigger('CREATE TABLE foo (id int)')).toBeNull();
    });
  });

  describe('splitRoutine', () => {
    it('should split routine at BEGIN keyword', () => {
      const ddl = 'CREATE PROCEDURE `test`()\nBEGIN\n  SELECT 1;\nEND';
      const result = service.splitRoutine(ddl);

      expect(result).not.toBeNull();
      expect(result!.header).toBe('CREATE PROCEDURE `test`()');
      expect(result!.body).toContain('BEGIN');
    });

    it('should return null if no BEGIN keyword', () => {
      const ddl = 'CREATE VIEW v1 AS SELECT 1';
      expect(service.splitRoutine(ddl)).toBeNull();
    });

    it('should return null for empty input', () => {
      expect(service.splitRoutine('')).toBeNull();
    });
  });

  describe('cleanDefiner', () => {
    it('should remove DEFINER clause with quoted user', () => {
      const input = "CREATE DEFINER=`root`@`localhost` PROCEDURE `test`() BEGIN END";
      const result = service.cleanDefiner(input);
      expect(result).not.toContain('DEFINER');
      expect(result).toContain('CREATE PROCEDURE `test`()');
    });

    it('should handle unquoted DEFINER', () => {
      const input = "CREATE DEFINER=root@localhost VIEW `v1` AS SELECT 1";
      const result = service.cleanDefiner(input);
      expect(result).not.toContain('DEFINER');
    });

    it('should return input unchanged if no DEFINER', () => {
      const input = "CREATE TABLE `users` (`id` int)";
      const result = service.cleanDefiner(input);
      expect(result).toBe(input);
    });
  });

  describe('uppercaseKeywords', () => {
    it('should uppercase SQL keywords', () => {
      const input = 'select id from users where name = "test"';
      const result = service.uppercaseKeywords(input);
      expect(result).toContain('SELECT');
      expect(result).toContain('FROM');
      expect(result).toContain('WHERE');
    });

    it('should preserve backtick-quoted identifiers in lowercase', () => {
      const input = 'SELECT `group` FROM `users`';
      const result = service.uppercaseKeywords(input);
      expect(result).toContain('`group`');
    });

    it('should convert tabs to double spaces', () => {
      const input = "SELECT\tid\tFROM\tusers";
      const result = service.uppercaseKeywords(input);
      expect(result).not.toContain('\t');
    });

    it('should not modify non-keyword words', () => {
      const input = 'select username from accounts';
      const result = service.uppercaseKeywords(input);
      expect(result).toContain('username');
      expect(result).toContain('accounts');
    });

    it('should handle CREATE TABLE with multiple keywords', () => {
      const input = 'create table `users` (id int not null, primary key (id))';
      const result = service.uppercaseKeywords(input);
      expect(result).toContain('CREATE');
      expect(result).toContain('TABLE');
      expect(result).toContain('NOT');
      expect(result).toContain('NULL');
      expect(result).toContain('PRIMARY');
      expect(result).toContain('KEY');
    });
  });

  describe('normalize edge cases', () => {
    it('should return empty string for empty input', () => {
      expect(service.normalize('')).toBe('');
    });

    it('should return same string with no options', () => {
      const input = 'CREATE TABLE `test` (`id` int)';
      expect(service.normalize(input)).toBe(input);
    });
  });
});
