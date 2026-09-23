# 5 — You promote to production

**You** move a tested build onto Azure. Grok / Copilot / a `git push` must **not** do this for you.

If QA ([04-qa-docker.md](04-qa-docker.md)) was not green, **stop**.

Prod URLs: https://mcwut.com and https://www.mcwut.com  
App in Azure: **ca-mcwut**, resource group **McWutStorage**.

---

## What “promote” means

1. GitHub already has an image for your commit (tag **`:qa`** and a long **SHA**).  
2. You tell **Azure** to run **that** image.  
3. Azure starts a new **revision**. Old revision stays until the new one is healthy.

Pushing `main` only publishes `:qa`. It does **not** retag `:latest` and does **not** change the Container App.

---

## A. Find the image SHA (GitHub)

1. Browser: GitHub → **McWut-src/McWut_WebApp**.  
2. **Actions**.  
3. Latest **Publish to GHCR** run that is **green**, for the commit you QAd.  
4. Open it. Copy the **commit SHA** (40 characters, like `3d93999…`).  
   You can also copy it from the commit on **main** (click the commit → full SHA).

The image name you will paste in Azure:

```
ghcr.io/mcwut-src/mcwut_webapp:THE_SHA_HERE
```

Use the **full SHA**, not only 7 characters, unless GitHub’s package page shows a short tag that matches.

**Do not** set the Container App to `:latest` unless you know you tagged `:latest` on purpose. Safer: always pin the SHA.

---

## B. Point Azure at that image (portal)

1. [portal.azure.com](https://portal.azure.com) → resource group **McWutStorage** → Container App **ca-mcwut**.  
2. Left: **Containers** (or **Application** → **Containers** / **Revisions and replicas**).  
3. Create / edit revision (wording is **Create new revision** or edit the container).  
4. **Image** field: replace with  
   `ghcr.io/mcwut-src/mcwut_webapp:PASTE_FULL_SHA`  
5. Do **not** delete secrets. Leave `sql-connection`, `storage-connection`, `website-admin-password` and the env vars that **reference** them.  
6. Save / create revision.  
7. Wait until the new revision is **Running** / **Healthy** (can take 1–2 minutes).

If the revision **Failed** / **crashing**: Azure did not take the new site. The old URL may still serve the previous revision. Do not panic. Copy **Log stream** error text (no secrets) and stop.

---

## C. Check prod (you, in the browser)

Wait for Healthy, then:

1. https://mcwut.com/health → `ok`  
2. https://www.mcwut.com/health → `ok`  
3. Sign in as **`vince@mcwut.com`** with the **prod** password (personal vault — **not** `vince`).  
4. Header **McWut**, nav **My files** / **Shared files**.  
5. https://mcwut.com/Identity/Account/Register → **404**.  
6. Upload a **non-empty** file. Copy link. Private window, download.

If login or upload fails, **do not** keep clicking Create revision. Note what you saw.

---

## Optional: GitHub “promote_prod” checkbox

GitHub → **Actions** → **Publish to GHCR** → **Run workflow**.

- Leave **promote_prod** **unchecked** unless you also want the tag `:latest`.  
- Azure still needs step **B** unless you already pointed the app at `:latest` (we recommend SHA, not `:latest`).

Git tag `v1.0.0` + push also tags `:latest`. You still update the Container App unless it tracks `:latest` (it should not).

---

## Do not

- Put prod connection strings in Docker Compose or Visual Studio.  
- Run `az containerapp update` because a chat said “push”. **You** decide after QA.  
- Promote when tired. Sleep, then promote.  
- Delete Azure SQL or the storage account as part of a deploy.

---

## If something is wrong after promote

Portal → **ca-mcwut** → **Revisions**: activate the **previous** healthy revision if Azure still lists it. That is the fastest rollback. Then tell your notes what failed (no passwords).
