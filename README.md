# The Andb Core (Framework) 🚀

**The Premium Database Orchestration Engine — Rebuilt for the Future.**
Intelligent Schema Management, Seamless Synchronization, and High-Fidelity Reporting, now powered by **Framework** and **TypeScript**.

---

## 🌟 Overview

**The Andb Core (Nest)** is a complete rewrite of the heart of The Andb Orchestrator ecosystem. By leveraging Framework and TypeScript, we provide an even more robust, type-safe, and modular engine to manage database schemas across multiple environments (DEV, STAGE, PROD) with absolute precision.

This rewrite follows our **"Twin Engine" strategy**, building the new engine side-by-side with the legacy one to ensure 100% feature parity and a seamless transition.

## ✨ New in the Framework Rewrite

- 🏗️ **Modularity**: Clean Framework module system for better maintainability and extensibility.
- 🛡️ **Type Safety**: Full TypeScript implementation for robust and bug-free development.
- 💎 **Improved Drivers**: Refined Strategy Pattern for database drivers, including a new `DumpDriver` for offline schema analysis.
- 🚀 **Modern CLI**: Built with `nest-commander` for a more intuitive and powerful command-line experience.

## 📦 Core Features

- 💎 **Premium Intelligence**: Advanced comparison engine for Tables, Views, Procedures, Functions, Triggers, and Events.
- 📊 **High-Fidelity Reporting**: Industry-leading HTML reports with dark-mode aesthetics and dynamic data visualization.
- 🏗️ **"Zero to Hero" Architecture**: Clean dependency injection and pluggable storage strategies.
- 🛡️ **Session Hygiene**: Automatic handling of foreign key checks and session modes for safe migrations.

## 🚀 Quick Start

### Installation

```bash
# Clone the monorepo and navigate to core
cd core
npm install
```

### CLI Usage

The new core provides the `andb` binary directly:

```bash
# Generate npm scripts for your project
npx ts-node src/cli/main.ts generate -e DEV,PROD

# Show usage and helper information
npx ts-node src/cli/main.ts helper
```

Once installed globally or linked:

```bash
andb helper
andb generate
```

## 📁 Project Structure

```text
core/
├── src/
│   ├── cli/          # Command-line interface commands (nest-commander)
│   ├── common/       # Interfaces, constants, and shared types
│   └── modules/      # Core logic organized into Framework modules
│       ├── comparator/ # Schema comparison logic
│       ├── driver/     # Database drivers (MySQL, Dump)
│       ├── migrator/   # SQL generation for migrations
│       └── parser/     # SQL/DDL parsing and normalization
├── scripts/          # E2E and unit tests
└── ai/               # AI memory, plans, and architectural decisions
```

## 🤝 Roadmap & Parity

We are currently in **Phase 4.5** of our master plan. Our goal is 100% parity with the legacy `@the-andb/core` package before a full switchover.

- [x] Core Infrastructure (Framework + TypeScript)
- [x] MySQL Driver & Dump Driver
- [x] Schema Comparison (Tables, Views, Routines, Triggers)
- [x] CLI Parity (`generate`, `helper`)
- [ ] UI Integration (Phase 5)

## 📄 License & Commercial

**The Andb Public License (APL-1.0)**

- ✅ **Source-Available**: View, Clone, Run locally for evaluation.
- ❌ **No Commercial Use**: Production, SaaS, Redistribution are prohibited without a license.

See [LICENSE](../LICENSE) for full terms.

---

**Keep Going. Keep Syncing.**  
Made with ❤️ by [The Andb Team](https://github.com/The-Andb)
