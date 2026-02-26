import { DumpIntrospectionService } from '../dump.introspection';
import { DumpDriver } from '../dump.driver';

describe('DumpIntrospectionService', () => {
  let service: DumpIntrospectionService;
  let mockDriver: Partial<DumpDriver>;

  beforeEach(() => {
    mockDriver = {
      data: {
        TABLES: new Map([['users', 'CREATE TABLE users;']]),
        VIEWS: new Map([['v_users', 'CREATE VIEW v_users;']]),
        PROCEDURES: new Map(),
        FUNCTIONS: new Map(),
        TRIGGERS: new Map(),
        EVENTS: new Map(),
      }
    };
    service = new DumpIntrospectionService(mockDriver as DumpDriver);
  });

  it('should list tables', async () => {
    const tables = await service.listTables();
    expect(tables).toEqual(['users']);
  });

  it('should get table DDL', async () => {
    const ddl = await service.getTableDDL('db', 'users');
    expect(ddl).toBe('CREATE TABLE users;');
  });

  it('should list views', async () => {
    const views = await service.listViews();
    expect(views).toEqual(['v_users']);
  });

  it('should return empty list if type not initialized', async () => {
    const procs = await service.listProcedures();
    expect(procs).toEqual([]);
  });

  describe('getObjectDDL', () => {
    it('should return DDL based on type', async () => {
      const tableDDL = await service.getObjectDDL('db', 'TABLE', 'users');
      const viewDDL = await service.getObjectDDL('db', 'VIEW', 'v_users');
      const unknownDDL = await service.getObjectDDL('db', 'UNKNOWN', 'any');

      expect(tableDDL).toBe('CREATE TABLE users;');
      expect(viewDDL).toBe('CREATE VIEW v_users;');
      expect(unknownDDL).toBe('');
    });

    it('should handle PROCEDURE type', async () => {
      (mockDriver.data as any).PROCEDURES.set('sp1', 'CREATE PROCEDURE sp1() BEGIN END;');
      const ddl = await service.getObjectDDL('db', 'PROCEDURE', 'sp1');
      expect(ddl).toBe('CREATE PROCEDURE sp1() BEGIN END;');
    });

    it('should handle FUNCTION type', async () => {
      (mockDriver.data as any).FUNCTIONS.set('fn1', 'CREATE FUNCTION fn1() RETURNS INT BEGIN RETURN 1; END;');
      const ddl = await service.getObjectDDL('db', 'FUNCTION', 'fn1');
      expect(ddl).toContain('CREATE FUNCTION fn1');
    });

    it('should handle TRIGGER type', async () => {
      (mockDriver.data as any).TRIGGERS.set('trg1', 'CREATE TRIGGER trg1 BEFORE INSERT ON users FOR EACH ROW BEGIN END;');
      const ddl = await service.getObjectDDL('db', 'TRIGGER', 'trg1');
      expect(ddl).toContain('CREATE TRIGGER trg1');
    });

    it('should handle EVENT type', async () => {
      (mockDriver.data as any).EVENTS.set('ev1', 'CREATE EVENT ev1 ON SCHEDULE EVERY 1 DAY;');
      const ddl = await service.getObjectDDL('db', 'EVENT', 'ev1');
      expect(ddl).toContain('CREATE EVENT ev1');
    });
  });

  describe('individual DDL getters', () => {
    it('should get view DDL', async () => {
      const ddl = await service.getViewDDL('db', 'v_users');
      expect(ddl).toBe('CREATE VIEW v_users;');
    });

    it('should get procedure DDL', async () => {
      (mockDriver.data as any).PROCEDURES.set('sp1', 'CREATE PROCEDURE sp1();');
      const ddl = await service.getProcedureDDL('db', 'sp1');
      expect(ddl).toBe('CREATE PROCEDURE sp1();');
    });

    it('should get function DDL', async () => {
      (mockDriver.data as any).FUNCTIONS.set('fn1', 'CREATE FUNCTION fn1();');
      const ddl = await service.getFunctionDDL('db', 'fn1');
      expect(ddl).toBe('CREATE FUNCTION fn1();');
    });

    it('should get trigger DDL', async () => {
      (mockDriver.data as any).TRIGGERS.set('trg1', 'CREATE TRIGGER trg1;');
      const ddl = await service.getTriggerDDL('db', 'trg1');
      expect(ddl).toBe('CREATE TRIGGER trg1;');
    });

    it('should get event DDL', async () => {
      (mockDriver.data as any).EVENTS.set('ev1', 'CREATE EVENT ev1;');
      const ddl = await service.getEventDDL('db', 'ev1');
      expect(ddl).toBe('CREATE EVENT ev1;');
    });

    it('should return empty string for missing objects', async () => {
      expect(await service.getProcedureDDL('db', 'nonexistent')).toBe('');
      expect(await service.getFunctionDDL('db', 'nonexistent')).toBe('');
      expect(await service.getTriggerDDL('db', 'nonexistent')).toBe('');
      expect(await service.getEventDDL('db', 'nonexistent')).toBe('');
    });
  });

  describe('list methods', () => {
    it('should list functions', async () => {
      (mockDriver.data as any).FUNCTIONS.set('fn1', 'def');
      expect(await service.listFunctions()).toEqual(['fn1']);
    });

    it('should list triggers', async () => {
      (mockDriver.data as any).TRIGGERS.set('t1', 'def');
      expect(await service.listTriggers()).toEqual(['t1']);
    });

    it('should list events', async () => {
      (mockDriver.data as any).EVENTS.set('e1', 'def');
      expect(await service.listEvents()).toEqual(['e1']);
    });
  });

  describe('getChecksums', () => {
    it('should return empty object', async () => {
      expect(await service.getChecksums()).toEqual({});
    });
  });
});
