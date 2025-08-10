import { createI18n } from 'vue-i18n'
import zhCN from '@/locales/zh-CN.json'
import en from '@/locales/en.json'

const i18n = createI18n({
  locale: 'zh-CN',
  messages: {
    'zh-CN': zhCN,
    en
  }
})

export default i18n
