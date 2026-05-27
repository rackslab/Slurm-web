import { beforeEach, describe, expect, test, vi } from 'vitest'
import { useBranding } from '@/composables/Branding'
import type { ColorConfiguration, LogoConfiguration } from '@/plugins/runtimeConfiguration'

const mockRuntimeConfiguration = vi.hoisted(() => ({
  colors: undefined as ColorConfiguration | undefined,
  logo: undefined as LogoConfiguration | undefined
}))

vi.mock('@/plugins/runtimeConfiguration', () => ({
  useRuntimeConfiguration: () => mockRuntimeConfiguration
}))

describe('useBranding', () => {
  beforeEach(() => {
    mockRuntimeConfiguration.colors = undefined
    mockRuntimeConfiguration.logo = undefined
  })

  test('returns defaults when branding is not configured', () => {
    const branding = useBranding()

    expect(branding.logoAlt.value).toBe('Slurm-web')
    expect(branding.logoLogin.value).toBe('/logo/slurm-web_logo.png')
    expect(branding.logoLoginDark.value).toBe('/logo/slurm-web_logo_dark.png')
    expect(branding.logoHorizontal.value).toBe('/logo/slurm-web_horizontal.png')
    expect(branding.logoHorizontalDark.value).toBe('/logo/slurm-web_horizontal_dark.png')
    expect(branding.brandMainRgb.value).toEqual({ r: 117, g: 154, b: 184 })
  })

  test('logoAlt returns configured alt text', () => {
    mockRuntimeConfiguration.logo = { alt: 'My HPC Portal' }
    const { logoAlt } = useBranding()
    expect(logoAlt.value).toBe('My HPC Portal')
  })

  test('logoLogin resolves configured absolute path', () => {
    mockRuntimeConfiguration.logo = { login: '/branding/logo_login.png' }
    const { logoLogin } = useBranding()
    expect(logoLogin.value).toBe('/branding/logo_login.png')
  })

  test('logoLoginDark resolves configured absolute path', () => {
    mockRuntimeConfiguration.logo = { login_dark: '/branding/logo_login_dark.png' }
    const { logoLoginDark } = useBranding()
    expect(logoLoginDark.value).toBe('/branding/logo_login_dark.png')
  })

  test('logoHorizontal resolves configured absolute path', () => {
    mockRuntimeConfiguration.logo = { horizontal: '/branding/logo_horizontal.png' }
    const { logoHorizontal } = useBranding()
    expect(logoHorizontal.value).toBe('/branding/logo_horizontal.png')
  })

  test('logoHorizontalDark resolves configured absolute path', () => {
    mockRuntimeConfiguration.logo = {
      horizontal_dark: '/branding/logo_horizontal_dark.png'
    }
    const { logoHorizontalDark } = useBranding()
    expect(logoHorizontalDark.value).toBe('/branding/logo_horizontal_dark.png')
  })

  test('brandMainRgb parses configured hex color', () => {
    mockRuntimeConfiguration.colors = { main: '#759ab8' }
    const { brandMainRgb } = useBranding()
    expect(brandMainRgb.value).toEqual({ r: 117, g: 154, b: 184 })
  })

  test('brandMainRgb parses shorthand hex color', () => {
    mockRuntimeConfiguration.colors = { main: '#abc' }
    const { brandMainRgb } = useBranding()
    expect(brandMainRgb.value).toEqual({ r: 170, g: 187, b: 204 })
  })
})
