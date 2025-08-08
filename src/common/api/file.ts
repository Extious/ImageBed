import request from '@/utils/request'
import { UserConfigInfoModel } from '@/common/model'

/**
 * 获取单个文件的信息
 * @param userConfigInfo 用户配置信息
 * @param path 文件路径
 */
export const getFileInfo = (userConfigInfo: UserConfigInfoModel, path: string) => {
  const { owner, selectedRepo: repo, selectedBranch: ref } = userConfigInfo

  return new Promise(async (resolve) => {
    try {
      const res = await request({
        url: `/repos/${owner}/${repo}/contents/${path}`,
        method: 'GET',
        params: {
          ref
        }
      })

      if (res) {
        resolve(res)
      } else {
        resolve(null)
      }
    } catch (error) {
      // 如果文件不存在或请求失败，返回 null
      resolve(null)
    }
  })
}