# Setup Guide

## Prerequisites

- Docker
- Docker Compose
- Node.js

## Steps

1. Copy `.env.example` to `.env`
2. Replace placeholder values
3. Run:

```bash
docker compose up --build
```

## Verify

```bash
curl http://localhost:3008
```

## Cleanup

```bash
docker compose down -v
```
