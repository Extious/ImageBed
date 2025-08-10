import axios from 'axios'
import { LanguageEnum } from '@/common/model'

/**
 * 判断系统是否是黑暗模式
 */
export const isDarkModeOfSystem = (): boolean => {
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
}

/**
 * 获取系统名称
 * @returns 'mac' | 'win' | 'linux' | null
 */
export const getOSName = (): 'mac' | 'win' | 'linux' | null => {
  const { platform } = navigator
  if (platform.includes('Mac')) {
    return 'mac'
  }
  if (platform.includes('Win')) {
    return 'win'
  }
  if (platform.includes('Linux')) {
    return 'linux'
  }
  return null
}

/**
 * 获取本机 IP 地址的所属地区
 * CN 中国大陆
 * HK 中国香港
 * TW 中国台湾
 * SG 新加坡
 * JP 日本
 * US 美国
 */
export const getRegionByIP = async (): Promise<'CN' | 'HK' | 'TW' | 'SG' | 'US'> => {
  // 为避免首次进入页面外部请求带来 CORS/429 报错，直接返回默认地区
  return Promise.resolve('CN')
}

/**
 * 根据地区编码获取语言枚举
 * @param region
 */
export const getLanguageByRegion = (region: string): LanguageEnum => {
  if (region === 'CN') {
    return LanguageEnum.zhCN
  }
  if (region === 'HK' || region === 'TW' || region === 'MO') {
    return LanguageEnum.zhCN
  }
  return LanguageEnum.en
}
