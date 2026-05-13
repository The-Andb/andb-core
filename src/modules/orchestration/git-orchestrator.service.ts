const { getLogger } = require('andb-logger');
import * as path from 'path';
import { SchemaMirrorService } from '../exporter/schema-mirror.service';
import { IGitStatus } from '../../common/interfaces/git.interface';

export class GitOrchestrator {
  private readonly logger = getLogger({ logName: 'GitOrchestrator' });
  private gitService: any = null;

  constructor(
    private readonly mirrorService: SchemaMirrorService,
    private readonly configService?: any,
  ) { }

  private async getGitService() {
    if (this.gitService) return this.gitService;

    this.logger.info('🚀 Lazy loading GitService...');
    const { GitService } = await import('../git/git.service');
    this.gitService = new GitService();
    return this.gitService;
  }

  private prepareConfig(payload: any) {
    const { config } = payload;
    const currentProject = this.configService?.getCurrentProject();
    const projectName = currentProject?.name ? currentProject.name.replace(/[^a-z0-9_-]/gi, '_').toLowerCase() : 'default';

    const storagePath = config.storagePath || payload.__projectBaseDir || path.join(process.cwd(), 'projects', projectName);

    return {
      ...config,
      storagePath
    };
  }

  async gitInit(payload: any) {
    const config = this.prepareConfig(payload);
    const gitService = await this.getGitService();
    await gitService.initialize(config);
    return { success: true };
  }

  async gitStatus(payload: any) {
    try {
      const { env, db } = payload;
      const config = this.prepareConfig(payload);
      const gitService = await this.getGitService();
      await gitService.initialize(config);

      if (config.remoteUrl) {
        await gitService.fetch();
      }

      const status = await gitService.getStatus();
      const drift = await gitService.checkDrift(config.branch || 'main');

      let suggestedMessage = '';
      if (status.modifiedFiles.length > 0 || status.untrackedFiles.length > 0) {
        suggestedMessage = this.generateSemanticMessage(status, env || 'DEV', db || 'default');
      }

      return {
        success: true,
        ...status,
        behind: drift.behind,
        ahead: drift.ahead,
        suggestedMessage
      };
    } catch (err: any) {
      this.logger.error('Git status retrieval failed:', err);
      return {
        success: false,
        error: `Git command failed: ${err.message}`,
        isRepo: false,
        modifiedFiles: [],
        stagedFiles: [],
        untrackedFiles: [],
        ahead: 0,
        behind: 0,
        currentBranch: 'unknown'
      };
    }
  }

  async gitSync(payload: any) {
    const { env, db, message, author } = payload;
    const config = this.prepareConfig(payload);

    const gitService = await this.getGitService();
    await gitService.initialize(config);

    const connection = this.configService?.getConnection(env);
    const dbType = connection?.type || 'mysql';

    await this.mirrorService.mirrorToFilesystem(env, db, config.storagePath, dbType);

    const status = await gitService.getStatus();
    const hasChanges = status.modifiedFiles.length > 0 || status.untrackedFiles.length > 0;

    if (!hasChanges) {
      return { success: true, message: 'No changes to sync' };
    }

    let finalMessage = message;
    if (!finalMessage) {
      finalMessage = this.generateSemanticMessage(status, env, db);
    }

    await gitService.commit({
      message: finalMessage,
      author: author,
    });

    if (config.remoteUrl) {
      try {
        await gitService.push();
      } catch (err: any) {
        this.logger.error(`Git push failed: ${err.message}`);
        return {
          success: true,
          message: `Committed locally but push failed: ${err.message}`,
          commitMessage: finalMessage
        };
      }
    }

    return { success: true, commitMessage: finalMessage };
  }

  async gitPull(payload: any) {
    const config = this.prepareConfig(payload);
    const gitService = await this.getGitService();
    await gitService.initialize(config);
    await gitService.pull();
    return { success: true, message: 'Pull and rebase successful' };
  }

  generateSemanticMessage(status: IGitStatus, env: string, db: string): string {
    const allChanges = [...status.modifiedFiles, ...status.untrackedFiles];
    const groups: Record<string, string[]> = {};

    for (const file of allChanges) {
      const parts = file.split(/[/\\]/);
      if (parts.length >= 2) {
        const type = parts[parts.length - 2];
        const name = parts[parts.length - 1].replace('.sql', '');
        if (!groups[type]) groups[type] = [];
        groups[type].push(name);
      }
    }

    const typeSummaries = Object.entries(groups)
      .map(([type, names]) => {
        const uniqueNames = Array.from(new Set(names));
        if (uniqueNames.length > 3) {
          return `${type}(${uniqueNames.length} objects)`;
        }
        return `${type}(${uniqueNames.join(', ')})`;
      })
      .join(', ');

    const prefix = status.untrackedFiles.length > 0 ? 'feat' : 'refactor';
    return `${prefix}(schema): ${typeSummaries || 'sync'} [${env}/${db}]`;
  }
}
