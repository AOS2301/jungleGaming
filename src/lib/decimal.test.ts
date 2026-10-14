import { describe, expect, it } from 'vitest'
import { ethAdd, ethCompare, ethMulInt, ethPercent, ethSub, formatEth, fromWei, isEthString, toWei } from './decimal'

describe('decimal (ETH como string)', () => {
  it('não perde precisão onde number perderia', () => {
    expect(ethAdd('0.1', '0.2')).toBe('0.3')
    expect(ethMulInt('0.0125', 3)).toBe('0.0375')
    expect(ethAdd('0.000000000000000001', '0.000000000000000002')).toBe('0.000000000000000003')
  })
  it('subtrai e compara', () => {
    expect(ethSub('1.4', '0.35')).toBe('1.05')
    expect(ethCompare('0.85', '0.850')).toBe(0)
    expect(ethCompare('1.4', '0.85')).toBe(1)
  })
  it('calcula percentuais truncando em 18 casas', () => {
    expect(ethPercent('2.5', '10')).toBe('0.25')
    expect(ethPercent('0.0125', '7.5')).toBe('0.0009375')
  })
  it('valida e converte', () => {
    expect(isEthString('1.5')).toBe(true)
    expect(isEthString('1,5')).toBe(false)
    expect(isEthString('-1')).toBe(false)
    expect(fromWei(toWei('12345.678'))).toBe('12345.678')
  })
  it('formata em pt-BR com no mínimo duas casas', () => {
    expect(formatEth('1.4')).toBe('1,40')
    expect(formatEth('0.0125')).toBe('0,0125')
    expect(formatEth('1234567.5')).toBe('1.234.567,50')
    expect(formatEth('3')).toBe('3,00')
  })
})
