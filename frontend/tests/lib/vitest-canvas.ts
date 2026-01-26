/*
 * Vitest setup script from Nija Squad awesome devs to inhibit canvas HTML
 * element in NodeJS with help of jest-canvas-mock.
 */

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/ban-ts-comment */
import { vi } from 'vitest'
import { Blob, File } from 'node:buffer'
;(global as any).jest = vi

// @ts-ignore
const { default: getCanvasWindow } = await import('jest-canvas-mock/lib/window')
const canvasWindow = getCanvasWindow(window)
global['CanvasRenderingContext2D'] = canvasWindow['CanvasRenderingContext2D']

// Ensure undici's Web IDL checks use Node's File/Blob classes.
// In some Node versions (e.g. 20, 24), Response.formData() validates parts
// with webidl.is.File/USVString.
// jsdom provides its own File/Blob, which fails undici's type assertions.
// Using Node's implementations avoids undici assertion errors in tests.
// For reference, see: https://github.com/rackslab/Slurm-web/issues/651
const NodeFile = File as unknown as typeof globalThis.File
const NodeBlob = Blob as unknown as typeof globalThis.Blob
globalThis.File = NodeFile
globalThis.Blob = NodeBlob
