import { computed } from 'vue'
import request from '@/utils/request'
import { PICX_INIT_DEPLOY_MSG, PICX_UPDATE_DEPLOY_MSG } from '@/common/constant'
import { store } from '@/stores'

const userSettings = computed(() => store.getters.getUserSettings).value
const userConfigInfo = computed(() => store.getters.getUserConfigInfo).value

const filename = '.deploy'

/**
 * 获取云端仓库存储的部署状态信息
 */
export const getCloudDeployInfo = async () => {
  const { owner, selectedRepo: repo, selectedBranch: branch } = userConfigInfo
  const res = await request({
    url: `/repos/${owner}/${repo}/contents/${filename}`,
    method: 'GET',
    noShowErrorMsg: true,
    params: {
      branch,
      timestamp: Date.now()
    }
  })

  return Promise.resolve(res)
}

/**
 * 保存部署状态信息到云端仓库
 */
export const saveCloudDeployInfo = async () => {
  const { owner, selectedRepo: repo, selectedBranch: branch } = userConfigInfo

  const res = await getCloudDeployInfo()

  const data: any = {
    message: res ? PICX_UPDATE_DEPLOY_MSG : PICX_INIT_DEPLOY_MSG,
    content: (() => {
      const json = JSON.stringify(userSettings.deploy)
      const utf8 = new TextEncoder().encode(json)
      const binary = Array.from(utf8, b => String.fromCharCode(b)).join('')
      return btoa(binary)
    })()
  }

  if (res) {
    data.sha = res.sha
  } else {
    data.branch = branch
  }

  const res2 = await request({
    url: `/repos/${owner}/${repo}/contents/${filename}`,
    method: 'PUT',
    data,
    noShowErrorMsg: true
  })

  return Promise.resolve(res2)
}

/**
 * 设置云端仓库的部署状态到本地
 * @param content
 */
export const setCloudDeployInfo = (content: string) => {
  // Decode base64 to UTF-8 JSON safely
  const bin = atob(content)
  const bytes = Uint8Array.from(bin, c => c.charCodeAt(0))
  const text = new TextDecoder().decode(bytes)
  store.dispatch('SET_USER_SETTINGS', {
    deploy: JSON.parse(text)
  })
}
