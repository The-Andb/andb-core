import { SshTunnel } from '../ssh-tunnel';
import { Client } from 'ssh2';
import { ISshConfig } from '../../../common/interfaces/connection.interface';

jest.mock('ssh2');

describe('SshTunnel', () => {
  let tunnel: SshTunnel;
  let mockClient: jest.Mocked<Client>;
  let config: ISshConfig;

  beforeEach(() => {
    config = {
      host: 'ssh.example.com',
      port: 22,
      username: 'user',
      password: 'pass',
    };

    mockClient = new Client() as jest.Mocked<Client>;
    (Client as jest.MockedClass<typeof Client>).mockImplementation(() => mockClient);

    tunnel = new SshTunnel(config);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('forward', () => {
    it('should resolve with stream on successful connection', async () => {
      const mockStream = { pipe: jest.fn() };

      mockClient.on = jest.fn().mockImplementation(function (event: string, cb: Function) {
        if (event === 'ready') {
          setTimeout(() => cb(), 0);
        }
        return mockClient;
      }) as any;

      mockClient.forwardOut = jest.fn().mockImplementation(
        (_srcAddr, _srcPort, _destHost, _destPort, cb) => {
          cb(null, mockStream);
        },
      ) as any;

      mockClient.connect = jest.fn() as any;

      const stream = await tunnel.forward('db-host', 3306);
      expect(stream).toBe(mockStream);
      expect(mockClient.connect).toHaveBeenCalledWith(expect.objectContaining({
        host: 'ssh.example.com',
        port: 22,
        username: 'user',
        password: 'pass',
      }));
    });

    it('should reject on SSH client error', async () => {
      mockClient.on = jest.fn().mockImplementation(function (event: string, cb: Function) {
        if (event === 'error') {
          setTimeout(() => cb(new Error('SSH auth failed')), 0);
        }
        return mockClient;
      }) as any;

      mockClient.connect = jest.fn() as any;

      await expect(tunnel.forward('db-host', 3306)).rejects.toThrow('SSH auth failed');
    });

    it('should reject on forwardOut error', async () => {
      mockClient.on = jest.fn().mockImplementation(function (event: string, cb: Function) {
        if (event === 'ready') {
          setTimeout(() => cb(), 0);
        }
        return mockClient;
      }) as any;

      mockClient.forwardOut = jest.fn().mockImplementation(
        (_srcAddr, _srcPort, _destHost, _destPort, cb) => {
          cb(new Error('Port forwarding denied'), undefined);
        },
      ) as any;

      mockClient.end = jest.fn() as any;
      mockClient.connect = jest.fn() as any;

      await expect(tunnel.forward('db-host', 3306)).rejects.toThrow('Port forwarding denied');
      expect(mockClient.end).toHaveBeenCalled();
    });
  });

  describe('close', () => {
    it('should call client.end()', () => {
      mockClient.end = jest.fn() as any;
      tunnel.close();
      expect(mockClient.end).toHaveBeenCalled();
    });
  });
});
