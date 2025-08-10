import { UploadedImageModel, UserConfigInfoModel, UploadImageModel } from '@/common/model'
import { store } from '@/stores'
import {
  createCommit,
  createRef,
  createTree,
  uploadSingleImage,
  uploadImageBlob,
  getBranchInfo,
  getRepoPathContent,
  getFileInfo
} from '@/common/api'
import { PICX_UPLOAD_IMG_DESC } from '@/common/constant'
import { updateImageTags } from '@/utils/tags-utils'

/**
 * 图片上传成功之后的处理
 * @param res
 * @param img
 * @param userConfigInfo
 */
const uploadedHandle = async (
  res: { name: string; sha: string; path: string; size: number },
  img: UploadImageModel,
  userConfigInfo: UserConfigInfoModel
) => {
  let dir = userConfigInfo.selectedDir

  if (img?.reUploadInfo?.isReUpload) {
    dir = img.reUploadInfo.dir
  }

  // 上传状态处理
  img.uploadStatus.progress = 100
  img.uploadStatus.uploading = false

  const uploadedImg: UploadedImageModel = {
    checked: false,
    type: 'image',
    uuid: img.uuid,
    dir,
    name: res.name,
    sha: res.sha,
    path: res.path,
    deleting: false,
    size: res.size,
    tags: img.tags || [] // 添加标签
  }

  img.uploadedImg = uploadedImg

  // dirImageList 增加目录
  store.dispatch('DIR_IMAGE_LIST_ADD_DIR', dir)

  // 有标签先写标签（更新本地 store），再刷新目录，保证标签可见
  if (uploadedImg.tags && uploadedImg.tags.length > 0) {
    await updateImageTags(userConfigInfo, res.path, uploadedImg.tags)
  }
  // 强一致刷新目录
  await getRepoPathContent(userConfigInfo, dir)

  // 此处逻辑上已在上面处理
}

/**
 * 上传图片的 URL 处理
 * @param config
 * @param imgObj
 */
export const uploadUrlHandle = (config: UserConfigInfoModel, imgObj: UploadImageModel): string => {
  const { owner, selectedRepo: repo, selectedDir: dir } = config
  const filename: string = imgObj.filename.final

  let path = filename

  if (dir !== '/') {
    path = `${dir}/${filename}`
  }

  if (imgObj?.reUploadInfo?.isReUpload) {
    path = imgObj.reUploadInfo.path
  }

  return `/repos/${owner}/${repo}/contents/${path}`
}

/**
 * 上传多张图片到 GitHub
 * @param userConfigInfo
 * @param imgs
 */
export async function uploadImagesToGitHub(
  userConfigInfo: UserConfigInfoModel,
  imgs: UploadImageModel[]
): Promise<boolean> {
  const { selectedBranch: branch, selectedRepo: repo, selectedDir, owner } = userConfigInfo

  const blobs = []
  let anyBlobFailed = false
  // eslint-disable-next-line no-restricted-syntax
  for (const img of imgs) {
    img.uploadStatus.uploading = true
    // 上传图片文件，为仓库创建 blobs
    const blobRes = await uploadImageBlob(img, owner, repo)
    if (blobRes) {
      blobs.push({ img, ...blobRes })
    } else {
      img.uploadStatus.uploading = false
      anyBlobFailed = true
      ElMessage.error(`${img.filename.final} upload failed`)
    }
  }

  // 如果 blobs 全部失败或存在失败，走 Contents API 逐个上传的兜底方案
  if (anyBlobFailed || blobs.length === 0) {
    let allOk = true
    for (const img of imgs) {
      const ok = await uploadImageToGitHub(userConfigInfo, img)
      allOk = allOk && !!ok
    }
    return Promise.resolve(allOk)
  }

  // 获取 head，用于获取当前分支信息（根目录的 tree sha 以及 head commit sha）
  const branchRes: any = await getBranchInfo(owner, repo, branch)
  if (!branchRes) {
    return Promise.resolve(false)
  }

  const finalPath = selectedDir === '/' ? '' : `${selectedDir}/`

  // 创建 tree
  const treeRes = await createTree(
    owner,
    repo,
    blobs.map((x: any) => ({
      sha: x.sha,
      path: `${finalPath}${x.img.filename.final}`
    })),
    branchRes
  )
  if (!treeRes) {
    return Promise.resolve(false)
  }

  // 创建 commit 节点
  const commitRes: any = await createCommit(owner, repo, treeRes, branchRes)
  if (!commitRes) {
    return Promise.resolve(false)
  }

  // 将当前分支 ref 指向新创建的 commit
  const refRes = await createRef(owner, repo, branch, commitRes.sha)
  if (!refRes) {
    return Promise.resolve(false)
  }

  blobs.forEach(async (blob: any) => {
    const name = blob.img.filename.final
    await uploadedHandle(
      { name, sha: blob.sha, path: `${finalPath}${name}`, size: 0 },
      blob.img,
      userConfigInfo
    )
  })
  return Promise.resolve(true)
}

/**
 * 上传一张图片到 GitHub
 * @param userConfigInfo
 * @param img
 */
export function uploadImageToGitHub(
  userConfigInfo: UserConfigInfoModel,
  img: UploadImageModel
): Promise<Boolean> {
  const { selectedBranch: branch, email, owner, selectedDir } = userConfigInfo

  const data: any = {
    message: PICX_UPLOAD_IMG_DESC,
    branch,
    content: (
      img.base64.compressBase64 ||
      img.base64.watermarkBase64 ||
      img.base64.originalBase64
    ).split(',')[1]
  }

  if (email) {
    data.committer = {
      name: owner,
      email
    }
  }

  img.uploadStatus.uploading = true

  // eslint-disable-next-line no-async-promise-executor
  return new Promise(async (resolve) => {
    // 如果目标路径已存在，需要带上 sha 进行更新，避免 422 fast-forward 错误
    let filePath = img.filename.final
    if (selectedDir !== '/') {
      filePath = `${selectedDir}/${img.filename.final}`
    }
    if (img?.reUploadInfo?.isReUpload && img.reUploadInfo.path) {
      filePath = img.reUploadInfo.path
    }

    // 直接 PUT；增加重试与 422 容忍，并在失败时尝试读取文件信息作为成功信号
    const url = uploadUrlHandle(userConfigInfo, img)
    const maxAttempts = 3
    let attempt = 0
    let successPayload: any = null
    while (attempt < maxAttempts && !successPayload) {
      const res = await uploadSingleImage(url, data, { noShowErrorMsg: true, success422: true })
      console.log('uploadSingleImage >> ', res)
      if (res && (res.content || (res.commit && res.content))) {
        successPayload = res.content || res
        break
      }
      // 如果 PUT 无响应或失败，尝试读取该文件（可能服务端已写入但客户端感知失败）
      const info: any = await getFileInfo(userConfigInfo, filePath)
      if (info && info.sha) {
        successPayload = { name: info.name, sha: info.sha, path: info.path, size: info.size || 0 }
        break
      }
      attempt += 1
      if (attempt < maxAttempts) {
        await new Promise((r) => setTimeout(r, 300 * Math.pow(2, attempt - 1)))
      }
    }
    img.uploadStatus.uploading = false
    if (successPayload) {
      const { name, sha, path, size } = successPayload
      await uploadedHandle({ name, sha, path, size }, img, userConfigInfo)
      resolve(true)
      return
    }
    resolve(false)
  })
}
