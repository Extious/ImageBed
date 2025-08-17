import { Recordable, ViteEnv } from '@/common/model'

/**
 * 环境配置工具
 */
export const isDevelopment = process.env.NODE_ENV === 'development'
export const isProduction = process.env.NODE_ENV === 'production'
export const isTest = process.env.NODE_ENV === 'test'

/**
 * 环境配置
 */
export const env = {
  isDev: isDevelopment,
  isProd: isProduction,
  isTest,
  // 是否启用调试模式
  debug: isDevelopment,
  // 是否启用详细日志
  verbose: isDevelopment,
  // 是否启用性能监控
  performance: isDevelopment
}

/**
 * 日志配置
 */
export const logConfig = {
  // 开发环境显示所有日志
  level: isDevelopment ? 'debug' : 'error',
  // 是否显示警告
  showWarnings: isDevelopment,
  // 是否显示调试信息
  showDebug: isDevelopment
}

export default function wrapperEnv(envConf: Recordable): ViteEnv {
  const ret: any = {}

  // eslint-disable-next-line no-restricted-syntax
  for (const envName of Object.keys(envConf)) {
    let realName = envConf[envName].replace(/\\n/g, '\n')
    if (realName === 'true') {
      realName = true
    } else if (realName === 'false') {
      realName = false
    }
    ret[envName] = realName
    process.env[envName] = realName
  }
  return ret
}
