# Integration Guide - @the-andb/core

## Overview

`@the-andb/core` provides a modern, type-safe API built on Framework. It can be integrated into other Framework applications or used programmatically in standalone scripts.

## Installation

```bash
npm install @the-andb/core
```

## Programmatic Usage

You can leverage the core Engine logic by bootstrapping the `Container` manually.

```typescript
import { Container } from '@the-andb/core';

async function bootstrap() {
  // Initialize the lightweight DI container
  const container = Container.getInstance();

  // Access core services directly (no decorators needed)
  const comparator = container.comparator;
  const driverFactory = container.driverFactory;

  // Use the services
  const driver = await driverFactory.create('mysql', {
    host: 'localhost',
    user: 'root',
    database: 'my_db',
  });

  const tables = await driver.getIntrospectionService().listTables('my_db');
  console.log('Tables:', tables);
}

bootstrap();
```

## Core Services

- **`ParserService`**: For parsing and normalizing DDL.
- **`DriverFactoryService`**: To create database drivers (`MysqlDriver`, `DumpDriver`).
- **`ComparatorService`**: For deep-diffing database objects.
- **`MigratorService`**: For generating migration SQL.

## Configuration (andb.yaml)

The project configuration is managed by `ProjectConfigService`, which automatically loads `andb.yaml` from the current working directory.

```yaml
ENVIRONMENTS:
  - DEV
  - PROD
getDBDestination:
  DEV:
    host: localhost
    database: dev_db
  PROD:
    host: prod.server.com
    database: prod_db
```

## Best Practices

1. **Type Safety**: Always use the provided interfaces for DDL objects and diff operations.
2. **Dependency Injection**: Favor DI over manual instantiation to leverage Framework's lifecycle and testing capabilities.
3. **Async/Await**: All database and IO operations are asynchronous.
