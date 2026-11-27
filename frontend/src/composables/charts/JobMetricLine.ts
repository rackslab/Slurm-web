/*
 * Copyright (c) 2026 Rackslab
 *
 * This file is part of Slurm-web.
 *
 * SPDX-License-Identifier: MIT
 */

import { watch, onMounted, onUnmounted } from 'vue'
import type { Ref } from 'vue'
import { Chart } from 'chart.js/auto'
import type { ChartDataset, ChartOptions, TimeUnit } from 'chart.js'
import 'chartjs-adapter-luxon'
import { type MetricValue } from '@/composables/gateway/types/metrics'
import { getBytesHumanUnit } from '@/composables/gateway/slurm/sizes'

export type JobMetricUnit = 'percent' | 'bytes'

export interface JobMetricSeries {
  label: string
  color: string
  values: MetricValue[]
  /* Dashed line without area, eg. for limits */
  dashed?: boolean
}

/* Range of the x-axis, timestamps in milliseconds */
export interface JobMetricRange {
  min: number
  max: number
}

/* Select time unit of x-axis depending on the duration of the range. */
export function jobMetricTimeUnit(range: JobMetricRange): TimeUnit {
  const duration = range.max - range.min
  if (duration <= 2 * 60 * 60 * 1000) return 'minute'
  if (duration <= 3 * 24 * 60 * 60 * 1000) return 'hour'
  return 'day'
}

/* Format value on y-axis depending on unit. */
export function jobMetricFormatValue(unit: JobMetricUnit, value: number): string {
  if (unit === 'percent') return `${Math.round(value * 100) / 100}%`
  return getBytesHumanUnit(value)
}

/* Return step between ticks on y-axis for values in bytes up to max, as a power
 * of two to get round values in binary units (eg. 512MB, 1GB, 1.5GB). Return
 * undefined when max is not positive, to let chart.js select the step. */
export function jobMetricBytesStep(max: number): number | undefined {
  if (!(max > 0)) return undefined
  /* Target about 6 ticks */
  const target = max / 6
  let step = 1
  while (step * 2 <= target) step *= 2
  return step
}

/* Line chart of a job metric over the lifetime of the job. */
export function useJobMetricLine(
  chartCanvas: Ref<HTMLCanvasElement | null>,
  unit: JobMetricUnit,
  series: Ref<JobMetricSeries[]>,
  range: Ref<JobMetricRange>
) {
  let chart: Chart<'line', MetricValue[]> | null = null

  /* Detect dark mode to set darker grid and axis colors */
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    Chart.defaults.borderColor = '#333333'
  }

  function datasets(): ChartDataset<'line', MetricValue[]>[] {
    /* Areas are filled under a single plain series only, filled areas of multiple
     * series (eg. per node) would hide each other. */
    const filled = series.value.filter((serie) => !serie.dashed).length === 1
    return series.value.map((serie) => ({
      label: serie.label,
      data: serie.values,
      borderColor: serie.color,
      backgroundColor: serie.dashed
        ? 'transparent'
        : filled
          ? serie.color.replace(/1\)$/, '0.2)')
          : serie.color,
      borderDash: serie.dashed ? [6, 4] : [],
      borderWidth: 2,
      fill: filled && !serie.dashed,
      pointRadius: 0,
      tension: 0.2
    }))
  }

  function options(): ChartOptions<'line'> {
    const max = Math.max(
      0,
      ...series.value.flatMap((serie) => serie.values.map((value) => value[1]))
    )
    return {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: series.value.length > 1 },
        tooltip: {
          callbacks: {
            label: (context) =>
              `${context.dataset.label}: ${jobMetricFormatValue(unit, context.parsed.y ?? 0)}`
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          suggestedMax: unit === 'percent' ? 100 : undefined,
          ticks: {
            stepSize: unit === 'bytes' ? jobMetricBytesStep(max) : undefined,
            callback: (value) =>
              typeof value === 'number' ? jobMetricFormatValue(unit, value) : value
          }
        },
        x: {
          type: 'time',
          min: range.value.min,
          max: range.value.max,
          time: { unit: jobMetricTimeUnit(range.value) }
        }
      }
    }
  }

  function update() {
    if (!chart) return
    chart.data.datasets = datasets()
    chart.options = options()
    chart.update()
  }

  watch([series, range], update, { deep: true })

  onMounted(() => {
    if (chartCanvas.value) {
      chart = new Chart(chartCanvas.value, {
        type: 'line',
        data: { datasets: datasets() },
        options: options()
      })
    }
  })

  onUnmounted(() => {
    if (chart) {
      chart.destroy()
      chart = null
    }
  })
}
