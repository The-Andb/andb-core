const { getLogger } = require('andb-logger');
import { simpleGit, SimpleGit, SimpleGitOptions } from 'simple-git';
import * as path from 'path';
import * as fs from 'fs';
import { IGitConfig, IGitCommitOptions, IGitStatus } from '../../common/interfaces/git.interface';

export class GitService {
  private readonly logger = getLogger({ logName: 'GitService' });
  private git: SimpleGit | null = null;
  private currentConfig: IGitConfig | null = null;

  async initialize(config: IGitConfig) {
    this.currentConfig = config;
    const baseDir = config.storagePath || path.join(process.cwd(), 'db');

    if (!fs.existsSync(baseDir)) {
      fs.mkdirSync(baseDir, { recursive: true });
    }

    const options: Partial<SimpleGitOptions> = {
      baseDir,
      binary: 'git',
      maxConcurrentProcesses: 6,
      trimmed: false,
    };

    this.git = simpleGit(options);

    const isRepo = await this.git.checkIsRepo();
    if (!isRepo) {
      this.logger.info(`Initializing new Git repository at ${baseDir}`);
      await this.git.init();

      // Force LF normalization (Phase 2)
      await this.git.addConfig('core.autocrlf', 'false');
      await this.git.addConfig('core.safecrlf', 'false');
      await this.git.addConfig('core.eol', 'lf');
    }

    if (config.remoteUrl) {
      await this.setupRemote(config.remoteUrl);
    }
  }

  private async setupRemote(url: string) {
    if (!this.git) return;
    const remotes = await this.git.getRemotes(true);
    const origin = remotes.find(r => r.name === 'origin');

    if (!origin) {
      await this.git.addRemote('origin', url);
    } else if (origin.refs.push !== url) {
      await this.git.remote(['set-url', 'origin', url]);
    }
  }

  async getStatus(): Promise<IGitStatus> {
    if (!this.git) throw new Error('GitService not initialized');

    const status = await this.git.status();
    const branch = await this.git.branch();

    return {
      isRepo: true,
      modifiedFiles: status.modified,
      stagedFiles: status.staged,
      untrackedFiles: status.not_added,
      ahead: status.ahead,
      behind: status.behind,
      currentBranch: branch.current,
      remote: this.currentConfig?.remoteUrl
    };
  }

  async fetch(): Promise<void> {
    if (!this.git) throw new Error('GitService not initialized');
    try {
      await this.git.fetch();
    } catch (err: any) {
      this.logger.warn(`Git fetch failed: ${err.message}`);
    }
  }

  async checkDrift(branch: string = 'main'): Promise<{ ahead: number, behind: number }> {
    if (!this.git) throw new Error('GitService not initialized');

    try {
      const { baseBranch, workBranch } = this.currentConfig || {};
      const targetBase = baseBranch || branch;
      const currentWork = workBranch || 'main';

      // 1. Get counts relative to tracking branch (standard git status behavior)
      const status = await this.git.status();

      // 2. If baseBranch is different from tracking branch, we also want to know drift from base
      // This is important for the "Rebase" warning
      if (targetBase && targetBase !== currentWork) {
        // Use 'git rev-list --count HEAD..origin/baseBranch' for behind
        // and 'git rev-list --count origin/baseBranch..HEAD' for ahead
        const behindRes = await this.git.raw(['rev-list', '--count', `HEAD..origin/${targetBase}`]);
        const aheadRes = await this.git.raw(['rev-list', '--count', `origin/${targetBase}..HEAD`]);

        return {
          ahead: parseInt(aheadRes.trim(), 10) || 0,
          behind: parseInt(behindRes.trim(), 10) || 0
        };
      }

      return {
        ahead: status.ahead,
        behind: status.behind
      };
    } catch (err: any) {
      this.logger.error(`Failed to check drift: ${err.message}`);
      return { ahead: 0, behind: 0 };
    }
  }

  async commit(options: IGitCommitOptions) {
    if (!this.git) throw new Error('GitService not initialized');

    await this.git.add('.');

    const commitOptions: any = {};
    if (options.author) {
      commitOptions['--author'] = `"${options.author.name} <${options.author.email}>"`;
    }

    await this.git.commit(options.message, undefined, commitOptions);
  }

  async push() {
    if (!this.git || !this.currentConfig) throw new Error('GitService not initialized');

    const { username, token, remoteUrl, branch, workBranch } = this.currentConfig;
    const targetBranch = workBranch || branch || 'main';

    if (username && token && remoteUrl) {
      // Inject credentials into URL: https://user:token@github.com/repo.git
      const url = new URL(remoteUrl);
      url.username = username;
      url.password = token;
      await this.git.push(url.toString(), targetBranch);
    } else {
      await this.git.push('origin', targetBranch);
    }
  }

  async pull() {
    if (!this.git || !this.currentConfig) throw new Error('GitService not initialized');
    const { branch, workBranch, baseBranch } = this.currentConfig;
    const currentWorkBranch = workBranch || branch || 'main';

    if (baseBranch && baseBranch !== currentWorkBranch) {
      // Team flow: Pull from base (main) into work branch with rebase
      this.logger.info(`Rebasing ${currentWorkBranch} from origin/${baseBranch}`);
      await this.git.pull('origin', baseBranch, { '--rebase': 'true' });
    } else {
      // Standard flow: Pull current branch
      await this.git.pull('origin', currentWorkBranch);
    }
  }
}
