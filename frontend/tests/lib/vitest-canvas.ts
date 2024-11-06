/*
 * Vitest setup script from Nija Squad awesome devs to inhibit canvas HTML
 * element in NodeJS with help of jest-canvas-mock.
 */

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/ban-ts-comment */
import { vi } from 'vitest'
;(global as any).jest = vi

// @ts-ignore
const { default: getCanvasWindow } = await import('jest-canvas-mock/lib/window')
const canvasWindow = getCanvasWindow(window)
global['CanvasRenderingContext2D'] = canvasWindow['CanvasRenderingContext2D']
