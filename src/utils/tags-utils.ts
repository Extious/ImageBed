import { TagsDataModel, UserConfigInfoModel } from '@/common/model'
import { store } from '@/stores'
import { getFileInfo, uploadSingleImage } from '@/common/api'

const TAGS_FILE_PATH = '.tags/tags.json'

// 统一路径格式：去掉开头的 '/'
const normalizePath = (p: string): string => {
  if (!p) return p
  if (p === '/') return '/'
  return p.replace(/^\//, '')
}

// 串行化标签写入，避免并发写入引发 409 冲突
let tagsSaveQueue: Promise<boolean> = Promise.resolve(true)

// 初始化去重与并发控制
let tagsInitPromise: Promise<void> | null = null
let tagsInitialized = false

/**
 * 从 GitHub 获取标签数据
 */
export async function fetchTagsFromGitHub(userConfigInfo: UserConfigInfoModel): Promise<TagsDataModel | null> {
  try {
    // 检查用户配置是否完整
    if (!userConfigInfo.owner || !userConfigInfo.selectedRepo || !userConfigInfo.token) {
      return null
    }

    const fileInfo: any = await getFileInfo(userConfigInfo, TAGS_FILE_PATH)
    if (fileInfo && fileInfo.content) {
      // Decode base64 to UTF-8 safely
      const binaryString = atob(fileInfo.content)
      const utf8Bytes = Uint8Array.from(binaryString, (char) => char.charCodeAt(0))
      const content = new TextDecoder().decode(utf8Bytes)
      return JSON.parse(content) as TagsDataModel
    }
    return null
  } catch (error) {
    console.error('Error fetching tags from GitHub:', error)
    return null
  }
}

/**
 * 保存标签数据到 GitHub
 */
export async function saveTagsToGitHub(
  userConfigInfo: UserConfigInfoModel,
  tagsData: TagsDataModel,
  isUpdate: boolean = false
): Promise<boolean> {
  try {
    // 仅在用户触发的标签变更时才执行写入，初始化等场景直接跳过
    if (!isUpdate) {
      return true
    }
    const { owner, selectedRepo, selectedBranch, token } = userConfigInfo

    if (!owner || !selectedRepo || !token || !selectedBranch) {
      console.error('Missing required user config info:', { owner, selectedRepo, token: !!token, selectedBranch })
      return false
    }

    // 读取远端，拿最新 sha 并做数据合并，避免丢失并发更新（强制防缓存）
    const latestInfo: any = await getFileInfo({ ...userConfigInfo, selectedBranch: `${userConfigInfo.selectedBranch}` }, TAGS_FILE_PATH)
    let sha: string | undefined = latestInfo?.sha
    let mergedData: TagsDataModel = tagsData

    if (latestInfo && latestInfo.content) {
      try {
        const binaryString = atob(latestInfo.content)
        const utf8Bytes = Uint8Array.from(binaryString, (char) => char.charCodeAt(0))
        const latestStr = new TextDecoder().decode(utf8Bytes)
        const latestData = JSON.parse(latestStr) as TagsDataModel
        // 合并策略调整：以本地数据为唯一真源，确保删除本地不存在的键
        const images: Record<string, string[]> = { ...(tagsData.images || {}) }
        mergedData = {
          version: latestData.version || '1.0.0',
          lastUpdated: new Date().toISOString(),
          images
        }
      } catch (_) {
        // 解析失败时回退为本地数据
        mergedData = tagsData
      }
    } else {
      // 不存在文件则创建
      mergedData = {
        version: '1.0.0',
        lastUpdated: new Date().toISOString(),
        images: tagsData.images || {}
      }
      sha = undefined
    }

    // 如果数据没有实质变化，则跳过写入，避免无意义 PUT
    try {
      if (latestInfo && latestInfo.content) {
        const latestBinary = atob(latestInfo.content)
        const latestBytes = Uint8Array.from(latestBinary, (c) => c.charCodeAt(0))
        const latestText = new TextDecoder().decode(latestBytes)
        const latestJson = JSON.parse(latestText) as TagsDataModel
        const normalize = (d: TagsDataModel) => ({
          version: d.version || '1.0.0',
          images: d.images || {}
        })
        const a = JSON.stringify(normalize(latestJson))
        const b = JSON.stringify(normalize(mergedData))
        if (a === b) {
          return true
        }
      }
    } catch (_) {
      // 忽略比较失败，继续走写入逻辑
    }

    const jsonString = JSON.stringify(mergedData, null, 2)
    const utf8Bytes = new TextEncoder().encode(jsonString)
    const binaryString = Array.from(utf8Bytes, (byte) => String.fromCharCode(byte)).join('')
    const content = btoa(binaryString)

    const url = `/repos/${owner}/${selectedRepo}/contents/${TAGS_FILE_PATH}`

    const buildBody = (shaValue?: string) => {
    const base: any = {
      message: `Update Extious tags data - ${new Date().toISOString()}`,
        content,
        branch: selectedBranch
      }
      if (shaValue) base.sha = shaValue
      return base
    }

    const tryUpload = async (payload: any): Promise<any> => {
      try {
        return await uploadSingleImage(url, payload, { noShowErrorMsg: true })
      } catch (error: any) {
        const status = error?.status
        const msg: string = error?.data?.message || ''
        // 409 或 422 基本都可视为需要用最新 sha 重试
        if (status === 409 || status === 422 || /sha|conflict|head/i.test(msg)) {
          return null
        }
        throw error
      }
    }

    // 最多重试五次：每次失败后都拉取最新 sha 并指数退避
    const maxAttempts = 5
    let attempt = 0
    let currentSha = sha
    let result: any = null
    while (attempt < maxAttempts) {
      const payload = buildBody(currentSha)
      result = await tryUpload(payload)
      if (result) break
      const latest: any = await getFileInfo(userConfigInfo, TAGS_FILE_PATH)
      currentSha = latest?.sha
      const backoff = 200 * Math.pow(2, attempt)
      await new Promise((r) => setTimeout(r, backoff))
      attempt += 1
    }

    return !!result
  } catch (error) {
    console.error('Error saving tags to GitHub:', error)
    return false
  }
}

/**
 * 初始化标签数据
 */
export async function initializeTagsData(userConfigInfo: UserConfigInfoModel): Promise<void> {
  try {
    if (tagsInitialized) return
    if (tagsInitPromise) {
      await tagsInitPromise
      return
    }
    // 检查用户配置是否完整
    if (!userConfigInfo.owner || !userConfigInfo.selectedRepo || !userConfigInfo.token) {
      console.log('User config incomplete, skipping tags initialization')
      return
    }
    tagsInitPromise = (async () => {
      // 先尝试从 GitHub 获取现有的标签数据
      const existingData = await fetchTagsFromGitHub(userConfigInfo)
      if (existingData) {
        store.commit('SET_TAGS_DATA', existingData)
      } else {
        const initialData: TagsDataModel = {
          version: '1.0.0',
          lastUpdated: new Date().toISOString(),
          images: {}
        }
        // 不在初始化阶段创建远端文件，避免打开页面即触发写入导致 409
        // 仅在用户实际修改标签时再创建/更新远端数据
        store.commit('SET_TAGS_DATA', initialData)
      }
      tagsInitialized = true
    })()
    await tagsInitPromise
    tagsInitPromise = null
  } catch (error) {
    console.error('Error initializing tags data:', error)
  }
}

/**
 * 更新图片标签
 */
export async function updateImageTags(
  userConfigInfo: UserConfigInfoModel,
  imagePath: string,
  tags: string[]
): Promise<boolean> {
  try {
    const path = normalizePath(imagePath)
    let tagsData = store.getters.getTagsData

    if (!tagsData) {
      // 确保初始化后再进行更新，避免路由切换或首轮调用的竞态问题
      await initializeTagsData(userConfigInfo)
      tagsData = store.getters.getTagsData
      if (!tagsData) {
        const initialData: TagsDataModel = {
          version: '1.0.0',
          lastUpdated: new Date().toISOString(),
          images: {}
        }
        store.commit('SET_TAGS_DATA', initialData)
      }
    }

    // 更新本地数据
    await store.dispatch('updateImageTags', { path, tags })

    // 获取更新后的数据
    const updatedData = store.getters.getTagsData

    // 串行入队保存，避免并发 409
    tagsSaveQueue = tagsSaveQueue.then(() => saveTagsToGitHub(userConfigInfo, updatedData, true))
    return await tagsSaveQueue
  } catch (error) {
    console.error('Error updating image tags:', error)
    return false
  }
}

/**
 * 删除图片标签
 */
export async function removeImageTags(
  userConfigInfo: UserConfigInfoModel,
  imagePath: string
): Promise<boolean> {
  try {
    const path = normalizePath(imagePath)
    let tagsData = store.getters.getTagsData

    if (!tagsData) {
      await initializeTagsData(userConfigInfo)
      tagsData = store.getters.getTagsData
      if (!tagsData) {
        const initialData: TagsDataModel = {
          version: '1.0.0',
          lastUpdated: new Date().toISOString(),
          images: {}
        }
        store.commit('SET_TAGS_DATA', initialData)
      }
    }

    // 更新本地数据
    await store.dispatch('removeImageTags', path)

    // 获取更新后的数据
    const updatedData = store.getters.getTagsData

    // 串行入队保存，避免并发 409
    tagsSaveQueue = tagsSaveQueue.then(() => saveTagsToGitHub(userConfigInfo, updatedData, true))
    return await tagsSaveQueue
  } catch (error) {
    console.error('Error removing image tags:', error)
    return false
  }
}

/**
 * 强制从 GitHub 重新拉取最新标签数据并更新本地 store
 */
export async function refreshTagsFromGitHub(userConfigInfo: UserConfigInfoModel): Promise<void> {
  try {
    // 强一致：先基于最新 HEAD 读取 contents（getFileInfo 已有时间戳防缓存）
    const latest = await fetchTagsFromGitHub({ ...userConfigInfo })
    const local = store.getters.getTagsData as TagsDataModel | null
    // 若远端不存在，则自动创建（用本地数据或最小初始数据）
    if (!latest) {
      const dataToCreate: TagsDataModel =
        local || { version: '1.0.0', lastUpdated: new Date().toISOString(), images: {} }
      await saveTagsToGitHub(userConfigInfo, dataToCreate, true)
      const created = await fetchTagsFromGitHub(userConfigInfo)
      if (created) {
        store.commit('SET_TAGS_DATA', created)
      } else {
        store.commit('SET_TAGS_DATA', dataToCreate)
      }
      return
    }
    if (!local) {
      store.commit('SET_TAGS_DATA', latest)
      return
    }
    // 合并：以本地为准覆盖远端对应键，其他保留
    const mergedImages: Record<string, string[]> = { ...(latest.images || {}) }
    Object.keys(local.images || {}).forEach((k) => {
      mergedImages[k] = local.images[k]
    })
    const merged: TagsDataModel = {
      version: latest.version || local.version || '1.0.0',
      lastUpdated: new Date().toISOString(),
      images: mergedImages
    }
    store.commit('SET_TAGS_DATA', merged)
  } catch (e) {
    // 静默失败，避免影响主流程
  }
}

/**
 * 对齐指定目录下的标签数据，使其与远端实际图片列表严格一致
 * 仅处理当前目录范围内的标签键，避免误删其他目录的标签
 */
export async function reconcileTagsForDir(
  userConfigInfo: UserConfigInfoModel,
  dirPath: string,
  validImagePaths: string[]
): Promise<boolean> {
  try {
    await initializeTagsData(userConfigInfo)
    const tagsData: TagsDataModel | null = store.getters.getTagsData
    if (!tagsData) {
      return true
    }

    const imagesMap: Record<string, string[]> = { ...(tagsData.images || {}) }
    const validSet = new Set<string>(validImagePaths)

    const normalize = (p: string) => (p === '/' ? '/' : p.replace(/^\//, ''))
    const current = normalize(dirPath)

    // 仅对当前目录“本层级”的图片进行对齐，不影响子目录
    const isInCurrentDirScope = (p: string): boolean => {
      if (current === '/') {
        // 根目录仅包含没有 '/' 的路径
        return !p.includes('/')
      }
      if (!p.startsWith(`${current}/`)) return false
      const rest = p.slice(current.length + 1)
      return !rest.includes('/')
    }

    const pathsToDelete: string[] = []
    Object.keys(imagesMap).forEach((p) => {
      if (isInCurrentDirScope(p) && !validSet.has(p)) {
        pathsToDelete.push(p)
      }
    })

    if (pathsToDelete.length === 0) {
      return true
    }

    pathsToDelete.forEach((p) => delete imagesMap[p])
    const newData: TagsDataModel = {
      version: tagsData.version || '1.0.0',
      lastUpdated: new Date().toISOString(),
      images: imagesMap
    }
    store.commit('SET_TAGS_DATA', newData)
    // 串行保存
    tagsSaveQueue = tagsSaveQueue.then(() => saveTagsToGitHub(userConfigInfo, newData, true))
    // @ts-ignore
    return await tagsSaveQueue
  } catch (error) {
    console.error('Error reconciling tags for dir:', error)
    return false
  }
}
