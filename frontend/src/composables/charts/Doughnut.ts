/*
 * Copyright (c) 2025 Rackslab
 *
 * This file is part of Slurm-web.
 *
 * SPDX-License-Identifier: GPL-3.0-or-later

*/
import { onMounted, useTemplateRef } from 'vue'
//import type { Ref } from 'vue'
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

  function updateData(data: number[]) {
    if (!chart) return
    chart.data.datasets = [
      { data: data, backgroundColor: labels.map((label) => label.color), rotation: 180 }
    ]
    chart.update()
  }

  onMounted(() => {
    console.log('initializing doughnut chart', chartCanvas)
    if (chartCanvas.value) {
      chart = new Chart(chartCanvas.value, {
        type: 'doughnut',
        data: {
          labels: labels.map((label) => label.name),
          datasets: [
            {
              data: data,
              backgroundColor: labels.map((label) => label.color),
              rotation: 180
            }
          ]
        },
        options: genericOptions
      })
    }
  })

  return { updateData }
}
