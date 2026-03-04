import { OrchestrationService } from './orchestration.service';
import { SecurityOrchestrator } from './security-orchestrator.service';
import { GitOrchestrator } from './git-orchestrator.service';
import { SchemaOrchestrator } from './schema-orchestrator.service';

describe('OrchestrationService', () => {
  let service: OrchestrationService;
  let configService: any;
  let securityOrchestrator: any;
  let gitOrchestrator: any;
  let schemaOrchestrator: any;

  beforeEach(() => {
    configService = {
      setConnection: jest.fn(),
      setDomainNormalization: jest.fn(),
      getConnection: jest.fn(),
      getFeatureFlags: jest.fn().mockReturnValue({}),
      setFeatureFlag: jest.fn(),
      saveConfig: jest.fn(),
    };

    securityOrchestrator = {
      testConnection: jest.fn().mockResolvedValue({ success: true }),
      setupRestrictedUser: jest.fn(),
      generateUserSetupScript: jest.fn(),
      probeRestrictedUser: jest.fn(),
    } as unknown as SecurityOrchestrator;

    gitOrchestrator = {
      gitStatus: jest.fn(),
      gitInit: jest.fn(),
      gitSync: jest.fn(),
      gitPull: jest.fn(),
    } as unknown as GitOrchestrator;

    schemaOrchestrator = {
      getSchemaObjects: jest.fn(),
      exportSchema: jest.fn(),
      compareSchema: jest.fn(),
      migrateSchema: jest.fn(),
    } as unknown as SchemaOrchestrator;

    const mockFeatures = {
      mcpServer: true,
    } as any;

    service = new OrchestrationService(
      configService,
      mockFeatures,
      securityOrchestrator,
      gitOrchestrator,
      schemaOrchestrator,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('execute', () => {
    it('should sync config with payload before dispatching', async () => {
      const payload = {
        srcEnv: 'DEV',
        sourceConfig: { type: 'mysql', host: 'localhost' },
      };
      schemaOrchestrator.exportSchema.mockResolvedValue({ success: true });

      await service.execute('export', payload);

      expect(configService.setConnection).toHaveBeenCalledWith('DEV', payload.sourceConfig, 'mysql');
    });

    it('should delegate "export" to schemaOrchestrator', async () => {
      const payload = { env: 'DEV' };
      schemaOrchestrator.exportSchema.mockResolvedValue('exported');
      const result = await service.execute('export', payload);
      expect(schemaOrchestrator.exportSchema).toHaveBeenCalledWith(payload);
      expect(result).toBe('exported');
    });

    it('should delegate "test-connection" to securityOrchestrator', async () => {
      const payload = { connection: {} };
      await service.execute('test-connection', payload);
      expect(securityOrchestrator.testConnection).toHaveBeenCalledWith(payload);
    });

    it('should delegate "git-status" to gitOrchestrator', async () => {
      const payload = { env: 'DEV' };
      await service.execute('git-status', payload);
      expect(gitOrchestrator.gitStatus).toHaveBeenCalledWith(payload);
    });

    it('should throw error for unknown operation', async () => {
      await expect(service.execute('unknown', {})).rejects.toThrow('Unknown operation: unknown');
    });
  });

  describe('Feature Management', () => {
    it('should return merged feature flags', async () => {
      configService.getFeatureFlags.mockReturnValue({ customFlag: true });
      const status = await service.getFeaturesStatus();
      expect(status.mcpServer).toBe(true);
      expect((status as any).customFlag).toBe(true);
    });

    it('should update feature flag and save config', async () => {
      await service.updateFeatureFlag({ key: 'test', enabled: true });
      expect(configService.setFeatureFlag).toHaveBeenCalledWith('test', true);
      expect(configService.saveConfig).toHaveBeenCalled();
    });
  });
});
