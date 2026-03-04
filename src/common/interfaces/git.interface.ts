export interface IGitConfig {
  remoteUrl?: string;
  branch?: string; // Legacy, maps to workBranch
  workBranch?: string;
  baseBranch?: string; // Branch to pull from and PR to (e.g., main)
  username?: string;
  token?: string; // Personal Access Token
  sshKeyPath?: string;
  storagePath: string; // Defaults to '/db'
  autoSync: boolean;
  autoCommit: boolean;
}

export interface IGitCommitOptions {
  message: string;
  author?: {
    name: string;
    email: string;
  };
}

export interface IGitStatus {
  isRepo: boolean;
  modifiedFiles: string[];
  stagedFiles: string[];
  untrackedFiles: string[];
  ahead: number;
  behind: number;
  currentBranch: string;
  remote?: string;
}
