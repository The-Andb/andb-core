# 🤖 AI Agent Integration: Model Context Protocol (MCP)

**Empowering AI Agents to Manage Your Database Infrastructure.**

## 🌟 Overview

The Andb is designed to be the "infrastructure of choice" for AI developer agents (Cursor, Claude Code, GPT-4). By implementing the **Model Context Protocol (MCP)**, we allow AI models to interact with your database schema in a safe, structured, and intelligent way.

---

## 🛠️ MCP Tools for AI Agents

The following tools are exposed via the `@the-andb/mcp` server:

### 1. `get_schema_normalized`

- **Purpose**: Provides a clean, standardized DDL view of the entire database.
- **Why it matters**: AI agents reason much better on normalized SQL than on raw, messy database dumps.

### 2. `diff_semantic`

- **Purpose**: Explains structural differences between environments in human language.
- **Why it matters**: Allows the agent to provide clear summaries to the developer (e.g., "I've detected a datatype mismatch in the users table").

### 3. `analyze_ddl_risk`

- **Purpose**: Runs the Advisor AST analysis on a proposed SQL statement.
- **Why it matters**: Acts as a safety guardrail. An agent can ask "Is this DROP COLUMN safe?" and receive a `CRITICAL` risk report before execution.

### 4. `compare_schema`

- **Purpose**: Modern comparison tool that returns both SQL migration scripts and semantic diff reports.

---

## 🚀 Integration Guide

### 1. Setup in Cursor / Claude/ GPT

To use Andb as an MCP server, add the following to your configuration:

```json
{
  "mcpServers": {
    "andb": {
      "command": "node",
      "args": ["/path/to/andb-mcp/dist/index.js"]
    }
  }
}
```

### 2. Example Prompt

Once configured, you can ask your agent:

> "Check if the schema in `STAGING` environment is missing any indexes compared to `PROD`, and analyze the risk of applying them."

The agent will:

1. Call `compare_schema` to find the drift.
2. Call `analyze_ddl_risk` on the generated SQL.
3. Provide you with a safe migration plan.

---

## 🧠 Why Use Andb for AI Dev?

Standard database tools are built for humans to type commands. **Andb is built for agents to reasoning on context.**

By providing **AST-level metadata** and **Semantic descriptions**, we reduce the "hallucination" rate of AI models when performing database migrations.
