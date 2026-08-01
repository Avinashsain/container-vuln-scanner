# Project Template

This folder is a starter template for adding a new application project under `projects/`.

## Purpose

Use this template when adding:

- a frontend service
- a backend service
- a containerized stack
- a demo deployment project

## Required sections

Every new project README should include:

1. Overview
2. Tech stack
3. Project structure
4. Prerequisites
5. Setup steps
6. Environment variables
7. Run commands
8. Verification commands
9. Troubleshooting notes
10. Security notes

## Standard setup

```bash
cp .env.example .env
docker compose up --build
```

## Environment file

Create a `.env.example` file with placeholder values only.

```env
CLIENT_URLS=http://localhost:3008
JWT_SECRET=change-me
MONGO_URI=mongodb://mongo:27017/streamingapp
AWS_REGION=us-east-1
AWS_S3_BUCKET=your-bucket
```

## Port consistency checklist

Before finishing the project:

- frontend URL matches the browser path
- backend ports match compose mappings
- CORS allow-list matches the frontend origin
- login Redirect / callback URLs are aligned

## Common issues to document

- login fails
- CORS blocked
- frontend cannot reach backend
- env file missing or invalid
- wrong port mapping
- secret leakage in repo

## Final rule

If the README cannot be followed from a clean machine, the project is not ready to be added.
