import { store } from '@/stores'
import { getFileSuffix, isImage, createManagementImageObject, getUuid } from '@/utils'
import request from '@/utils/request'
import { UserConfigInfoModel } from '@/common/model'
import { getBranchInfo } from '@/common/api/branch'

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
    // 优先使用 Git Trees API，强一致地按提交快照列出文件，避免 Contents API 的短暂缓存
    const listByTree = async (): Promise<boolean> => {
      try {
        const branch: any = await getBranchInfo(owner, repo, ref)
        const treeSha = branch?.commit?.commit?.tree?.sha
        if (!treeSha) return false
        const treeRes: any = await request({
          url: `/repos/${owner}/${repo}/git/trees/${treeSha}`,
          method: 'GET',
          params: { recursive: 1, t: Date.now() },
          noShowErrorMsg: true
        })
        if (!treeRes || !Array.isArray(treeRes.tree)) return false

        // 规范化当前目录
        const current = path && path !== '/' ? path.replace(/^\//, '') : ''
        const prefix = current ? `${current}/` : ''

        // 清空并重建
        await store.dispatch('DIR_IMAGE_LIST_INIT_DIR', path || '/')

        // 子目录（当前层级）
        const dirSet = new Set<string>()
        treeRes.tree
          .filter((n: any) => n.type === 'tree' && n.path.startsWith(prefix))
          .forEach((n: any) => {
            const rest = n.path.slice(prefix.length)
            if (!rest || rest.includes('/')) return
            if ((rest || '').startsWith('.')) return
            dirSet.add(n.path)
          })
        dirSet.forEach((d: string) => store.dispatch('DIR_IMAGE_LIST_ADD_DIR', d))

        // 当前层级图片（严格筛选，仅保留一级文件，不含子目录）
        treeRes.tree
          .filter((n: any) => n.type === 'blob' && n.path.startsWith(prefix))
          .forEach((n: any) => {
            const rest = n.path.slice(prefix.length)
            if (!rest || rest.includes('/')) return
            const name = rest
            if (!isImage(getFileSuffix(name))) return
            const item = { type: 'file', name, sha: n.sha, path: n.path, size: n.size || 0 }
            store.dispatch('DIR_IMAGE_LIST_ADD_IMAGE', createManagementImageObject(item, path))
          })
        return true
      } catch (_) {
        return false
      }
    }

    const okByTree = await listByTree()
    if (okByTree) {
      resolve(true)
      return
    }

    // 回退到 Contents API（加时间戳防缓存）
    const res = await request({
      url: `/repos/${owner}/${repo}/contents/${path}`,
      method: 'GET',
      params: {
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

        // 直接写入（仅在 Tree API 异常时才走到这里）
        res
          .filter((v: any) => v.type === 'file' && isImage(getFileSuffix(v.name)))
          .forEach((x: any) => {
            store.dispatch('DIR_IMAGE_LIST_ADD_IMAGE', createManagementImageObject(x, path))
          })
      }
      resolve(true)
    } else {
      // 目录不存在或为空
      await store.dispatch('DIR_IMAGE_LIST_INIT_DIR', path || '/')
      resolve(false)
    }
  })
}
