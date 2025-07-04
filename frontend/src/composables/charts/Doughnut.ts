/*
 * Copyright (c) 2025 Rackslab
 *
 * This file is part of Slurm-web.
 *
 * SPDX-License-Identifier: GPL-3.0-or-later

*/
import { onMounted, useTemplateRef } from 'vue'
import { Chart } from 'chart.js/auto'
import type { ChartOptions } from 'chart.js'

export default function useDoughnutChart(
  canvasRef: string,
  labels: { name: string; color: string }[],
  data: number[]
) {
  const chartCanvas = useTemplateRef<HTMLCanvasElement>(canvasRef)

  let chart: Chart | null = null
  const genericOptions: ChartOptions = {
    responsive: true,

    plugins: {
      legend: {
        position: 'top'
      }
    }
  }

  let borderColor = '#ffffff'
  /* Detect dark mode to set darker grid and axis colors */
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    borderColor = '#333333'
  }

  function updateData(data: number[]) {
    if (!chart) return
    chart.data.datasets = [
      {
        data: data,
        backgroundColor: labels.map((label) => label.color),
        borderColor: borderColor,
        rotation: 180
      }
    ]
    chart.update()
  }

  onMounted(() => {
    if (chartCanvas.value) {
      chart = new Chart(chartCanvas.value, {
        type: 'doughnut',
        data: {
          labels: labels.map((label) => label.name),
          datasets: []
        },
        options: genericOptions
      })
      updateData(data)
    }
  })

  return { updateData }
}
