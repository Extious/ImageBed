import { store } from '@/stores'
import { getFileSuffix, isImage, createManagementImageObject, getUuid } from '@/utils'
import request from '@/utils/request'
import { UserConfigInfoModel } from '@/common/model'

/**
 * 获取指定路径 Path 下的目录列表
 * @param userConfigInfo
 * @param path 路径
 */
export const getDirInfoList = (userConfigInfo: UserConfigInfoModel, path: string = '') => {
  const { owner, selectedRepo: repo, selectedBranch: ref } = userConfigInfo
  // eslint-disable-next-line no-async-promise-executor
  return new Promise(async (resolve) => {
    const tmpList = await request({
      url: `/repos/${owner}/${repo}/contents/${path}`,
      method: 'GET',
      params: {
        ref
      }
    })

    if (tmpList && tmpList.length) {
      resolve(
        tmpList
          .filter((v: any) => v.type === 'dir' && !(v.name || '').startsWith('.'))
          .map((x: any) => ({
            value: x.name,
            label: x.name
          }))
      )
    } else {
      resolve(null)
    }
  })
}

/**
 * 获取指定路径 Path 下的目录和图片
 * @param userConfigInfo
 * @param path
 */
export const getRepoPathContent = (userConfigInfo: UserConfigInfoModel, path: string = '') => {
  const { owner, selectedRepo: repo, selectedBranch: ref } = userConfigInfo

  // eslint-disable-next-line no-async-promise-executor
  return new Promise(async (resolve) => {
    const res = await request({
      url: `/repos/${owner}/${repo}/contents/${path}`,
      method: 'GET',
      params: {
        // 防止缓存：加时间戳与缓存禁用指示
        t: Date.now(),
        ref
      }
    })

    if (Array.isArray(res)) {
      // 先清空当前目录，避免重复累计
      await store.dispatch('DIR_IMAGE_LIST_INIT_DIR', path || '/')

      if (res.length) {
      res
        .filter((v: any) => v.type === 'dir' && !(v.name || '').startsWith('.'))
        .forEach((x: any) => store.dispatch('DIR_IMAGE_LIST_ADD_DIR', x.path))

      setTimeout(() => {
        res
          .filter((v: any) => v.type === 'file' && isImage(getFileSuffix(v.name)))
          .forEach((x: any) => {
            store.dispatch('DIR_IMAGE_LIST_ADD_IMAGE', createManagementImageObject(x, path))
          })
      }, 120)
      }
      resolve(true)
    } else {
      // 目录不存在或为空
      await store.dispatch('DIR_IMAGE_LIST_INIT_DIR', path || '/')
      resolve(false)
    }
  })
}
