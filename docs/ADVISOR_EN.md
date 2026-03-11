# 🧠 The Advisor: AST Safety & Semantic Engine

**protecting your production data with structural intelligence.**

## 🌟 Overview

The Advisor is the core safety engine of The Andb. Unlike legacy tools that rely on simple string matching (Regex), The Advisor parses every SQL statement into an **Abstract Syntax Tree (AST)** to understand its actual impact on the database.

It operates in two main modes:

1. **Safety Analysis (Impact)**: Predicting technical risks and downtime.
2. **Semantic Diffing**: Explaining changes in human-readable terms.

---

## 🛡️ SQL Safety Engine (ImpactAnalysisService)

The engine classifies migrations into three safety levels:

### 🟢 SAFE

- Adding a new column with a default value.
- Creating a new index (without UNIQUE constraints on existing data).
- Adding a new table.

### 🟡 WARNING

- **Metadata Lock Hazards**: Operations like `MODIFY COLUMN` or `ADD PRIMARY KEY` that may trigger a full table rebuild in MySQL, locking the table for the duration of the change.
- **Performance Risks**: Changes that might invalidate query plans or require massive index updates.

### 🔴 CRITICAL (Destructive)

- `DROP TABLE` or `DROP DATABASE`.
- `TRUNCATE TABLE`.
- `ALTER TABLE ... DROP COLUMN`.
- Modifying column types that result in truncated data.

---

## 📝 Semantic Diffing (SemanticDiffService)

The Semantic Diff engine translates structural changes into logical descriptions. This is particularly useful for AI agents and code reviews.

**Example Scenarios:**

| SQL Operation                       | Semantic Description                                    |
| :---------------------------------- | :------------------------------------------------------ |
| `MODIFY status VARCHAR(10) -> ENUM` | "Column 'status' type changed: VARCHAR(10) -> ENUM"     |
| `ALTER ... ADD NOT NULL`            | "Column 'status' nullability changed: NULL -> NOT NULL" |
| `DROP INDEX idx_email`              | "Index 'idx_email' removed"                             |

---

## 🚀 How to Use

### Via CLI

Run the playground to see The Advisor in action:

```bash
andb playground -s source.sql -t target.sql
```

### Via MCP (For AI Agents)

Agents can use the `analyze_ddl_risk` and `diff_semantic` tools to get these reports directly.

### Via API (Node.js/TypeScript)

```typescript
import { ImpactAnalysisService, SemanticDiffService } from '@the-andb/core';

const advisor = new ImpactAnalysisService();
const report = await advisor.analyze(['ALTER TABLE users DROP COLUMN phone']);
console.log(report.level); // "CRITICAL"
```
