# Blue Radio Audio Labs — Product & Commercial Operations Dashboard

An internal operational dashboard for the Director of Product & Commercial Operations at Blue Radio Audio Labs. It surfaces business health, flags operational exceptions, and supports data-driven decisions across the product portfolio.

For the full product and design specification see [BRIEF.md](./BRIEF.md).

---

## Purpose

Enable the Director of Product & Commercial Operations to:

- Understand overall business health at a glance
- Identify products or regions that require immediate intervention
- Monitor inventory risk before stockouts occur
- Track revenue performance against target across date ranges and regions
- Detect elevated return or repair rates early

---

## Primary user

**Director of Product & Commercial Operations** — responsible for sales performance, inventory, distribution, product launches, and customer returns/repairs across the full product portfolio.

---

## Core features

| Feature | Description |
|---|---|
| **Business Health KPIs** | Revenue, Units Sold, Inventory Risk, and Revenue at Risk — each with period-over-period delta and target attainment |
| **Needs Attention** | Severity-ranked operational alerts (Critical / Warning / Info) derived live from filtered data, with progressive disclosure |
| **Sales Performance** | Revenue vs. target trend chart with dynamic insight, variance metrics, and target line annotation |
| **Product Performance** | Sortable table with revenue, units, vs-target, inventory, days of supply, return rate, and operational health status |
| **Date range filter** | Last 7 days · Last 30 days · Quarter · Year to Date — all KPIs, charts, and product data reconcile to the selected window |
| **Region filter** | Global · North America · Europe · Asia Pacific |
| **Light / dark mode** | Toggle in the header; theme-aware throughout |

---

## Tech stack

- **Vue 3** + Composition API (`<script setup>`)
- **TypeScript**
- **Vuetify 3** — component library and theming
- **Chart.js** via **vue-chartjs** — sales trend chart
- **Vite** — build tool
- Mock data from `src/data/metrics.json` (no API calls)

---

## Local setup

```bash
# Install dependencies
npm install

# Start dev server (http://localhost:5173)
npm run dev

# Type-check and build for production
npm run build
```

Requires Node.js 18 or later.
