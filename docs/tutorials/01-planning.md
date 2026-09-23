# 1 — Planning

Do this **before** opening Visual Studio for a change.

## What “planning” means here

Write down, in one short note (SCOPE, a chat message, or paper):

1. **What** will the user see or do differently?  
2. **What must not break?** (login, upload, share link, https://mcwut.com)  
3. **Which environment is this for first?** Always Dev, then QA, then Prod. Never Prod first.

If you cannot answer (1) in one sentence, you are not ready to code.

## The three worlds (do not mix)

| | Dev | QA | Prod |
|---|---|---|---|
| Tool | Visual Studio | Docker on **this PC** | Azure |
| URL | https://localhost:7047 | http://localhost:8080 | https://mcwut.com |
| Data | SQLite on disk | **Other** SQLite in a Docker volume | Azure SQL + Blob |
| Who | You | You | Real people |

**Never** paste prod SQL or storage secrets into Visual Studio `appsettings` or `docker-compose.yml`. That would point Dev/QA at family files.

## What you are **not** doing in planning

- Not creating Azure resources (already done).  
- Not inviting people.  
- Not turning on Register.  
- Not tagging `:latest` or updating the Container App.

## When planning is done

You have a sentence like: “Lock Register, rename Vault to My files.” Then go to [02-develop.md](02-develop.md).
