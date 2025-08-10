import axios from './axios'
import { CustomAxiosRequestConfig } from '@/common/model'

export default function request(config: CustomAxiosRequestConfig): Promise<any> {
  const requestConfig: CustomAxiosRequestConfig = {}

  // @ts-ignore
  config.method = config.method.toUpperCase()

  // eslint-disable-next-line no-restricted-syntax
  for (const configKey in config) {
    if (configKey === 'params') {
      if (config.method === 'GET') {
        requestConfig.params = config.params
      } else {
        requestConfig.data = config.params
      }
    } else {
      // @ts-ignore
      requestConfig[configKey] = config[configKey]
    }
  }

  return new Promise((resolve) => {
    axios
      .request(requestConfig)
      .then((res) => {
        const { status, data } = res
        if (res && (status === 200 || status === 201 || status === 204)) {
          resolve(data || 'SUCCESS')
        } else {
          resolve(null)
        }
      })
      .catch((err) => {
        // AxiosError 结构兼容：优先从 response 中取状态与数据
        const response = err?.response
        const code = response?.status
        const data = response?.data
        const msg = data?.message
        const url = requestConfig?.url || ''

        // 允许 422 走成功分支（GitHub Contents 乐观并发或重复 PUT）
        if (requestConfig?.success422 && code === 422) {
          resolve(data || 'SUCCESS')
          return
        }

        // 对 GitHub Contents 404 静默处理（常用于存在性校验与一致性等待）
        if (code === 404 && /\/repos\/[^/]+\/[^/]+\/contents\//.test(url)) {
          resolve(null)
          return
        }

        if (!requestConfig?.noShowErrorMsg) {
          console.error('Extious Error // ', err)
          if (code !== undefined && msg !== undefined) {
            ElMessage.error({ duration: 6000, message: `Code: ${code}, Message: ${msg}` })
          } else if (!response) {
            // 网络层错误或 CORS 失败（无响应）
            ElMessage.error({ duration: 6000, message: 'Network error, please retry' })
          }
        }
        resolve(null)
      })
  })
}
