# Area: AI chat (`/ai`)

Load this before touching anything under `Pages/Ai/`, `Controllers/AiController.cs`, or the AI key form in `wwwroot/js/ai-key.js`. Rules unique to this area; shared rules (promote procedure, naming) are in `docs/AGENT.md`.

## What it is
One person's chat. The OpenRouter key lives on **Profile**, not here — never read/write a key from this page except the form. Encryption purpose `McWut.OpenRouter.v1` (ASP.NET Data Protection). The full key is never sent back to the browser.

## Behavior rules
- No key, or key rejected by OpenRouter → show how to make an account (`https://openrouter.ai/`) and a key (`https://openrouter.ai/settings/keys`); keep the chat box off. A working key shows the chat.
- Default model list = zero-price models, with context length + short note when OpenRouter sends them. **Paid models** via `localStorage` key `mcwut-ai-paid`; check `GET /api/ai/models?paid=true`.
- Send streams the reply; bubble says Waiting… until first words; Send becomes Stop. The page stays usable.
- Markdown on by default (`localStorage` key `mcwut-ai-md`, value `0` when off). When asked for Markdown it can draw: headings, paragraphs, bold/italic/strikethrough, lists, task lists, pipe tables, fenced code, bare http(s) links, and a mermaid block (flowchart/sequence/gantt/mindmap). That instruction is **not** stored in the saved chat.
- A Markdown reply (or one that already looks like Markdown) renders via the note viewer (`MarkdownHtml` then Mermaid); plain text stays plain.

## Key handling — do not break this
- Opening the page reads the saved key once; later messages reuse it in memory until the app stops, so a chat does **not** keep waking SQL. Saving a chat *does* wake SQL.
- Never put an OpenRouter key in git, `appsettings`, or a chat. A key pasted into a chat is already public — do not store or call OpenRouter with it.

## Endpoints / files
`Controllers/AiController.cs`; key form `wwwroot/js/ai-key.js`. Cross-cutting rules (`OpenRouterRules`) live in `src/FamilyVault.Files` — see `docs/AGENT.md`.
