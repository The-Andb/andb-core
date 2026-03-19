import { ConnectionType, IDatabaseConfig } from '../interfaces/connection.interface';

export class ConnectionUtil {
  /**
   * Resolves a raw connection object (from IPC or Config) into a standard Type + Config pair.
   * Handles flat objects (DatabaseConnection) and structured ones (IConnection).
   */
  static resolve(connection: any): { type: ConnectionType; config: IDatabaseConfig } {
    if (!connection) {
      throw new Error('Connection object is required');
    }

    // 1. Determine Type
    let type = connection.type as ConnectionType;
    
    // Auto-detect SQLite if path or host='file' is used
    if (!type) {
      if (connection.path || connection.host === 'file') {
        type = ConnectionType.SQLITE;
      } else {
        type = ConnectionType.MYSQL; // Default fallback
      }
    }

    // 2. Extract Config
    // If it's the structured IConnection from core, config is already there
    let config = connection.config as IDatabaseConfig;

    if (!config) {
      // It's a flat DatabaseConnection object from andb-desktop
      config = {
        host: connection.host,
        port: connection.port,
        user: connection.user || connection.username,
        password: connection.password || '',
        database: connection.database || connection.database_name || connection.name,
        path: connection.path || (type === ConnectionType.SQLITE ? connection.host : undefined),
        sshConfig: connection.sshConfig || connection.ssh,
      };
    }

    return { type, config };
  }
}
