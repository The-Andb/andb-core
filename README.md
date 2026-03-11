# The Andb Core Engine 🚀

**The Professional AI-Driven Database Infrastructure Engine.**
AST-powered Safety, Deep Semantic Analysis, and Professional Orchestration.

---

## 🌟 Overview

**The Andb Core** is the high-performance engine powering the entire Andb ecosystem. Optimized for the **AI-First Era (2026)**, it provides the bridge between natural language reasoning and reliable database schema management.

This engine doesn't just "compare text"; it **understands intent** through AST (Abstract Syntax Tree) analysis, protecting your production environments from destructive operations and providing human-level semantic insights.

## ✨ Intelligent Features

- 🧠 **The Advisor (Safety Engine)**: Full AST-based SQL analysis. Detects destructive operations (DROP, TRUNCATE) and "Metadata Lock" hazards (Full Table Rebuilds) with high precision.
- 📝 **Semantic Diffing**: Goes beyond SQL code to provide human-readable descriptions of changes (e.g., "Column type changed: VARCHAR -> ENUM").
- 🤖 **AI-Agent Ready (MCP)**: Native support for the Model Context Protocol. AI agents (Cursor, Claude, GPT) can now reason about your DB schema via standardized, normalized SQL views.
- 🏗️ **Professional Orchestration**: Single API for comparison, migration, export, and secure user management across multiple environments.

## 📦 Core Capabilities

- 💎 **Premium Intelligence**: Advanced comparison for Tables, Views, Procedures, Functions, Triggers, and Events.
- 📊 **Normalized SQL**: Generates standardized DDLs, making it easier for both humans and AI to identify structural drift.
- 🛡️ **Session Hygiene**: Automatic handling of foreign key checks and safe session modes for zero-downtime migrations.
- 🔌 **Pluggable Drivers**: High-performance MySQL and Dump (offline storage) drivers.

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
│   ├── common/       # Interfaces and shared types
│   ├── modules/      # Core logic
│   │   ├── comparator/# Schema comparison & Semantic Diff
│   │   ├── driver/    # Database drivers (MySQL, Dump)
│   │   ├── migrator/  # SQL generation & Safety Guards
│   │   ├── safety/    # AST-based Impact Analysis (The Advisor)
│   │   └── parser/    # SQL/DDL parsing and AST logic
│   └── index.ts      # Public API entry point
```

## 📚 Documentation

- [Advisor Tooling (Safety & Semantic)](./docs/ADVISOR_EN.md)
- [AI Agent Integration (MCP)](./docs/MCP_EN.md)
- [CLI Reference](./docs/CLI_EN.md)
- [Architecture Overview](./docs/architecture/ARCHITECTURE.md)

We are currently in **Phase 4.5** of our master plan. Our goal is 100% parity with the legacy `@the-andb/core` package before a full switchover.

- [x] Core Infrastructure (Framework + TypeScript)
- [x] MySQL Driver & Dump Driver
- [x] Schema Comparison (Tables, Views, Routines, Triggers)
- [x] CLI Parity (`generate`, `helper`)

## 📄 License & Commercial

**The Andb Public License (APL-1.0)**

- ✅ **Source-Available**: View, Clone, Run locally for evaluation.
- ❌ **No Commercial Use**: Production, SaaS, Redistribution are prohibited without a license.

See [LICENSE](../LICENSE) for full terms.

---

**Keep Going. Keep Syncing.**  
Made with ❤️ by [The Andb Team](https://github.com/The-Andb)
