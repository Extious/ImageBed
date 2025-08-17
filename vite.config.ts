import { loadEnv } from 'vite'
import type { UserConfig, ConfigEnv } from 'vite'
import * as path from 'path'
import createVitePlugins from './src/plugins/vite'
import wrapperEnv from './src/utils/env'

// https://vitejs.dev/config/
export default ({ command, mode }: ConfigEnv): UserConfig => {
  const root = process.cwd()
  const env = loadEnv(mode, root)
  const isBuild = command === 'build'

  // loadEnv 中返回的是 string 类型的（即使是 boolean），使用 wrapperEnv() 转换正确的类型
  const viteEnv = wrapperEnv(env)

  return {
    plugins: createVitePlugins(viteEnv, isBuild),
    define: {
      'process.env.NODE_ENV': JSON.stringify(mode),
      __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: false,
      __VUE_PROD_DEVTOOLS__: false,
      __VUE_OPTIONS_API__: true,
      __VUE_PROD_TIPS__: false
    },
    resolve: {
      alias: [
        {
          find: '@',
          replacement: '/src'
        },
        {
          // 仅替换裸模块导入，避免对子路径造成影响
          find: /^@yireen\/squoosh-browser$/, 
          replacement: '@yireen/squoosh-browser/dist/client/lazy-app/Compress/index.js'
        },
        {
          find: 'vue-i18n',
          replacement: 'vue-i18n/dist/vue-i18n.cjs.js'
        }
      ]
    },
    css: {
      postcss: {
        plugins: [
          {
            postcssPlugin: 'remove-charset',
            AtRule: {
              charset: (atRule: any) => {
                atRule.remove()
              }
            }
          }
        ]
      },
      preprocessorOptions: {
        stylus: {
          // 引入 variables.styl 文件
          imports: [path.resolve(__dirname, 'src/styles/variables.styl')],
          // 定义全局变量
          additionalData: `
            $picx-primary-color = #4975c6
          `
        }
      }
    },
    base: './', // 设置打包路径
    optimizeDeps: {
      exclude: [
        '@yireen/squoosh-browser',
        '@yireen/squoosh-browser/dist/client/lazy-app/Compress/index.js',
        '@yireen/squoosh-browser/dist/client/lazy-app/feature-meta'
      ],
      esbuildOptions: {
        sourcemap: false,
        format: 'esm',
        target: 'es2020'
      },
      include: []
    },
    server: {
      port: 4000,
      open: true,
      cors: true
    },
    build: {
      chunkSizeWarningLimit: 2000,
      minify: 'terser', // 启用 terser 压缩
      terserOptions: {
        compress: {
          pure_funcs: ['console.log'], // 删除 console.log
          drop_debugger: true // 删除 debugger
        }
      }
    }
  }
}
