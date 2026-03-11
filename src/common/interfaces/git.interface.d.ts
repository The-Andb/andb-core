export interface IGitConfig {
    remoteUrl?: string;
    branch?: string;
    workBranch?: string;
    baseBranch?: string;
    username?: string;
    token?: string;
    sshKeyPath?: string;
    storagePath: string;
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
