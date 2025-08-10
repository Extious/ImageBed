## Extious 的图床

一个基于 Vue 3 + Vite 的静态图床前端，集成图片上传、目录管理、标签筛选与常用图片工具。项目在 PicX 的基础上做了定制与优化，适合个人自部署使用。

### 项目结构

```text
ImageBed
├─ index.html
├─ vite.config.ts
├─ package.json
├─ public
│  ├─ favicon.ico
│  ├─ CNAME
│  └─ logo*.png
└─ src
   ├─ main.ts
   ├─ App.vue
   ├─ assets
   ├─ common
   │  ├─ api
   │  ├─ constant
   │  ├─ directive
   │  └─ model
   ├─ components
   ├─ locales
   ├─ plugins
   │  ├─ vite
   │  └─ vue
   ├─ router
   ├─ stores
   ├─ styles
   ├─ utils
   │  └─ request
   └─ views
```

- `index.html`: 应用入口模板与基础 meta。
- `public/`: 静态资源（favicon、logo、CNAME）。
- `src/common/api`: 调用 GitHub API 的请求封装。
- `src/common/constant`: 常量与初始化文案。
- `src/common/directive`: 自定义指令（右键菜单等）。
- `src/common/model`: 业务模型与类型定义。
- `src/components`: 可复用组件。
- `src/locales`: 多语言文案。
- `src/plugins`: 框架与构建插件（`vue/i18n.ts`、`vite/pwa.ts`）。
- `src/router`: 路由与页面标题设置。
- `src/stores`: Vuex 模块化状态。
- `src/styles`: 全局样式与主题变量。
- `src/utils`: 工具函数集合（含 `request/` ）。
- `src/views`: 业务页面集合。

### 开发与构建
要求已安装 Node 与 pnpm（推荐）。

```bash
# 安装依赖
pnpm i

# 本地启动（默认 http://localhost:4000 ）
pnpm dev

# 生产构建（产物在 dist/）
pnpm build

# 本地预览构建结果
pnpm serve
```

### 部署
- 静态托管平台：将 `dist/` 部署到 GitHub Pages、Vercel、Netlify、Cloudflare Pages 或任意静态服务器即可。
- Nginx/静态站点：将 `dist/` 目录作为站点根目录，不需要后端服务。
- PWA 更新：若发布后页面未即时更新，强制刷新或清理站点离线缓存即可。

常见个性化：
- 网页标题与描述：`index.html`、`src/utils/common-utils.ts`（`setWindowTitle`）、`src/plugins/vite/pwa.ts`。
- 站点图标：覆盖 `public/` 下的 `favicon.ico`、`logo@192x192.png`、`logo@512x512.png`。
- 主题与样式：`src/styles/variables.styl`。

### 重要声明
即使不是前端专业人员，也可以借助 AI 完成个性化修改。
- 直接描述你想要的效果（例如“隐藏初始后退卡片”“将站点名改为 Extious 的图床”）。
- 让 AI 定位并编辑对应文件，保存后本地预览或重新构建即可。

### 许可与致谢
- License: AGPL-3.0（见 `LICENSE`）。
- 致谢：本项目基于 PicX 进行二次开发与优化。

## 许可 | License

**[AGPL-3.0](https://github.com/XPoet/picx/blob/master/LICENSE)** 
