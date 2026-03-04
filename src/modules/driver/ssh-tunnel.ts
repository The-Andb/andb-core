import { Client } from 'ssh2';
const { getLogger } = require('andb-logger');
import { ISshConfig } from '../../common/interfaces/connection.interface';
import { Readable, Writable } from 'stream';

export class SshTunnel {
  private client: Client;
  private logger = getLogger({ logName: 'SshTunnel' });
  private connection: any; // Keep track of the active connection if needed

  constructor(private readonly config: ISshConfig) {
    this.client = new Client();
  }

  /**
   * Establishes an SSH connection and forwards traffic to the destination
   */
  async forward(destHost: string, destPort: number): Promise<NodeJS.ReadWriteStream> {
    return new Promise((resolve, reject) => {
      this.client.on('ready', () => {
        this.logger.info(`SSH Connection Ready. Forwarding to ${destHost}:${destPort}`);

        this.client.forwardOut(
          '127.0.0.1',
          12345, // Arbitrary source port
          destHost,
          destPort,
          (err, stream) => {
            if (err) {
              this.logger.error(`ForwardOut Error: ${err.message}`);
              this.client.end();
              return reject(err);
            }
            resolve(stream);
          },
        );
      });

      this.client.on('error', (err) => {
        this.logger.error(`SSH Client Error: ${err.message}`);
        reject(err);
      });

      // Connect
      try {
        this.client.connect({
          host: this.config.host,
          port: this.config.port,
          username: this.config.username,
          password: this.config.password,
          privateKey: this.config.privateKey,
          passphrase: this.config.passphrase,
          readyTimeout: 20000,
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  close() {
    if (this.client) {
      this.client.end();
    }
  }
}
