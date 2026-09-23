# Tutorials — planning to production

You are the person who **promotes to prod**. Pushing code to GitHub does **not** change https://mcwut.com.

Follow **in order**. Skip a step only if you already did it for this change.

| # | File | When |
|---|---|---|
| 1 | [01-planning.md](01-planning.md) | Before writing code: what are we changing, what must not break |
| 2 | [02-develop.md](02-develop.md) | Visual Studio, this PC, toy login |
| 3 | [03-test-in-dev.md](03-test-in-dev.md) | Click through in Visual Studio’s browser |
| 4 | [04-qa-docker.md](04-qa-docker.md) | Same build as a server in Docker on this PC |
| 5 | [05-promote-prod.md](05-promote-prod.md) | **You** point Azure at the image **after** QA |

**Prod:** https://mcwut.com and https://www.mcwut.com  
**QA:** http://localhost:8080  
**Dev:** https://localhost:7047 (Visual Studio)

Living product list: [../SCOPE.md](../SCOPE.md). Old Azure go-live notes: [../archive/](../archive/).
