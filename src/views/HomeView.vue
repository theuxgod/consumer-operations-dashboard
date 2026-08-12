<script setup lang="ts">
import { computed, ref } from 'vue'
import { Line } from 'vue-chartjs'
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Filler,
} from 'chart.js'
import metricsData from '../data/metrics.json'

ChartJS.register(
  Title,
  Tooltip,
  Legend,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Filler,
)

type RegionKey = 'global' | 'northAmerica' | 'europe' | 'asiaPacific'
type RangeKey = '7d' | '30d' | 'quarter' | 'ytd'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const data = metricsData as any

// ---- filters --------------------------------------------------------------
const selectedRegion = ref<RegionKey>('global')
const selectedRange = ref<RangeKey>('quarter')

const regionOptions = data.meta.regions as { key: RegionKey; label: string }[]
const rangeOptions = data.meta.dateRanges as { key: RangeKey; label: string }[]

// ---- formatters -----------------------------------------------------------
const usd0 = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
})
const usdCompact = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  notation: 'compact',
  maximumFractionDigits: 1,
})
const num = new Intl.NumberFormat('en-US')
const fmtPct = (ratio: number, dp = 1) => `${(ratio * 100).toFixed(dp)}%`
const signedPct = (p: number, dp = 1) => `${p >= 0 ? '+' : ''}${p.toFixed(dp)}%`

// ---- reactive slices ------------------------------------------------------
const kpi = computed(() => data.kpis[selectedRegion.value][selectedRange.value])
const trend = computed(
  () => data.salesTrend[selectedRegion.value][selectedRange.value] as
    { period: string; revenue: number; target: number; units: number }[],
)

interface ProductRow {
  id: string
  name: string
  category: string
  revenue: number
  unitsSold: number
  salesVsTarget: number
  inventoryQty: number
  daysOfSupply: number
  returnRate: number
  repairRate: number
  revenueAtRisk: number
  status: string
}

const products = computed<ProductRow[]>(() =>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data.products.map((p: any) => {
    const m = p.regions[selectedRegion.value]
    return {
      id: p.id,
      name: p.name,
      category: p.category,
      revenue: m.revenue,
      unitsSold: m.unitsSold,
      salesVsTarget: m.salesVsTarget,
      inventoryQty: m.inventoryQty,
      daysOfSupply: m.daysOfSupply,
      returnRate: m.returnRate,
      repairRate: m.repairRate,
      revenueAtRisk: m.revenueAtRisk,
      status: m.status,
    }
  }),
)

// ---- KPI card view models -------------------------------------------------
const kpiCards = computed(() => {
  const k = kpi.value
  return [
    {
      key: 'revenue',
      label: 'Revenue',
      icon: 'mdi-cash-multiple',
      value: usdCompact.format(k.revenue.value),
      delta: k.revenue.deltaPct,
      deltaGood: k.revenue.deltaPct >= 0,
      footnote: `${k.revenue.targetAttainmentPct}% of ${usdCompact.format(k.revenue.target)} target`,
      attainment: k.revenue.targetAttainmentPct,
      accent: 'primary',
    },
    {
      key: 'units',
      label: 'Units Sold',
      icon: 'mdi-package-variant-closed',
      value: num.format(k.unitsSold.value),
      delta: k.unitsSold.deltaPct,
      deltaGood: k.unitsSold.deltaPct >= 0,
      footnote: 'vs previous period',
      attainment: null,
      accent: 'secondary',
    },
    {
      key: 'inventoryRisk',
      label: 'Inventory Risk',
      icon: 'mdi-alert-decagram-outline',
      value: String(k.inventoryRisk.value),
      deltaRaw: `${k.inventoryRisk.direction === 'up' ? '+' : '-'}${k.inventoryRisk.delta}`,
      deltaGood: k.inventoryRisk.direction !== 'up',
      footnote: 'products at risk of stockout',
      attainment: null,
      accent: 'warning',
    },
    {
      key: 'revenueAtRisk',
      label: 'Revenue at Risk',
      icon: 'mdi-shield-alert-outline',
      value: usdCompact.format(k.revenueAtRisk.value),
      delta: k.revenueAtRisk.deltaPct,
      deltaGood: k.revenueAtRisk.direction !== 'up',
      footnote: 'exposed to inventory & returns',
      attainment: null,
      accent: 'error',
    },
  ]
})

// ---- Needs Attention: derived from product regional state -----------------
interface Alert {
  id: string
  severity: 'critical' | 'warning' | 'info'
  productName: string
  category: string
  title: string
  what: string
  why: string
  tags: { label: string; value: string }[]
  sortRisk: number
}

const RETURN_BASELINE = 0.03

const alerts = computed<Alert[]>(() => {
  const out: Alert[] = []
  let seq = 0
  const id = () => `alert-${++seq}`

  for (const p of products.value) {
    const base = { productName: p.name, category: p.category }

    if (p.daysOfSupply < 7) {
      out.push({
        ...base,
        id: id(),
        severity: 'critical',
        title: `${p.name} — ${p.daysOfSupply} days of inventory left`,
        what: `${num.format(p.inventoryQty)} units in stock against a ${fmtPct(p.salesVsTarget - 1, 0)} above-forecast run rate.`,
        why: `Demand will exhaust stock before replenishment, putting ${usdCompact.format(p.revenueAtRisk)} of revenue at risk.`,
        tags: [
          { label: 'Days of supply', value: `${p.daysOfSupply}d` },
          { label: 'Revenue at risk', value: usdCompact.format(p.revenueAtRisk) },
        ],
        sortRisk: p.revenueAtRisk,
      })
    } else if (p.daysOfSupply < 14) {
      out.push({
        ...base,
        id: id(),
        severity: 'warning',
        title: `${p.name} — inventory below two-week cover`,
        what: `${p.daysOfSupply} days of supply remaining at current sales velocity.`,
        why: `Requires expedited replenishment to avoid a stockout; ${usdCompact.format(p.revenueAtRisk)} of revenue is exposed.`,
        tags: [
          { label: 'Days of supply', value: `${p.daysOfSupply}d` },
          { label: 'Revenue at risk', value: usdCompact.format(p.revenueAtRisk) },
        ],
        sortRisk: p.revenueAtRisk,
      })
    }

    if (p.salesVsTarget > 1.18 && p.daysOfSupply < 30) {
      out.push({
        ...base,
        id: id(),
        severity: 'warning',
        title: `${p.name} — selling faster than forecast`,
        what: `Tracking ${fmtPct(p.salesVsTarget - 1, 0)} above target with ${p.daysOfSupply} days of cover.`,
        why: `Accelerating demand could turn into a stockout within the period if supply is not increased.`,
        tags: [
          { label: 'Sales vs. target', value: fmtPct(p.salesVsTarget, 0) },
          { label: 'Days of supply', value: `${p.daysOfSupply}d` },
        ],
        sortRisk: p.revenueAtRisk,
      })
    }

    if (p.returnRate > 0.08) {
      const affected = p.revenue * Math.max(0, p.returnRate - RETURN_BASELINE)
      out.push({
        ...base,
        id: id(),
        severity: 'critical',
        title: `${p.name} — return rate ${fmtPct(p.returnRate)}`,
        what: `Returns are running at ${fmtPct(p.returnRate)} versus a ~3% portfolio baseline.`,
        why: `Elevated returns erode margin and may signal a quality or expectation gap; ~${usdCompact.format(affected)} in revenue is affected.`,
        tags: [
          { label: 'Return rate', value: fmtPct(p.returnRate) },
          { label: 'Affected revenue', value: usdCompact.format(affected) },
        ],
        sortRisk: affected,
      })
    }

    if (p.repairRate > 0.05) {
      out.push({
        ...base,
        id: id(),
        severity: 'warning',
        title: `${p.name} — repair rate ${fmtPct(p.repairRate)}`,
        what: `Repair requests are at ${fmtPct(p.repairRate)}, well above the ~1.5% category norm.`,
        why: `A rising repair rate increases warranty cost and points to a potential reliability issue.`,
        tags: [{ label: 'Repair rate', value: fmtPct(p.repairRate) }],
        sortRisk: p.revenue * p.repairRate,
      })
    }

    if (p.salesVsTarget < 0.8 && p.daysOfSupply > 45) {
      out.push({
        ...base,
        id: id(),
        severity: 'info',
        title: `${p.name} — ${fmtPct(1 - p.salesVsTarget, 0)} below target`,
        what: `Revenue is ${fmtPct(1 - p.salesVsTarget, 0)} under plan with ${p.daysOfSupply} days of stock on hand.`,
        why: `Slow sell-through with high inventory ties up working capital and may warrant promotion or price review.`,
        tags: [
          { label: 'Sales vs. target', value: fmtPct(p.salesVsTarget, 0) },
          { label: 'Days of supply', value: `${p.daysOfSupply}d` },
        ],
        sortRisk: 0,
      })
    }
  }

  const rank = { critical: 0, warning: 1, info: 2 }
  return out.sort(
    (a, b) => rank[a.severity] - rank[b.severity] || b.sortRisk - a.sortRisk,
  )
})

const alertCounts = computed(() => ({
  critical: alerts.value.filter((a) => a.severity === 'critical').length,
  warning: alerts.value.filter((a) => a.severity === 'warning').length,
  info: alerts.value.filter((a) => a.severity === 'info').length,
}))

const severityMeta: Record<
  Alert['severity'],
  { color: string; icon: string; label: string }
> = {
  critical: { color: 'error', icon: 'mdi-alert-octagon', label: 'Critical' },
  warning: { color: 'warning', icon: 'mdi-alert', label: 'Warning' },
  info: { color: 'info', icon: 'mdi-information', label: 'Info' },
}

// ---- status chips ---------------------------------------------------------
const statusMeta: Record<string, { label: string; color: string }> = {
  critical: { label: 'Critical', color: 'error' },
  at_risk: { label: 'At risk', color: 'warning' },
  underperforming: { label: 'Underperforming', color: 'grey' },
  outperforming: { label: 'Outperforming', color: 'success' },
  healthy: { label: 'Healthy', color: 'success' },
}

// ---- product table --------------------------------------------------------
const headers = [
  { title: 'Product', key: 'name', align: 'start' as const },
  { title: 'Category', key: 'category', align: 'start' as const },
  { title: 'Revenue', key: 'revenue', align: 'end' as const },
  { title: 'Units', key: 'unitsSold', align: 'end' as const },
  { title: 'vs Target', key: 'salesVsTarget', align: 'end' as const },
  { title: 'Inventory', key: 'inventoryQty', align: 'end' as const },
  { title: 'Days Supply', key: 'daysOfSupply', align: 'end' as const },
  { title: 'Return Rate', key: 'returnRate', align: 'end' as const },
  { title: 'Status', key: 'status', align: 'center' as const },
]

const daysColor = (d: number) =>
  d < 7 ? 'text-error' : d < 14 ? 'text-warning' : 'text-medium-emphasis'
const returnColor = (r: number) =>
  r > 0.08 ? 'text-error' : r > 0.05 ? 'text-warning' : 'text-medium-emphasis'
const targetColor = (t: number) =>
  t >= 1.15 ? 'text-success' : t < 0.85 ? 'text-error' : 'text-high-emphasis'

// ---- chart ----------------------------------------------------------------
const chartData = computed(() => ({
  labels: trend.value.map((p) => p.period),
  datasets: [
    {
      label: 'Revenue',
      data: trend.value.map((p) => p.revenue),
      borderColor: '#5b9dff',
      backgroundColor: 'rgba(91, 157, 255, 0.12)',
      fill: true,
      tension: 0.35,
      pointRadius: 0,
      pointHoverRadius: 4,
      borderWidth: 2,
    },
    {
      label: 'Target',
      data: trend.value.map((p) => p.target),
      borderColor: '#6b7480',
      backgroundColor: 'transparent',
      borderDash: [6, 6],
      fill: false,
      tension: 0,
      pointRadius: 0,
      borderWidth: 1.5,
    },
  ],
}))

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  interaction: { mode: 'index' as const, intersect: false },
  plugins: {
    legend: {
      display: true,
      position: 'top' as const,
      align: 'end' as const,
      labels: {
        color: '#9aa4b2',
        boxWidth: 14,
        boxHeight: 3,
        usePointStyle: false,
        padding: 16,
      },
    },
    tooltip: {
      backgroundColor: '#1d222c',
      borderColor: '#2e3440',
      borderWidth: 1,
      titleColor: '#e6e8ee',
      bodyColor: '#c3c9d4',
      padding: 12,
      callbacks: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        label: (ctx: any) => `${ctx.dataset.label}: ${usd0.format(ctx.parsed.y)}`,
      },
    },
  },
  scales: {
    x: {
      grid: { color: 'rgba(255,255,255,0.04)' },
      border: { color: 'rgba(255,255,255,0.08)' },
      ticks: {
        color: '#6b7480',
        maxRotation: 0,
        autoSkip: true,
        maxTicksLimit: 8,
      },
    },
    y: {
      grid: { color: 'rgba(255,255,255,0.05)' },
      border: { display: false },
      ticks: {
        color: '#6b7480',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        callback: (v: any) => usdCompact.format(v),
      },
    },
  },
}))

const currentRegionLabel = computed(
  () => regionOptions.find((r) => r.key === selectedRegion.value)?.label ?? '',
)
const currentRangeLabel = computed(
  () => rangeOptions.find((r) => r.key === selectedRange.value)?.label ?? '',
)
</script>

<template>
  <div class="dash">
    <!-- Header -->
    <header class="dash-header">
      <div class="dash-header__inner">
        <div class="dash-header__brand">
          <v-icon icon="mdi-waveform" color="primary" size="28" />
          <div>
            <h1 class="dash-title">{{ data.meta.company }}</h1>
            <p class="dash-subtitle">Product &amp; Commercial Operations</p>
          </div>
        </div>

        <div class="dash-header__filters">
          <v-btn-toggle
            v-model="selectedRange"
            mandatory
            density="comfortable"
            variant="outlined"
            divided
            color="primary"
            class="range-toggle"
          >
            <v-btn
              v-for="r in rangeOptions"
              :key="r.key"
              :value="r.key"
              size="small"
            >
              {{ r.label }}
            </v-btn>
          </v-btn-toggle>

          <v-select
            v-model="selectedRegion"
            :items="regionOptions"
            item-title="label"
            item-value="key"
            variant="outlined"
            density="comfortable"
            hide-details
            prepend-inner-icon="mdi-earth"
            class="region-select"
          />
        </div>
      </div>
    </header>

    <main class="dash-body">
      <!-- Context line -->
      <div class="context-line">
        <span class="text-medium-emphasis">Showing</span>
        <strong>{{ currentRegionLabel }}</strong>
        <span class="text-medium-emphasis">·</span>
        <strong>{{ currentRangeLabel }}</strong>
        <v-spacer />
        <span class="text-medium-emphasis text-caption">
          {{ data.meta.periodLabel }} · updated {{ data.meta.generatedAt }}
        </span>
      </div>

      <!-- Key metrics -->
      <section aria-label="Key metrics">
        <v-row dense>
          <v-col v-for="card in kpiCards" :key="card.key" cols="12" sm="6" lg="3">
            <v-card class="kpi-card" rounded="lg" border>
              <div class="kpi-card__top">
                <span class="kpi-card__label">{{ card.label }}</span>
                <v-icon
                  :icon="card.icon"
                  :color="card.accent"
                  size="20"
                  class="kpi-card__icon"
                />
              </div>
              <div class="kpi-card__value tabular">{{ card.value }}</div>
              <div class="kpi-card__meta">
                <span
                  class="kpi-delta tabular"
                  :class="card.deltaGood ? 'delta-up' : 'delta-down'"
                >
                  <v-icon
                    :icon="card.deltaGood ? 'mdi-arrow-up' : 'mdi-arrow-up'"
                    size="14"
                    :style="{
                      transform:
                        (card.deltaRaw ?? String(card.delta)).startsWith('-')
                          ? 'rotate(180deg)'
                          : 'none',
                    }"
                  />
                  {{ card.deltaRaw ?? signedPct(card.delta as number) }}
                </span>
                <span class="kpi-card__footnote">{{ card.footnote }}</span>
              </div>
              <v-progress-linear
                v-if="card.attainment != null"
                :model-value="Math.min(card.attainment, 100)"
                :color="card.attainment >= 100 ? 'success' : 'primary'"
                bg-color="rgba(255,255,255,0.06)"
                height="4"
                rounded
                class="kpi-card__bar"
              />
            </v-card>
          </v-col>
        </v-row>
      </section>

      <!-- Needs Attention -->
      <section aria-label="Needs attention" class="mt-8">
        <div class="section-head">
          <div class="section-head__title">
            <v-icon icon="mdi-bell-ring-outline" size="22" class="mr-2" />
            <h2>Needs Attention</h2>
          </div>
          <div class="section-head__meta">
            <v-chip
              v-if="alertCounts.critical"
              color="error"
              size="small"
              variant="tonal"
              label
            >
              {{ alertCounts.critical }} Critical
            </v-chip>
            <v-chip
              v-if="alertCounts.warning"
              color="warning"
              size="small"
              variant="tonal"
              label
            >
              {{ alertCounts.warning }} Warning
            </v-chip>
            <v-chip
              v-if="alertCounts.info"
              color="info"
              size="small"
              variant="tonal"
              label
            >
              {{ alertCounts.info }} Info
            </v-chip>
          </div>
        </div>

        <v-row dense>
          <v-col
            v-for="alert in alerts"
            :key="alert.id"
            cols="12"
            md="6"
          >
            <v-card
              class="alert-card"
              :class="`alert-card--${alert.severity}`"
              rounded="lg"
              border
            >
              <div class="alert-card__head">
                <v-icon
                  :icon="severityMeta[alert.severity].icon"
                  :color="severityMeta[alert.severity].color"
                  size="20"
                />
                <div class="alert-card__titles">
                  <span class="alert-card__title">{{ alert.title }}</span>
                  <span class="alert-card__category">{{ alert.category }}</span>
                </div>
                <v-chip
                  :color="severityMeta[alert.severity].color"
                  size="x-small"
                  variant="tonal"
                  label
                >
                  {{ severityMeta[alert.severity].label }}
                </v-chip>
              </div>
              <p class="alert-card__what">{{ alert.what }}</p>
              <p class="alert-card__why">{{ alert.why }}</p>
              <div class="alert-card__tags">
                <div v-for="t in alert.tags" :key="t.label" class="alert-tag">
                  <span class="alert-tag__label">{{ t.label }}</span>
                  <span class="alert-tag__value tabular">{{ t.value }}</span>
                </div>
              </div>
            </v-card>
          </v-col>

          <v-col v-if="!alerts.length" cols="12">
            <v-card class="pa-6 text-center text-medium-emphasis" rounded="lg" border>
              <v-icon icon="mdi-check-circle-outline" color="success" size="28" />
              <p class="mt-2">No operational exceptions for this selection.</p>
            </v-card>
          </v-col>
        </v-row>
      </section>

      <!-- Performance trend -->
      <section aria-label="Sales performance" class="mt-8">
        <div class="section-head">
          <div class="section-head__title">
            <v-icon icon="mdi-chart-line" size="22" class="mr-2" />
            <h2>Sales Performance</h2>
          </div>
          <span class="text-medium-emphasis text-caption">
            Revenue vs. target · {{ currentRegionLabel }}
          </span>
        </div>
        <v-card class="pa-4 pa-md-6" rounded="lg" border>
          <div class="chart-wrap">
            <Line :data="chartData" :options="chartOptions" />
          </div>
        </v-card>
      </section>

      <!-- Product performance -->
      <section aria-label="Product performance" class="mt-8 mb-6">
        <div class="section-head">
          <div class="section-head__title">
            <v-icon icon="mdi-table-large" size="22" class="mr-2" />
            <h2>Product Performance</h2>
          </div>
          <span class="text-medium-emphasis text-caption">
            {{ products.length }} products · {{ currentRegionLabel }}
          </span>
        </div>
        <v-card rounded="lg" border>
          <v-data-table
            :headers="headers"
            :items="products"
            :items-per-page="25"
            density="comfortable"
            hover
            class="product-table"
          >
            <template #[`item.name`]="{ item }: { item: ProductRow }">
              <span class="font-weight-medium text-high-emphasis">{{ item.name }}</span>
            </template>
            <template #[`item.category`]="{ item }: { item: ProductRow }">
              <span class="text-medium-emphasis">{{ item.category }}</span>
            </template>
            <template #[`item.revenue`]="{ item }: { item: ProductRow }">
              <span class="tabular">{{ usd0.format(item.revenue) }}</span>
            </template>
            <template #[`item.unitsSold`]="{ item }: { item: ProductRow }">
              <span class="tabular">{{ num.format(item.unitsSold) }}</span>
            </template>
            <template #[`item.salesVsTarget`]="{ item }: { item: ProductRow }">
              <span class="tabular font-weight-medium" :class="targetColor(item.salesVsTarget)">
                {{ fmtPct(item.salesVsTarget, 0) }}
              </span>
            </template>
            <template #[`item.inventoryQty`]="{ item }: { item: ProductRow }">
              <span class="tabular">{{ num.format(item.inventoryQty) }}</span>
            </template>
            <template #[`item.daysOfSupply`]="{ item }: { item: ProductRow }">
              <span class="tabular font-weight-medium" :class="daysColor(item.daysOfSupply)">
                {{ item.daysOfSupply }}d
              </span>
            </template>
            <template #[`item.returnRate`]="{ item }: { item: ProductRow }">
              <span class="tabular" :class="returnColor(item.returnRate)">
                {{ fmtPct(item.returnRate) }}
              </span>
            </template>
            <template #[`item.status`]="{ item }: { item: ProductRow }">
              <v-chip
                :color="statusMeta[item.status]?.color ?? 'grey'"
                size="small"
                variant="tonal"
                label
              >
                {{ statusMeta[item.status]?.label ?? item.status }}
              </v-chip>
            </template>
          </v-data-table>
        </v-card>
      </section>
    </main>
  </div>
</template>

<style scoped>
.dash {
  max-width: 1440px;
  margin: 0 auto;
  padding: 0 24px 48px;
}

/* Header */
.dash-header {
  position: sticky;
  top: 0;
  z-index: 10;
  background: rgba(13, 15, 20, 0.85);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.07);
  margin: 0 -24px 24px;
  padding: 0 24px;
}
.dash-header__inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  padding: 18px 0;
  flex-wrap: wrap;
}
.dash-header__brand {
  display: flex;
  align-items: center;
  gap: 12px;
}
.dash-title {
  font-size: 20px;
  font-weight: 600;
  line-height: 1.2;
  color: #f3f5f9;
  margin: 0;
  letter-spacing: -0.2px;
}
.dash-subtitle {
  font-size: 12.5px;
  color: #7d8593;
  margin: 2px 0 0;
}
.dash-header__filters {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}
.range-toggle {
  height: 40px;
}
.region-select {
  min-width: 190px;
}

/* Context line */
.context-line {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13.5px;
  margin-bottom: 16px;
}
.context-line strong {
  color: #e6e8ee;
  font-weight: 600;
}

/* KPI cards */
.kpi-card {
  padding: 18px 20px 20px;
  height: 100%;
}
.kpi-card__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.kpi-card__label {
  font-size: 12.5px;
  font-weight: 500;
  letter-spacing: 0.3px;
  text-transform: uppercase;
  color: #8b93a1;
}
.kpi-card__value {
  font-size: 32px;
  font-weight: 650;
  line-height: 1.1;
  color: #f3f5f9;
  margin: 12px 0 8px;
  letter-spacing: -0.5px;
}
.kpi-card__meta {
  display: flex;
  align-items: baseline;
  gap: 8px;
  flex-wrap: wrap;
}
.kpi-delta {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  font-size: 13px;
  font-weight: 600;
}
.delta-up {
  color: #3ecf8e;
}
.delta-down {
  color: #f97066;
}
.kpi-card__footnote {
  font-size: 12px;
  color: #7d8593;
}
.kpi-card__bar {
  margin-top: 14px;
}

/* Section headers */
.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 14px;
  flex-wrap: wrap;
}
.section-head__title {
  display: flex;
  align-items: center;
  color: #e6e8ee;
}
.section-head h2 {
  font-size: 17px;
  font-weight: 600;
  margin: 0;
  letter-spacing: -0.2px;
}
.section-head__meta {
  display: flex;
  gap: 8px;
}

/* Alert cards */
.alert-card {
  padding: 16px 18px;
  height: 100%;
  position: relative;
  overflow: hidden;
}
.alert-card::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
}
.alert-card--critical::before {
  background: #f04438;
}
.alert-card--warning::before {
  background: #f79009;
}
.alert-card--info::before {
  background: #5b9dff;
}
.alert-card__head {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin-bottom: 10px;
}
.alert-card__titles {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
}
.alert-card__title {
  font-size: 14.5px;
  font-weight: 600;
  color: #f3f5f9;
  line-height: 1.3;
}
.alert-card__category {
  font-size: 11.5px;
  color: #7d8593;
  margin-top: 2px;
}
.alert-card__what {
  font-size: 13px;
  color: #c3c9d4;
  margin: 0 0 6px;
  line-height: 1.45;
}
.alert-card__why {
  font-size: 12.5px;
  color: #8b93a1;
  margin: 0 0 12px;
  line-height: 1.45;
}
.alert-card__tags {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}
.alert-tag {
  display: flex;
  flex-direction: column;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 8px;
  padding: 6px 12px;
}
.alert-tag__label {
  font-size: 10.5px;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  color: #7d8593;
}
.alert-tag__value {
  font-size: 14px;
  font-weight: 600;
  color: #e6e8ee;
}

/* Chart */
.chart-wrap {
  height: 320px;
}

/* Table */
.product-table :deep(th) {
  font-size: 11.5px !important;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  color: #8b93a1 !important;
  font-weight: 600 !important;
}
.product-table :deep(td) {
  font-size: 13.5px;
}
</style>
