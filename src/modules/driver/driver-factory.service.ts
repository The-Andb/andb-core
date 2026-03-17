import { IDatabaseConfig, ConnectionType } from '../../common/interfaces/connection.interface';
import { MysqlDriver } from './mysql/mysql.driver';
import { IDatabaseDriver } from '../../common/interfaces/driver.interface';
import { DumpDriver } from './dump/dump.driver';
import { FileDriver } from './file/file.driver';
import { PostgresDriver } from './postgres/postgres.driver';
import { SqliteDbDriver } from './sqlite/sqlite.driver';
import { ParserService } from '../parser/parser.service';

export class DriverFactoryService {
  constructor(private readonly parser: ParserService) { }

  async create(type: ConnectionType, config: IDatabaseConfig): Promise<IDatabaseDriver> {
    const t = type as string;
    if (t === 'mysql' || t === 'mariadb') {
      return new MysqlDriver(config);
    }

    if (t === ConnectionType.POSTGRES) {
      return new PostgresDriver(config);
    }

    if (t === ConnectionType.DUMP) {
      return new DumpDriver(config, this.parser);
    }

    if (t === ConnectionType.FILE) {
      return new FileDriver(config);
    }

    if (t === ConnectionType.SQLITE || t === 'sqlite3') {
      return new SqliteDbDriver(config);
    }

    throw new Error(`Unsupported connection type: ${type}`);
  }
}
