import { TagsDataModel, UserConfigInfoModel } from '@/common/model'
import { store } from '@/stores'
import { getFileInfo, uploadSingleImage } from '@/common/api'

const TAGS_FILE_PATH = '.picx/tags.json'

/**
 * 从 GitHub 获取标签数据
 */
export async function fetchTagsFromGitHub(userConfigInfo: UserConfigInfoModel): Promise<TagsDataModel | null> {
  try {
    const { owner, selectedRepo } = userConfigInfo
    const { token } = userConfigInfo

    if (!owner || !selectedRepo || !token) {
      console.error('Missing required user config info')
      return null
    }

    const url = `https://api.github.com/repos/${owner}/${selectedRepo}/contents/${TAGS_FILE_PATH}`
    const headers = {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github.v3+json'
    }

    const response = await fetch(url, { headers })

    if (response.ok) {
      const data = await response.json()
      const content = atob(data.content) // 解码 base64
      return JSON.parse(content) as TagsDataModel
    } else if (response.status === 404) {
      // 文件不存在，返回 null
      return null
    } else {
      throw new Error(`Failed to fetch tags: ${response.statusText}`)
    }
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
    const { owner, selectedRepo, selectedBranch } = userConfigInfo
    const { token } = userConfigInfo

    if (!owner || !selectedRepo || !token) {
      console.error('Missing required user config info')
      return false
    }

    const content = btoa(JSON.stringify(tagsData, null, 2)) // 编码为 base64
    let sha: string | undefined

    // 如果是更新操作，需要获取文件的 SHA
    if (isUpdate) {
      const fileInfo = await getFileInfo(userConfigInfo, TAGS_FILE_PATH)
      if (fileInfo && fileInfo.sha) {
        sha = fileInfo.sha
      }
    }

    const url = `https://api.github.com/repos/${owner}/${selectedRepo}/contents/${TAGS_FILE_PATH}`
    const body: any = {
      message: `Update PicX tags data - ${new Date().toISOString()}`,
      content,
      branch: selectedBranch
    }

    if (sha) {
      body.sha = sha
    }

    const res = await uploadSingleImage(url, body)
    return res && res.status === 201
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
    // 先尝试从 GitHub 获取现有的标签数据
    const existingData = await fetchTagsFromGitHub(userConfigInfo)

    if (existingData) {
      // 如果存在，更新到 store
      store.commit('SET_TAGS_DATA', existingData)
    } else {
      // 如果不存在，创建初始数据
      const initialData: TagsDataModel = {
        version: '1.0.0',
        lastUpdated: new Date().toISOString(),
        images: {}
      }

      // 保存到 GitHub
      const saved = await saveTagsToGitHub(userConfigInfo, initialData, false)
      if (saved) {
        store.commit('SET_TAGS_DATA', initialData)
      }
    }
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
    const tagsData = store.getters.getTagsData

    if (!tagsData) {
      console.error('Tags data not initialized')
      return false
    }

    // 更新本地数据
    await store.dispatch('updateImageTags', { path: imagePath, tags })

    // 获取更新后的数据
    const updatedData = store.getters.getTagsData

    // 保存到 GitHub
    return await saveTagsToGitHub(userConfigInfo, updatedData, true)
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
    const tagsData = store.getters.getTagsData

    if (!tagsData) {
      console.error('Tags data not initialized')
      return false
    }

    // 更新本地数据
    await store.dispatch('removeImageTags', imagePath)

    // 获取更新后的数据
    const updatedData = store.getters.getTagsData

    // 保存到 GitHub
    return await saveTagsToGitHub(userConfigInfo, updatedData, true)
  } catch (error) {
    console.error('Error removing image tags:', error)
    return false
  }
}