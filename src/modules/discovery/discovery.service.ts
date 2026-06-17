import * as fs from 'fs';
import * as path from 'path';
import * as net from 'net';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface DiscoveredPort {
  port: number;
  type: string;
  open: boolean;
}

export interface DiscoveredDocker {
  containerId: string;
  name: string;
  image: string;
  ports: Array<{ private: number; public: number }>;
  type: string;
  status: string;
}

export interface DiscoveredConfig {
  file: string;
  type: string;
  host?: string;
  port?: number;
  user?: string;
  password?: string;
  database?: string;
  connectionString?: string;
}

export interface DiscoveredSqlite {
  path: string;
  size: number;
}

export interface DiscoveryReport {
  ports: DiscoveredPort[];
  docker: DiscoveredDocker[];
  configs: DiscoveredConfig[];
  sqliteFiles: DiscoveredSqlite[];
}

export class DatabaseDiscoveryService {
  private readonly defaultPorts = [
    { port: 3306, type: 'mysql' },
    { port: 3307, type: 'mysql' },
    { port: 3310, type: 'mysql' },
    { port: 5432, type: 'postgres' }
  ];

  constructor() {}

  /**
   * Scan local common database ports
   */
  public async scanPorts(hosts: string[] = ['127.0.0.1']): Promise<DiscoveredPort[]> {
    const results: DiscoveredPort[] = [];
    
    for (const host of hosts) {
      for (const item of this.defaultPorts) {
        const isOpen = await this.checkPort(item.port, host);
        if (isOpen) {
          results.push({
            port: item.port,
            type: item.type,
            open: true
          });
        }
      }
    }
    return results;
  }

  private checkPort(port: number, host: string): Promise<boolean> {
    return new Promise((resolve) => {
      const socket = new net.Socket();
      socket.setTimeout(200);

      socket.on('connect', () => {
        socket.destroy();
        resolve(true);
      });

      socket.on('timeout', () => {
        socket.destroy();
        resolve(false);
      });

      socket.on('error', () => {
        socket.destroy();
        resolve(false);
      });

      socket.connect(port, host);
    });
  }

  /**
   * Scan active docker containers for databases
   */
  public async scanDocker(): Promise<DiscoveredDocker[]> {
    try {
      const { stdout } = await execAsync('docker ps --format "{{json .}}"');
      if (!stdout.trim()) return [];

      const lines = stdout.trim().split('\n');
      const results: DiscoveredDocker[] = [];

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const container = JSON.parse(line);
          const image = (container.Image || '').toLowerCase();
          const name = (container.Names || '').toLowerCase();
          
          let dbType = '';
          if (image.includes('mysql') || name.includes('mysql')) dbType = 'mysql';
          else if (image.includes('postgres') || name.includes('postgres')) dbType = 'postgres';
          else if (image.includes('mariadb') || name.includes('mariadb')) dbType = 'mysql';

          if (dbType) {
            // Parse ports mapping e.g., "0.0.0.0:3307->3306/tcp"
            const portMappings: Array<{ private: number; public: number }> = [];
            const portsStr = container.Ports || '';
            const parts = portsStr.split(',');
            for (const part of parts) {
              const match = part.match(/:(\d+)->(\d+)\/tcp/);
              if (match) {
                portMappings.push({
                  public: parseInt(match[1], 10),
                  private: parseInt(match[2], 10)
                });
              }
            }

            results.push({
              containerId: container.ID,
              name: container.Names,
              image: container.Image,
              ports: portMappings,
              type: dbType,
              status: container.Status
            });
          }
        } catch (err) {
          // ignore malformed JSON lines
        }
      }
      return results;
    } catch (e) {
      // Docker is either not running or not installed
      return [];
    }
  }

  /**
   * Scan active workspace config files
   */
  public async scanConfigs(workspacePath: string): Promise<DiscoveredConfig[]> {
    if (!workspacePath || !fs.existsSync(workspacePath)) return [];

    const discovered: DiscoveredConfig[] = [];

    // 1. Scan .env file
    const envPath = path.join(workspacePath, '.env');
    if (fs.existsSync(envPath)) {
      try {
        const content = fs.readFileSync(envPath, 'utf8');
        const lines = content.split('\n');
        
        // Simple regexes to find connection info
        let databaseUrl = '';
        let dbHost = '127.0.0.1';
        let dbPort = 3306;
        let dbUser = '';
        let dbPass = '';
        let dbName = '';
        let type = 'mysql';

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('#') || !trimmed.includes('=')) continue;
          const [key, val] = trimmed.split('=').map(s => s.trim());
          const cleanVal = val.replace(/['"]/g, ''); // strip quotes

          if (key === 'DATABASE_URL') {
            databaseUrl = cleanVal;
          } else if (key.match(/DB_HOST|MYSQL_HOST|POSTGRES_HOST/i)) {
            dbHost = cleanVal;
          } else if (key.match(/DB_PORT|MYSQL_PORT|POSTGRES_PORT/i)) {
            dbPort = parseInt(cleanVal, 10);
          } else if (key.match(/DB_USER|DB_USERNAME|MYSQL_USER|POSTGRES_USER/i)) {
            dbUser = cleanVal;
          } else if (key.match(/DB_PASSWORD|DB_PASS|MYSQL_PASSWORD|POSTGRES_PASSWORD/i)) {
            dbPass = cleanVal;
          } else if (key.match(/DB_DATABASE|DB_NAME|MYSQL_DATABASE|POSTGRES_DB/i)) {
            dbName = cleanVal;
          }
        }

        if (databaseUrl) {
          let resolvedType = 'mysql';
          if (databaseUrl.startsWith('postgresql:') || databaseUrl.startsWith('postgres:')) resolvedType = 'postgres';
          else if (databaseUrl.startsWith('sqlite:')) resolvedType = 'sqlite';

          discovered.push({
            file: '.env',
            type: resolvedType,
            connectionString: databaseUrl
          });
        } else if (dbUser || dbName) {
          discovered.push({
            file: '.env',
            type,
            host: dbHost,
            port: dbPort,
            user: dbUser,
            password: dbPass,
            database: dbName
          });
        }
      } catch (err) {
        // ignore read errors
      }
    }

    // 2. Scan docker-compose.yml file
    const dockerComposePath = path.join(workspacePath, 'docker-compose.yml');
    if (fs.existsSync(dockerComposePath)) {
      try {
        const content = fs.readFileSync(dockerComposePath, 'utf8');
        // Very basic naive scanner to find DB ports/images without external yaml dependency
        // In production, we'd use a real yaml parser, but keeping it light and self-contained
        const servicesMatch = content.split(/\r?\n\s{2}\w+:\r?\n/);
        
        let match;
        const composeRegex = /image:\s*([^\r\n]+)|ports:\r?\n\s+-\s+["']?(\d+):(\d+)["']?/g;
        // Search for mysql, postgres, mariadb images
        if (content.includes('mysql') || content.includes('postgres') || content.includes('mariadb')) {
          discovered.push({
            file: 'docker-compose.yml',
            type: content.includes('postgres') ? 'postgres' : 'mysql',
            host: '127.0.0.1'
          });
        }
      } catch (err) {
        // ignore
      }
    }

    return discovered;
  }

  /**
   * Recursively scan directory for SQLite files up to max depth, ignoring node_modules, .git
   */
  public async scanSqlite(dir: string, maxDepth = 4, currentDepth = 1): Promise<DiscoveredSqlite[]> {
    if (!dir || !fs.existsSync(dir) || currentDepth > maxDepth) return [];
    
    let results: DiscoveredSqlite[] = [];
    try {
      const files = fs.readdirSync(dir);
      for (const file of files) {
        const fullPath = path.join(dir, file);
        
        // Skip common large/binary directories
        if (file === 'node_modules' || file === '.git' || file === 'dist' || file === 'coverage' || file === '.venv') {
          continue;
        }

        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
          const subResults = await this.scanSqlite(fullPath, maxDepth, currentDepth + 1);
          results = results.concat(subResults);
        } else if (stat.isFile()) {
          const ext = path.extname(file).toLowerCase();
          if (ext === '.db' || ext === '.sqlite' || ext === '.sqlite3') {
            results.push({
              path: fullPath,
              size: stat.size
            });
          }
        }
      }
    } catch (err) {
      // ignore access/read errors
    }

    return results;
  }

  /**
   * Run all scanners in parallel
   */
  public async scanAll(workspacePath?: string): Promise<DiscoveryReport> {
    const portScanPromise = this.scanPorts();
    const dockerScanPromise = this.scanDocker();
    const configScanPromise = workspacePath ? this.scanConfigs(workspacePath) : Promise.resolve([]);
    const sqliteScanPromise = workspacePath ? this.scanSqlite(workspacePath) : Promise.resolve([]);

    const [ports, docker, configs, sqliteFiles] = await Promise.all([
      portScanPromise,
      dockerScanPromise,
      configScanPromise,
      sqliteScanPromise
    ]);

    return {
      ports,
      docker,
      configs,
      sqliteFiles
    };
  }
}
