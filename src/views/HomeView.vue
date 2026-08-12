<script setup lang="ts">
import { computed, ref, watchEffect } from 'vue'
import { useTheme } from 'vuetify'
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

// ---- theme ----------------------------------------------------------------
const theme = useTheme()
const isDark = computed(() => theme.current.value.dark)
function toggleTheme() {
  theme.change(isDark.value ? 'operationsLight' : 'operationsDark')
}
// keep the page (overscroll) background in sync with the active theme
watchEffect(() => {
  document.body.style.backgroundColor = isDark.value ? '#0d0f14' : '#f4f5f8'
})
const barBg = computed(() =>
  isDark.value ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)',
)

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

// ---- progressive disclosure by severity -----------------------------------
const WARNING_PREVIEW = 3
const showAllWarnings = ref(false)
const showAllInfo = ref(false)

const criticalAlerts = computed(() =>
  alerts.value.filter((a) => a.severity === 'critical'),
)
const warningAlerts = computed(() =>
  alerts.value.filter((a) => a.severity === 'warning'),
)
const infoAlerts = computed(() => alerts.value.filter((a) => a.severity === 'info'))

const visibleWarnings = computed(() =>
  showAllWarnings.value
    ? warningAlerts.value
    : warningAlerts.value.slice(0, WARNING_PREVIEW),
)
const hiddenWarningCount = computed(() =>
  Math.max(0, warningAlerts.value.length - WARNING_PREVIEW),
)

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
  { title: 'Status', key: 'status', align: 'start' as const },
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

const chartOptions = computed(() => {
  const dark = isDark.value
  const gridColor = dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)'
  const gridColorX = dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)'
  const borderColor = dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)'
  const tickColor = dark ? '#6b7480' : '#6b7480'
  const legendColor = dark ? '#9aa4b2' : '#5a6473'
  const tooltipBg = dark ? '#1d222c' : '#ffffff'
  const tooltipBorder = dark ? '#2e3440' : '#e2e5ea'
  const tooltipTitle = dark ? '#e6e8ee' : '#1a1d24'
  const tooltipBody = dark ? '#c3c9d4' : '#4a5160'
  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index' as const, intersect: false },
    plugins: {
      legend: {
        display: true,
        position: 'top' as const,
        align: 'end' as const,
        labels: {
          color: legendColor,
          boxWidth: 14,
          boxHeight: 3,
          usePointStyle: false,
          padding: 16,
        },
      },
      tooltip: {
        backgroundColor: tooltipBg,
        borderColor: tooltipBorder,
        borderWidth: 1,
        titleColor: tooltipTitle,
        bodyColor: tooltipBody,
        padding: 12,
        callbacks: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          label: (ctx: any) => `${ctx.dataset.label}: ${usd0.format(ctx.parsed.y)}`,
        },
      },
    },
    scales: {
      x: {
        grid: { color: gridColorX },
        border: { color: borderColor },
        ticks: {
          color: tickColor,
          maxRotation: 0,
          autoSkip: true,
          maxTicksLimit: 8,
        },
      },
      y: {
        grid: { color: gridColor },
        border: { display: false },
        ticks: {
          color: tickColor,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          callback: (v: any) => usdCompact.format(v),
        },
      },
    },
  }
})

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

          <v-btn
            :icon="isDark ? 'mdi-weather-night' : 'mdi-weather-sunny'"
            variant="tonal"
            density="comfortable"
            :aria-label="isDark ? 'Switch to light mode' : 'Switch to dark mode'"
            @click="toggleTheme"
          >
            <v-icon :icon="isDark ? 'mdi-weather-night' : 'mdi-weather-sunny'" />
            <v-tooltip activator="parent" location="bottom">
              {{ isDark ? 'Switch to light mode' : 'Switch to dark mode' }}
            </v-tooltip>
          </v-btn>
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
                :bg-color="barBg"
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

        <template v-if="alerts.length">
          <!-- Critical: dominant, all shown -->
          <div v-if="criticalAlerts.length" class="alert-group">
            <div class="alert-group__label alert-group__label--critical">
              <span
                class="alert-group__dot"
                :style="{ background: 'rgb(var(--v-theme-error))' }"
              />
              Critical · {{ criticalAlerts.length }}
            </div>
            <v-row dense>
              <v-col
                v-for="alert in criticalAlerts"
                :key="alert.id"
                cols="12"
                md="6"
              >
                <v-card class="alert-card alert-card--critical" rounded="lg" border>
                  <div class="alert-card__head">
                    <v-icon
                      :icon="severityMeta[alert.severity].icon"
                      :color="severityMeta[alert.severity].color"
                      size="22"
                    />
                    <div class="alert-card__titles">
                      <span class="alert-card__title">{{ alert.title }}</span>
                      <span class="alert-card__category">{{ alert.category }}</span>
                    </div>
                    <v-chip
                      :color="severityMeta[alert.severity].color"
                      size="x-small"
                      variant="flat"
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
            </v-row>
          </div>

          <!-- Warnings: reduced weight, top 3 with progressive disclosure -->
          <div v-if="warningAlerts.length" class="alert-group">
            <div class="alert-group__label">
              <span
                class="alert-group__dot"
                :style="{ background: 'rgb(var(--v-theme-warning))' }"
              />
              Warnings · {{ warningAlerts.length }}
            </div>
            <v-row dense>
              <v-col
                v-for="alert in visibleWarnings"
                :key="alert.id"
                cols="12"
                sm="6"
                lg="4"
              >
                <v-card class="alert-card alert-card--warning" rounded="lg" border>
                  <div class="alert-card__head">
                    <v-icon
                      :icon="severityMeta[alert.severity].icon"
                      :color="severityMeta[alert.severity].color"
                      size="18"
                    />
                    <div class="alert-card__titles">
                      <span class="alert-card__title">{{ alert.title }}</span>
                      <span class="alert-card__category">{{ alert.category }}</span>
                    </div>
                  </div>
                  <p class="alert-card__what">{{ alert.what }}</p>
                  <div class="alert-card__tags">
                    <div v-for="t in alert.tags" :key="t.label" class="alert-tag">
                      <span class="alert-tag__label">{{ t.label }}</span>
                      <span class="alert-tag__value tabular">{{ t.value }}</span>
                    </div>
                  </div>
                </v-card>
              </v-col>
            </v-row>
            <div v-if="hiddenWarningCount > 0" class="alert-more">
              <v-btn
                variant="text"
                color="warning"
                size="small"
                :append-icon="showAllWarnings ? 'mdi-chevron-up' : 'mdi-chevron-down'"
                @click="showAllWarnings = !showAllWarnings"
              >
                {{
                  showAllWarnings
                    ? 'Show fewer warnings'
                    : `View ${hiddenWarningCount} more warning${hiddenWarningCount > 1 ? 's' : ''}`
                }}
              </v-btn>
            </div>
          </div>

          <!-- Info: lowest weight, collapsed compact list -->
          <div v-if="infoAlerts.length" class="alert-group">
            <div class="alert-group__label alert-group__label--row">
              <span
                class="alert-group__dot"
                :style="{ background: 'rgb(var(--v-theme-info))' }"
              />
              Info · {{ infoAlerts.length }}
              <v-btn
                variant="text"
                size="x-small"
                class="ml-1"
                :append-icon="showAllInfo ? 'mdi-chevron-up' : 'mdi-chevron-down'"
                @click="showAllInfo = !showAllInfo"
              >
                {{ showAllInfo ? 'Hide' : 'View' }}
              </v-btn>
            </div>
            <v-expand-transition>
              <div v-show="showAllInfo" class="info-list">
                <div v-for="alert in infoAlerts" :key="alert.id" class="info-row">
                  <v-icon
                    :icon="severityMeta[alert.severity].icon"
                    color="info"
                    size="16"
                  />
                  <span class="info-row__title">{{ alert.title }}</span>
                  <span class="info-row__what">{{ alert.what }}</span>
                </div>
              </div>
            </v-expand-transition>
          </div>
        </template>

        <v-card
          v-else
          class="pa-6 text-center text-medium-emphasis"
          rounded="lg"
          border
        >
          <v-icon icon="mdi-check-circle-outline" color="success" size="28" />
          <p class="mt-2">No operational exceptions for this selection.</p>
        </v-card>
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
  background: rgba(var(--v-theme-background), 0.82);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.08);
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
  color: rgb(var(--v-theme-on-surface));
  margin: 0;
  letter-spacing: -0.2px;
}
.dash-subtitle {
  font-size: 12.5px;
  color: rgba(var(--v-theme-on-surface), 0.55);
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
  color: rgb(var(--v-theme-on-surface));
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
  color: rgba(var(--v-theme-on-surface), 0.6);
}
.kpi-card__value {
  font-size: 32px;
  font-weight: 650;
  line-height: 1.1;
  color: rgb(var(--v-theme-on-surface));
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
  color: rgb(var(--v-theme-success));
}
.delta-down {
  color: rgb(var(--v-theme-error));
}
.kpi-card__footnote {
  font-size: 12px;
  color: rgba(var(--v-theme-on-surface), 0.55);
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
  color: rgb(var(--v-theme-on-surface));
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

/* Alert groups — progressive visual hierarchy */
.alert-group {
  margin-bottom: 20px;
}
.alert-group:last-child {
  margin-bottom: 0;
}
.alert-group__label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: rgba(var(--v-theme-on-surface), 0.5);
  margin: 2px 0 12px;
}
.alert-group__label--critical {
  font-size: 12px;
  color: rgb(var(--v-theme-error));
}
.alert-group__dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex: none;
}
.alert-more {
  margin-top: 6px;
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
  background: rgb(var(--v-theme-error));
  width: 4px;
}
.alert-card--warning::before {
  background: rgb(var(--v-theme-warning));
  width: 2px;
  opacity: 0.8;
}
.alert-card--info::before {
  background: rgb(var(--v-theme-info));
}

/* Critical: dominant */
.alert-card--critical {
  background: rgba(var(--v-theme-error), 0.06);
  border-color: rgba(var(--v-theme-error), 0.28) !important;
  padding: 18px 20px;
}
.alert-card--critical .alert-card__title {
  font-size: 15.5px;
}

/* Warning: reduced weight */
.alert-card--warning {
  padding: 13px 15px;
}
.alert-card--warning .alert-card__title {
  font-size: 13.5px;
}
.alert-card--warning .alert-card__what {
  font-size: 12.5px;
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
  color: rgb(var(--v-theme-on-surface));
  line-height: 1.3;
}
.alert-card__category {
  font-size: 11.5px;
  color: rgba(var(--v-theme-on-surface), 0.55);
  margin-top: 2px;
}
.alert-card__what {
  font-size: 13px;
  color: rgba(var(--v-theme-on-surface), 0.82);
  margin: 0 0 6px;
  line-height: 1.45;
}
.alert-card__why {
  font-size: 12.5px;
  color: rgba(var(--v-theme-on-surface), 0.62);
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
  background: rgba(var(--v-theme-on-surface), 0.04);
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  border-radius: 8px;
  padding: 6px 12px;
}
.alert-tag__label {
  font-size: 10.5px;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  color: rgba(var(--v-theme-on-surface), 0.55);
}
.alert-tag__value {
  font-size: 14px;
  font-weight: 600;
  color: rgb(var(--v-theme-on-surface));
}

/* Info: lowest weight compact rows */
.alert-group__label--row {
  margin-bottom: 8px;
}
.info-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding-top: 2px;
}
.info-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 12px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.07);
  background: rgba(var(--v-theme-on-surface), 0.02);
  border-radius: 8px;
  min-width: 0;
}
.info-row__title {
  font-size: 12.5px;
  font-weight: 600;
  color: rgb(var(--v-theme-on-surface));
  white-space: nowrap;
  flex: none;
}
.info-row__what {
  font-size: 12px;
  color: rgba(var(--v-theme-on-surface), 0.55);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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
  color: rgba(var(--v-theme-on-surface), 0.6) !important;
  font-weight: 600 !important;
}
.product-table :deep(td) {
  font-size: 13.5px;
}
</style>
