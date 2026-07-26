# Tactical HB — Business Operating System

**Master Plan & Agent Architecture**

Prepared 26 July 2026 · Internal instruction document for Claude Code

> Converted verbatim from `Tactical_HB_OS_Master_Plan.docx`, which is held
> outside the repository and is the document of record. This markdown copy is
> the one to read and to cite in a prompt — it diffs and greps. Re-convert it
> rather than editing it in place, so the two cannot drift apart.

---

## 1. Concept

Tactical HB Operating System (THB-OS) is a private, bilingual command centre built on top of the existing tactical-hb.com platform. It is not a second public website and not a separate consumer product. It is the internal brain of the company.

The system connects commerce data (orders, products, customers, shipping, payments) with operations data (stock, costs, suppliers, machines, partners, marketing, projects). Specialist AI agents read this shared memory, propose actions, and never spend money or change critical records without human approval.

Visual ambition: an interactive department map (pyramid or tactical layout) where each block opens a module. Optional later skin: agents represented as small tactical figures. The visual layer is secondary to correct data and rules.

### 1.1 Core principles

- **One shared memory** — Supabase remains the single source of truth
- **Admin only** — protected by existing `ADMIN_EMAILS` allowlist; fails closed
- **Human in the loop** — agents propose; founder approves actions that affect money, stock, or external messages
- **Bilingual** — English and Ukrainian throughout the admin OS
- **Same codebase** — lives inside the existing Next.js project, separate visual design for `/admin`
- **Build in phases** — each phase is usable alone; no empty pyramid

## 2. Where the programme sits

### 2.1 Technical placement

- Project: same Next.js + Supabase + Vercel repository as tactical-hb.com
- Routes: `/admin` and nested modules (`/admin/stock`, `/admin/partners`, `/admin/finance`, etc.)
- Optional subdomain later: `ops.tactical-hb.com` pointing at the same app
- Auth: existing admin allowlist (`admin@tactical-hb.com` and any additional emails)
- Database: new tables in the same Supabase project; no second database
- Jobs: Vercel cron / server routes for daily advisor runs and follow-up checks

### 2.2 Why not a separate application

- Orders, products, customers and stock must stay in sync — one database prevents drift
- One login, one deploy, one set of environment variables
- Lower cost and maintenance for a small team
- Public storefront stays light; heavy screens load only for admins

### 2.3 Design separation

The admin OS may use a completely different visual system from the public shop: denser layout, sidebar navigation, data tables, charts, darker or neutral utilitarian UI. Brand identity can still appear (logo, name), but the goal is speed and clarity, not premium retail aesthetics.

## 3. Why we need it — purpose and value

### 3.1 Problem

The storefront already sells, charges, ships and emails automatically. The remaining risk is operational: stockouts, unknown true margins, silent wholesale partners, ad spend without structure, and future projects without a savings plan. Spreadsheets and memory do not scale.

### 3.2 Purpose

- Give the founder a single place to see the state of the business
- Protect stock and margins
- Turn wholesale enquiries into managed relationships
- Make marketing planned instead of reactive
- Connect manufacturing costs and machines to real profit
- Support growth decisions with internal data, not guesswork

### 3.3 Business value

| Outcome | Value |
| --- | --- |
| Fewer stockouts | Protects retail trust and wholesale reliability |
| True margin visibility | Know which products and channels actually pay |
| Wholesale discipline | Follow-ups and partner status without mental load |
| Marketing structure | Campaign plans, creative library, spend tracking |
| Lean team | Automate operational thinking so headcount stays small |
| Future projects | Monthly savings targets for Tech Bowl and new lines |

## 4. System architecture

### 4.1 Three layers

**Layer 1 — Shared Memory:** database tables for stock, costs, partners, creatives, ad spend, projects, exhibitions, machines, agent recommendations.

**Layer 2 — Departments:** admin modules the founder opens (Stock, Suppliers & Costs, Finance, Wholesale, Marketing, Growth, Projects, Workshop).

**Layer 3 — Agents:** specialist assistants that read shared memory and output recommendations or drafts. They do not act on money or external email without approval.

### 4.2 Shared memory (minimum entities)

- `stock_items` — product/variant quantities, thresholds, lead times
- `stock_movements` — history of decreases (orders) and increases (batches)
- `cost_entries` — manufacturing, materials, logistics, taxes, shop, salaries, R&D, exhibitions, ads
- `suppliers` — name, contacts, lead time, notes
- `wholesale_partners` — company, status, last order, next follow-up
- `marketing_creatives` — assets, channel tags, product links
- `ad_spend` — channel, month, amount, simple results
- `projects` — future products, budgets, monthly savings target
- `exhibitions` — fairs, dates, costs, status
- `machines` — printers, engravers, notes on cost contribution
- `agent_runs` — log of advisor outputs for audit

## 5. Departments (pyramid blocks)

Each department is an admin section. Agents attach to departments.

| Department | Owns |
| --- | --- |
| Stock & Production | Quantities, movements, low-stock, production suggestions |
| Suppliers & Costs | Supplier records, unit costs, logistics, import, machine costs |
| Finance | Revenue, true margin, FX view, exports for accountant |
| Wholesale CRM | Partners, pipeline, follow-ups, order history per partner |
| Marketing & Leads | Campaign plans, creatives library, ad spend, newsletter hooks |
| Growth & Markets | Monthly growth actions, market notes, channel checklist |
| Projects & Exhibitions | Future products, savings targets, fair calendar |
| Workshop | Machines register, contribution to lower unit cost |

## 6. Agents — detailed definitions

Agents are specialists. They share the same memory. They coordinate by writing recommendations into shared tables that other agents and humans can read.

### 6.1 Stock Advisor

**Purpose:** prevent stockouts and over-production.

**Reads:** stock levels, paid order velocity (30/60/90 days), open unshipped orders, lead time, safety buffer, optional incoming batches.

**Outputs:** table of weeks of cover, status (Critical / Low / OK / Overstock), suggested produce/reorder quantity.

**Rules:** never auto-changes stock; stock changes only on paid orders or manual batch receipt. Recommendations rounded to practical batch sizes.

**Approval:** founder confirms production plan outside the system or logs a received batch.

### 6.2 Cost & Margin Guard

**Purpose:** show real profitability after manufacturing, delivery, fees, ads and overhead allocation.

**Reads:** product costs, order revenue, shipping costs, payment fees, ad spend, fixed costs.

**Outputs:** margin by product, margin by channel (retail vs wholesale), alerts when margin collapses.

**Rules:** does not change prices automatically; flags issues for human decision.

### 6.3 Wholesale Follow-up Agent

**Purpose:** keep partners warm without manual chasing.

**Reads:** partner status, last order date, enquiry dates, notes.

**Outputs:** list of partners quiet for 3–4 months; draft EN/UK follow-up email.

**Rules:** never sends email without explicit approval. Reply-To remains sales inbox pattern already used on the site.

### 6.4 Marketing Strategist

**Purpose:** structured campaigns, creative reuse, smarter spend.

**Reads:** products, stock (do not advertise empty items heavily), margins, past ad spend, creative library.

**Outputs:** monthly campaign outline (Meta, Reddit, organic), suggested budget split, draft copy EN/UK, which creatives to reuse, what to pause.

**Rules:** never spends ad budget autonomously. Stores new visuals in the creative library for reuse. Optimises for output per spend using entered results, not invented metrics.

### 6.5 Weekly Commander Brief

**Purpose:** one-page weekly situation report.

**Reads:** revenue, top products, critical stock, open wholesale items, marketing notes, project savings progress.

**Outputs:** bilingual brief every Monday (or on demand). Optional email to admin.

**Rules:** summary only; no automatic external actions.

### 6.6 Project Savings Coach

**Purpose:** fund future products (e.g. Tech Bowl / tech hookah) from real profits.

**Reads:** monthly profit estimate, project target budgets, deadlines.

**Outputs:** suggested monthly set-aside; progress against target.

**Rules:** advisory only.

### 6.7 How agents work together

- Stock Advisor warns Marketing Strategist indirectly via shared stock status (avoid pushing ads on Critical items)
- Cost & Margin Guard informs Marketing and Project Savings what is actually profitable
- Wholesale Follow-up uses order history from commerce + partner records
- Weekly Brief aggregates outputs from other agents into one view
- All agent runs are logged in `agent_runs` for transparency

## 7. How we build it — phases

Do not implement the full pyramid UI first. Deliver working data modules, then agents, then the visual command centre.

### Phase A — Shared memory + Stock + basic Costs

- Migrations for `stock_items`, `stock_movements`, `cost_entries` (minimal)
- Admin UI: view/edit stock, add batch, see movements
- Auto decrease stock when order status becomes paid
- Low-stock thresholds + email alert to admin
- Manual cost entry per product or per month

### Phase B — Finance snapshot + Wholesale CRM

- Revenue and simple margin views from orders + costs
- CSV export for accountant
- `wholesale_partners` table + admin CRUD + status pipeline
- Link partners to orders where possible

### Phase C — First agents

- Stock Advisor (read-only recommendations)
- Wholesale Follow-up Agent (drafts only)
- Weekly Commander Brief

### Phase D — Marketing & Projects

- Creative library + ad spend tracker
- Marketing Strategist agent (plans + drafts)
- Projects + exhibitions + savings coach

### Phase E — Command centre UI

- Department home map / pyramid navigation
- Unified admin shell with distinct design from the shop
- Optional tactical visual skin (figures) only after modules work

### Phase F — Deepening

- Richer supplier records and machine cost allocation
- FX live rates display for planning
- More automations under approval gates

## 8. Standing instructions for Claude Code

- Treat this document as the master architecture. Do not invent a parallel OS outside `/admin`.
- Never expose OS routes or data to non-admin users. Fail closed if `ADMIN_EMAILS` is missing.
- Agents must not send customer/partner email, change stock, change prices, or spend ad budget without an explicit approval step in the UI.
- Reuse existing patterns: Supabase migrations, server actions, Resend, cron, bilingual next-intl where admin copy needs translation.
- Prefer simple correct tables over premature AI. Data first, agents second, visual pyramid third.
- Sensitive keys stay in env vars; never ask the founder to paste secrets into chat.
- Each phase must ship usable alone. Do not leave half-wired modules in production.
- When starting a phase, restate goals, tables, UI surfaces, and approval gates before coding.

## 9. How to work with Claude Code on this project

### 9.1 Same folder vs new chat

**Recommendation:** keep the same project folder (same repository). Create a new Claude Code conversation dedicated to THB-OS when starting Phase A, and pin this document as the standing instruction.

**Why same folder:** the OS must import products, orders, auth, Resend, and admin guards from the existing app. A separate repo would force painful duplication or fragile sync.

**Why a dedicated chat/session for OS work:** keeps shop bugfixes from mixing with large architectural changes; you can still open the same codebase. For small shop fixes, use a separate chat. For OS phases, use an OS-focused chat and attach this plan.

### 9.2 Suggested workflow

- Store this document in the repo (e.g. `docs/THB_OS_Master_Plan.docx` or `.md`)
- At the start of each phase, paste: phase name + "follow docs/THB_OS_Master_Plan" + any extra constraints
- Require Claude to propose migration + UI outline before applying
- Verify on staging/production with the same discipline used for Monobank and Nova Poshta

## 10. Definition of success

Within the first phases, the founder can open `/admin` and within two minutes know: what is low in stock, what is truly profitable, which wholesale partners need a follow-up, and what the business should focus on this week.

Longer term, THB-OS becomes the place where stock, costs, partners, marketing plans, exhibitions and future products live together — with agents that reduce mental load without removing control.

---

Tactical HB · tactical-hb.com · Internal only
