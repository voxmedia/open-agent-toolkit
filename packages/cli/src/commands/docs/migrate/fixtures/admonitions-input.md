# Deployment Guide

This guide covers deploying your application.

!!! note "Prerequisites"
    You need the following installed:

    - Node.js 20+
    - Docker

!!! warning
    Make sure to back up your database before proceeding.

!!! tip "Quick Start"
    Run `docker compose up` to get started quickly.

    This will start all required services.

??? info "Advanced Configuration"
    You can configure the following environment variables:

    - `DB_HOST` — database host
    - `DB_PORT` — database port
    - `DB_NAME` — database name

!!! danger "Data Loss Warning"
    Running this command will **permanently delete** all data.

    ```bash
    oat cleanup --force
    ```

    There is no undo.

!!! success
    Your deployment is complete!

## Mermaid Diagram

```mermaid
graph TD
    A[Start] --> B[Deploy]
    B --> C[Verify]
    C --> D[Done]
```

## Code Example

```typescript
const config = {
  host: 'localhost',
  port: 3000,
};
```
