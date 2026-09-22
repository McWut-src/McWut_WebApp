# Cat - Handmade bags (studio folder)

**Open first:** double-click `index.html`

## For the market

| Open this | What it does |
|-----------|----------------|
| **index.html** | Home menu |
| **Market_Weekend.html** | Stock, prices, orders, sold tracker |
| **Price_Tags.html** | Print tags (what is included) |
| **Printable_Pricing.html** | Cost vs 2.5× markup vs tags - print for planning |
| **Pricing_Guide.html** | Suggested V1/V2 prices |
| **vitrine.html** | Customer QR page (cat.mcwut.com) |

## Other tools

| Open this | What it does |
|-----------|----------------|
| **Cost_Calculator.html** | Material cost floor (interactive) |
| **Printable_Cost_Calculator.html** | Multi-page print: compare + sheet per bag |
| **Printable_Catalog.html** | Pretty catalog + cost compare table |
| **2780257459493577.pdf** | Original notebook PDF |

## How prices work

- **V1** = canvas exterior · **V2** = waxed canvas exterior (higher price)
- **Lining:** poly cotton (standard, default) or quilting cotton (premium) — rates in `data/materials.js`
- Customer contact: set in `data/catalog.js` (email + website)

### Edit data only (static files - no server)

All pages read numbers and names from `data/*.js`. Edit the right file, save, then refresh the HTML page (Ctrl+F5).

| File | What is in it |
|------|----------------|
| **materials.js** | Fabric, hardware, labels, table fee costs |
| **pricing.js** | Sell prices (ladder + per-pattern tags + ranges) |
| **patterns.js** | The 8 pattern names / metadata |
| **bom.js** | How much fabric/hardware per bag |
| **catalog.js** | Brand, contact, "what is included", pack list, market policy |
| **project-cat.js** | Helpers (do not hardcode prices here) |
| **cost-from-bom.js** | Cost calculator BOM engine |
| **bootstrap.js** | Empty shell for `PROJECT_DATA` |

### Script load order (every data page)

```
bootstrap → materials → patterns → bom → pricing → catalog → project-cat
(+ cost-from-bom on Cost_Calculator only)
```

## Folder

```
ProjectCat/
  index.html
  Market_Weekend.html
  Price_Tags.html
  Pricing_Guide.html
  vitrine.html
  Cost_Calculator.html
  Printable_Catalog.html
  2780257459493577.pdf
  data/
    bootstrap.js
    materials.js
    patterns.js
    bom.js
    pricing.js
    catalog.js
    project-cat.js
    cost-from-bom.js
```
