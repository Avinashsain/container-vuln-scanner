# Projects Addendum

This folder explains how to add a new project cleanly to this repository and how to avoid the configuration and documentation issues we found in the existing sample projects.

## Goals

When a new project is added:

- it must have a clear README
- it must use a safe environment template
- it must not commit secrets
- compose ports and frontend URLs must be consistent
- the deployment flow must be documented in simple steps
- the project must be easy to scan, run, and review

## Standard project structure

```text
projects/<project-name>/
├── README.md
├── .env.example
├── docker-compose.yml
├── frontend/
├── backend/
├── docs/
└── screenshots/
```

## Required steps for adding a project

### 1. Create the project folder

Create a folder under `projects/` with a short, consistent name.

Example:

```bash
mkdir -p projects/MyProject
```

### 2. Add a README with these sections

Every project README should contain:

1. Project overview
2. Tech stack
3. Architecture summary
4. Folder structure
5. Prerequisites
6. Local setup steps
7. Environment variables
8. Docker Compose or Kubernetes commands
9. Verification commands
10. Troubleshooting notes
11. Security / secrets handling notes

### 3. Use a safe env template

Do not commit real secrets.

Create a `.env.example` with placeholders only.

Example:

```env
CLIENT_URLS=http://localhost:3008
JWT_SECRET=change-me
MONGO_URI=mongodb://mongo:27017/streamingapp
AWS_REGION=us-east-1
AWS_S3_BUCKET=your-bucket
```

### 4. Keep ports and URLs aligned

Before finalizing the project, check all of these together:

- frontend exposed port
- backend port mapping
- browser API URLs
- CORS allowed origin values
- login redirect URLs

A mismatch like frontend on `3008` but `CLIENT_URLS=http://localhost:4000` creates auth and login failures.

### 5. Check Docker Compose health

Run the project locally and verify:

```bash
docker compose up --build
```

Then validate:

```bash
docker compose ps
curl http://localhost:3008
curl http://localhost:3001/health
```

### 6. Ensure the README reflects real commands

The README must document the exact commands that work on a fresh machine.

It should include:

```bash
git clone ...
cd ...
cp .env.example .env
docker compose up --build
```

### 7. Add a known-good troubleshooting section

Common issues to document:

- login fails
- CORS errors
- frontend cannot reach backend
- wrong port mapping
- missing `.env` values
- invalid secret or region configuration

### 8. Remove repo noise

Before committing:

- delete `.DS_Store`
- remove local logs, screenshots that are not needed
- keep only meaningful docs and images
- ensure `.env` is ignored

## Common issue checklist

Use this before adding a new project to the repo:

- [ ] README exists
- [ ] `.env.example` exists
- [ ] no secrets committed
- [ ] frontend/backend ports are consistent
- [ ] CORS origins match the browser URL
- [ ] Docker Compose runs successfully
- [ ] documented commands are reproducible
- [ ] troubleshooting section is included
- [ ] generated temp files are removed

## Recommended README template

```md
# <Project Name>

## Overview
Describe the app and the purpose.

## Tech Stack
List frameworks, languages, databases, infra.

## Architecture
Summarize the service layout.

## Prerequisites
List required tools.

## Setup
```bash
cp .env.example .env
docker compose up --build
```

## Services
| Service | URL |
|---|---|
| Frontend | http://localhost:3008 |
| Backend | http://localhost:3001 |

## Troubleshooting
Document common issues and fixes.
```

## Final recommendation

When adding a new project, treat the README as the source of truth for onboarding, setup, and verification. If the README cannot be followed from a clean machine, the project is not ready to be merged.
