/*
 * Copyright (c) 2023-2024 Rackslab
 *
 * This file is part of Slurm-web.
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { watch, onMounted } from 'vue'
import type { Ref } from 'vue'
import type { GatewayAnyClusterApiKey } from '@/composables/GatewayAPI'
import { useClusterDataPoller } from '@/composables/DataPoller'
import type { ClusterDataPoller } from '@/composables/DataPoller'
import type { MetricValue } from '@/composables/GatewayAPI'
import { Chart } from 'chart.js/auto'
import type { ChartOptions, TimeScaleOptions, TimeUnit, Point } from 'chart.js'
import 'chartjs-adapter-luxon'
import { DateTime } from 'luxon'

export interface DashboardLiveChart<MetricKeyType extends string> {
  metrics: ClusterDataPoller<Record<MetricKeyType, MetricValue[]>>
  setCluster: (cluster: string) => void
  setRange: (range: string) => void
  setCallback: (callback: GatewayAnyClusterApiKey) => void
}

export function useLiveHistogram<MetricKeyType extends string>(
  cluster: string,
  callback: GatewayAnyClusterApiKey,
  chartCanvas: Ref<HTMLCanvasElement | null>,
  labels: Record<string, { group: MetricKeyType[]; color: string; invert?: boolean }>,
  originalRange: string
): DashboardLiveChart<MetricKeyType> {
  let range = originalRange

  const metrics = useClusterDataPoller<Record<MetricKeyType, MetricValue[]>>(
    cluster,
    callback,
    30000,
    range
  )
  let chart: Chart | null

  /* Detect dark mode to set darker grid and axis colors */
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    Chart.defaults.borderColor = '#333333'
  }

  /* Update charts datasets when metrics values change. */
  watch(
    () => metrics.data.value,
    () => {
      /* If chart is null, stop here. */
      if (!chart) return

      /* If poller data is undefined, just set an empty dataset and leave. */
      if (!metrics.data.value) {
        chart.data.datasets = []
        return
      }
      const newSuggestedMin = suggestedMin()
      for (const [label, properties] of Object.entries(labels)) {
        /* If current state is not present in poller data keys, skip it. */
        if (!properties.group.some((metric) => metrics.data.value && metric in metrics.data.value))
          continue
        /* Compute new data array with values of first metric in group */
        const new_data = metrics.data.value[properties.group[0]].map((value) => ({
          x: value[0],
          y: properties.invert ? -value[1] : value[1]
        }))
        /* Sum values of all other metrics in the same group */
        if (properties.group.length > 1) {
          properties.group.forEach((metric, index) => {
            // skip index 0 already in new_data
            if (!index || !metrics.data.value) return
            metrics.data.value[metric].forEach((value) => {
              const item = new_data.find((_value) => _value.x == value[0])
              if (item) item.y += value[1]
            })
          })
        }
        /* Search for existing dataset which has the current state as label */
        const matching_datasets = chart.data.datasets.filter((dataset) => dataset.label == label)
        if (!matching_datasets.length) {
          /* If matching dataset has not been found, push a new dataset with all
           * its parameters. */
          chart.data.datasets.push({
            label: label,
            data: new_data,
            barPercentage: 1,
            fill: 'stack',
            backgroundColor: properties.color
          })
          continue
        } else {
          /* First remove all values older than new suggested minimal timestamp. */
          matching_datasets[0].data = matching_datasets[0].data.filter(
            (value) => (value as Point).x > newSuggestedMin
          )
          /* If matching dataset has been found, get the timestamp of the last
           * datapoint. */
          const last_timestamp = (matching_datasets[0].data.slice(-1)[0] as Point).x
          /* Iterate over new data to insert in the dataset only the datapoints
           * with a timestamp after the timestamp of the last datapoint in
           * current dataset, and count inserted values. */
          new_data.forEach((item) => {
            if (item.x > last_timestamp) {
              matching_datasets[0].data.push(item)
            }
          })
        }
      }
      /* Update suggested min and unit of x-axis. */
      if (chart.options.scales && chart.options.scales.x) {
        chart.options.scales.x.suggestedMin = newSuggestedMin
        ;(chart.options.scales.x as TimeScaleOptions).time.unit = timeframeUnit()
      }
      /* Finally update the chart. */
      chart.update()
    }
  )

  /* Compute the suggested min of the x-axis depending on the current dashboard
   * range. */
  function suggestedMin() {
    const now = Date.now()
    let result = 0
    if (range == 'hour') {
      result = now - 60 * 60 * 1000
    }
    if (range == 'day') {
      result = now - 24 * 60 * 60 * 1000
    }
    if (range == 'week') {
      result = now - 7 * 24 * 60 * 60 * 1000
    }
    return result
  }

  /* Determine the timeframe unit of the x-axis depending on the current
   * dashboard range. */
  function timeframeUnit(): TimeUnit {
    if (range == 'hour') {
      return 'minute'
    }
    return 'hour'
  }

  /* Determine ticks labels on y-axis */
  function yTicksCallback(value: number | string) {
    /* y-axis represent nodes, cores or jobs, select only integers values */
    if (typeof value !== 'number') return value
    if (value % 1 === 0) {
      return value
    }
  }

  /* Determine ticks labels on x-axis. */
  function xTicksCallback(value: number | string) {
    if (typeof value === 'number') {
      const dt = DateTime.fromMillis(value)
      // localized time simple every five minutes with hour range.
      if (range == 'hour' && value % (1000 * 60 * 5) === 0)
        return dt.toLocaleString(DateTime.TIME_SIMPLE)
      // localized time simple every hours with day range.
      if (range == 'day' && value % (1000 * 60 * 60) === 0)
        return dt.toLocaleString(DateTime.TIME_SIMPLE)
      // localized numeric day time at midnight and empty tick at noon.
      if (range == 'week') {
        if (value % (1000 * 60 * 60 * 24) === 0) {
          return dt.toLocaleString({ month: 'numeric', day: 'numeric' })
        }
        if (value % (1000 * 60 * 60 * 12) === 0) {
          return ''
        }
      }
    }
  }

  const genericOptions: ChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        stacked: true,
        beginAtZero: true,
        ticks: {
          callback: yTicksCallback
        }
      },
      x: {
        type: 'time',
        stacked: true,
        grid: {
          offset: false
        },
        ticks: {
          callback: xTicksCallback
        }
      }
    }
  }
  function setCluster(newCluster: string) {
    if (chart) chart.data.datasets = []
    metrics.setCluster(newCluster)
  }

  /* Clear chart datasets and set new poller param when dashboard range is
   * modified. */
  function setRange(newRange: string) {
    range = newRange
    if (chart) chart.data.datasets = []
    metrics.setParam(range)
  }

  /* Clear chart datasets and set new metrics callback */
  function setCallback(callback: GatewayAnyClusterApiKey) {
    if (chart) chart.data.datasets = []
    metrics.setCallback(callback)
  }

  onMounted(() => {
    if (chartCanvas.value) {
      chart = new Chart(chartCanvas.value, {
        type: 'bar',
        data: { datasets: [] },
        options: genericOptions
      })
    }
  })

  return { metrics, setCluster, setRange, setCallback }
}
