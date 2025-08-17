import i18n from '@/plugins/vue/i18n'

/**
 * 获取 JavaScript 数据类型
 * @param data
 * @returns {string} array | string | number | boolean ...
 */
export const getType = (data: string): string => {
  const type = Object.prototype.toString.call(data).split(' ')[1]
  return type.substring(0, type.length - 1).toLowerCase()
}

/**
 * 获取一个永不重复的 UUID
 * @returns uuid {string}
 */
export const getUuid = () => {
  return Number(Math.random().toString().substr(2, 5) + Date.now()).toString(36)
}

/**
 * 日志配置和工具函数
 */
export const logger = {
  // 开发环境下的日志
  dev: (message: string, ...args: any[]) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[DEV] ${message}`, ...args)
    }
  },
  
  // 警告日志
  warn: (message: string, ...args: any[]) => {
    if (process.env.NODE_ENV === 'development') {
      console.warn(`[WARN] ${message}`, ...args)
    }
  },
  
  // 错误日志
  error: (message: string, ...args: any[]) => {
    console.error(`[ERROR] ${message}`, ...args)
  },
  
  // 静默日志（生产环境不输出）
  silent: (message: string, ...args: any[]) => {
    // 生产环境下不输出任何日志
  }
}

/**
 * 现代复制文本到系统剪贴板（推荐使用）
 * @param txt 要复制的文本
 * @param callback 复制成功后的回调
 */
export const copyTextModern = async (txt: string, callback?: () => void): Promise<boolean> => {
  // 检查是否支持 Clipboard API
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(txt)
      callback?.()
      return true
    } catch (error) {
      console.warn('Clipboard API failed:', error)
      return false
    }
  }
  
  // 如果不支持 Clipboard API，使用 fallback 方法
  return copyTextFallback(txt, callback)
}

/**
 * 复制文本的 fallback 方法
 * @param txt 要复制的文本
 * @param callback 复制成功后的回调
 */
const copyTextFallback = (txt: string, callback?: () => void): boolean => {
  try {
    // 创建一个临时的 textarea 元素
    const textarea = document.createElement('textarea')
    textarea.value = txt
    textarea.setAttribute('readonly', '')
    textarea.style.position = 'absolute'
    textarea.style.left = '-9999px'
    textarea.style.top = '-9999px'
    textarea.style.opacity = '0'
    textarea.style.pointerEvents = 'none'
    textarea.style.zIndex = '-1000'
    
    document.body.appendChild(textarea)
    
    // 使用现代的选择 API
    const selection = window.getSelection()
    if (selection) {
      selection.removeAllRanges()
      const range = document.createRange()
      range.selectNodeContents(textarea)
      selection.addRange(range)
    }
    
    // 尝试使用现代的方法
    try {
      const successful = document.queryCommandSupported('copy')
      if (successful) {
        const result = document.execCommand('copy')
        if (result) {
          document.body.removeChild(textarea)
          callback?.()
          return true
        }
      }
    } catch (e) {
      // 忽略 execCommand 错误，使用静默日志
      logger.silent('execCommand copy failed:', e)
    }
    
    // 清理
    document.body.removeChild(textarea)
    return false
  } catch (error) {
    logger.warn('Fallback copy method failed:', error)
    return false
  }
}

/**
 * 复制文本到系统剪贴板（向后兼容）
 * @param txt 要复制的文本
 * @param callback 复制成功后的回调
 * @deprecated 建议使用 copyTextModern 函数
 */
export const copyText = async (txt: string, callback?: () => void): Promise<boolean> => {
  return copyTextModern(txt, callback)
}

/**
 * 根据 object 每个 key 上值的数据类型，赋对应的初始值
 * @param object
 */
export const cleanObject = (object: any) => {
  // eslint-disable-next-line guard-for-in,no-restricted-syntax
  for (const key in object) {
    // eslint-disable-next-line default-case
    switch (getType(object[key])) {
      case 'object':
        cleanObject(object[key])
        break

      case 'string':
        object[key] = ''
        break

      case 'array':
        object[key] = []
        break

      case 'number':
        object[key] = 0
        break

      case 'boolean':
        object[key] = false
        break
    }
  }
}

/**
 * 将 obj2 对象的值深度赋值给 obj1 对象
 * @param obj1{Object}
 * @param obj2{Object}
 */
export const deepAssignObject = (obj1: object, obj2: object) => {
  // eslint-disable-next-line no-restricted-syntax
  for (const key in obj2) {
    // @ts-ignore
    if (getType(obj2[key]) !== 'object') {
      // @ts-ignore
      obj1[key] = obj2[key]
    } else {
      if (!Object.hasOwn(obj1, key)) {
        // @ts-ignore
        obj1[key] = {}
      }
      // @ts-ignore
      deepAssignObject(obj1[key], obj2[key])
    }
  }
}

/**
 * 格式化时间日期
 * @param fmt 格式
 * @param timestamp 时间戳
 */
export const formatDatetime = (
  fmt: string = 'yyyy-MM-dd hh:mm:ss',
  timestamp: number = Date.now()
) => {
  function padLeftZero(str: string) {
    return `00${str}`.substr(str.length)
  }
  const date = new Date(timestamp)

  if (/(y+)/.test(fmt)) {
    fmt = fmt.replace(RegExp.$1, `${date.getFullYear()}`.substr(4 - RegExp.$1.length))
  }

  const obj = {
    'M+': date.getMonth() + 1,
    'd+': date.getDate(),
    'h+': date.getHours(),
    'm+': date.getMinutes(),
    's+': date.getSeconds()
  }

  // eslint-disable-next-line no-restricted-syntax
  for (const key in obj) {
    if (new RegExp(`(${key})`).test(fmt)) {
      // @ts-ignore
      const str = `${obj[key]}`
      fmt = fmt.replace(RegExp.$1, RegExp.$1.length === 1 ? str : padLeftZero(str))
    }
  }
  return fmt
}

/**
 * 节流函数
 * @param func
 * @param wait
 */
// eslint-disable-next-line no-unused-vars
export const throttle = <T extends (...args: any[]) => void>(func: T, wait: number = 500): T => {
  let timer: ReturnType<typeof setTimeout> | undefined
  let lastArgs: any[]

  function throttled(...args: any[]) {
    lastArgs = args

    if (!timer) {
      timer = setTimeout(() => {
        func(...lastArgs)
        timer = undefined
      }, wait)
    }
  }

  return throttled as unknown as T
}

/**
 * 设置 Window 标题
 * @param title
 */
export const setWindowTitle = (title: string) => {
  if (title) {
    ;(<any>window).document.title = `${i18n.global.t(title)} | Extious Image Hosting`
  }
}

/**
 * 深度判断两个对象是否相等
 * @param obj1 对象 1
 * @param obj2 对象 2
 * @return {boolean} true | false
 */
export const deepObjectEqual = (obj1: object, obj2: object): boolean => {
  // 多维对象转换为一维对象
  function flattenObject(obj: object) {
    const result = {}

    // eslint-disable-next-line no-restricted-syntax
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'object' && value !== null) {
        // 递归处理嵌套对象
        const nested = flattenObject(value)

        // 使用 Object.entries() 处理嵌套对象的键
        // eslint-disable-next-line no-restricted-syntax
        for (const [nestedKey, nestedValue] of Object.entries(nested)) {
          // @ts-ignore
          result[`${key}.${nestedKey}`] = nestedValue
        }
      } else {
        // @ts-ignore
        result[key] = value
      }
    }

    return result
  }

  return (
    Object.entries(flattenObject(obj1)).toString() ===
    Object.entries(flattenObject(obj2)).toString()
  )
}
