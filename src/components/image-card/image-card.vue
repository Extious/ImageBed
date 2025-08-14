<template>
  <div
    class="image-card"
    :class="{ checked: imageObj.checked }"
    v-loading="imageObj.deleting"
    :element-loading-text="$t('management.loadingTxt3')"
    @mouseenter="isShowOperateBtn = true"
    @mouseleave="isShowOperateBtn = false"
  >
    <div class="image-box">
      <el-image
        :key="imageObj.path + '-' + (imageObj.sha || '')"
        :src="imgUrl"
        fit="cover"
        :hide-on-click-modal="true"
        :preview-src-list="previewList"
        :preview-teleported="true"
        :z-index="3000"
      />
    </div>

    <div class="info-box">
      <div class="image-info">
        <!-- 重命名操作 -->
        <div class="rename-operate" v-if="isRenameImg">
          <el-input
            size="small"
            class="rename-input"
            v-model="renameInputValue"
            clearable
            ref="renameInputRef"
            :maxlength="RENAME_MAX_LENGTH"
          ></el-input>
          <el-button-group size="small">
            <el-button @click="isRenameImg = false"><IEpClose /></el-button>
            <el-button @click.prevent="updateRename"><IEpCheck /></el-button>
          </el-button-group>
        </div>
        <!-- 文件名 -->
        <div class="filename" v-else>{{ imageObj.name }}</div>
      </div>
      <!-- 标签显示 -->
      <div class="image-tags" v-if="imageTags.length > 0">
        <el-tag
          v-for="tag in imageTags"
          :key="tag"
          size="small"
          class="tag-item"
        >
          {{ tag }}
        </el-tag>
      </div>
    </div>

    <!-- 图片链接操作 -->
    <div class="copy-link-box border-box">
      <copy-image-link :img-obj="imageObj" />
    </div>

    <div class="operation-box" v-show="isShowOperateBtn || dropdownVisible || imageObj.checked">
      <div class="operation-left">
        <div
          v-if="isManagementPage"
          :class="[imageObj.checked ? 'picked-btn' : 'pick-btn', 'operation-btn']"
          @click="togglePick(imageObj)"
        >
          <el-icon v-if="imageObj.checked"><IEpCheck /></el-icon>
        </div>
      </div>
      <div class="operation-right">
        <el-dropdown size="default" trigger="click" @visible-change="visibleChange">
          <div class="operation-btn">
            <el-icon><IEpMoreFilled /></el-icon>
          </div>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item @click="deleteImageTips(imageObj)">
                {{ $t('upload.delete') }}
              </el-dropdown-item>
              <el-dropdown-item @click.self="showRenameInput(imageObj)">
                {{ $t('upload.rename') }}
              </el-dropdown-item>
              <el-dropdown-item @click="editTags(imageObj)">
                {{ $t('tags.editTags') || '编辑标签' }}
              </el-dropdown-item>
              <el-dropdown-item @click="viewImageProperties(imageObj)">
                {{ $t('management.property') }}
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, getCurrentInstance, ref, h } from 'vue'
import type { ElInput } from 'element-plus'
import { useRoute } from 'vue-router'
import { useStore } from '@/stores'
import { UploadedImageModel, UploadImageModel } from '@/common/model'
import {
  getBase64ByImageUrl,
  getFilename,
  getFileSize,
  generateImageLinks,
  getUuid,
  createUploadImageObject,
  getFileSuffix,
  blobToBase64ByImageUrl
} from '@/utils'
import { uploadImageToGitHub } from '@/utils/upload-utils'
import { deleteSingleImage } from '@/common/api'
import { RENAME_MAX_LENGTH } from '@/common/constant'
import { updateImageTags, removeImageTags } from '@/utils/tags-utils'
import TagInput from '@/components/tag-input/tag-input.vue'

const props = defineProps({
  imageObj: {
    type: Object as () => UploadedImageModel,
    default: () => ({})
  },
  isUploaded: {
    type: Boolean,
    default: false
  }
})

const instance = getCurrentInstance()

const store = useStore()
const router = useRoute()
const userConfigInfo = computed(() => store.getters.getUserConfigInfo).value
const userSettings = computed(() => store.getters.getUserSettings).value
const isManagementPage = computed(() => {
  return router.path === '/management'
})

const imgUrl = computed(() => {
  const base = generateImageLinks(props.imageObj, userConfigInfo, userSettings)
  if (!base) return base
  // 在管理页避免追加随机时间戳参数，直接依赖 sha 变更触发的 URL 变化
  return base
})

const previewList = computed(() => [imgUrl.value])

// 获取图片的标签
const imageTags = computed(() => {
  return store.getters.getImageTags(props.imageObj.path) || []
})

const renameInputRef = ref<InstanceType<typeof ElInput>>()
const renameInputValue = ref<string>('')
const isRenameImg = ref<boolean>(false)

const isShowOperateBtn = ref<boolean>(false)
const dropdownVisible = ref<boolean>(false)

const deleteOriginImage = (
  imageObj: UploadedImageModel,
  isRename: boolean = false
): Promise<boolean> => {
  if (!isRename) {
    imageObj.deleting = true
  }
  const { owner, selectedRepo: repo } = userConfigInfo
  const { path, sha } = imageObj

  // eslint-disable-next-line no-async-promise-executor
  return new Promise(async (resolve) => {
    const res = await deleteSingleImage(owner, repo, path, sha)
    if (res) {
      if (isRename) {
        isRenameImg.value = false
        ElMessage.success({ message: instance?.proxy?.$t('management.message4') })
      } else {
        ElMessage.success({ message: instance?.proxy?.$t('management.message5') })
      }
      
      // 删除图片的标签数据
      if (!isRename) {
        await removeImageTags(userConfigInfo, imageObj.path)
      }
      
      await store.dispatch('DIR_IMAGE_LIST_REMOVE', imageObj)
      await store.dispatch('UPLOAD_IMG_LIST_REMOVE', imageObj.uuid)
      resolve(true)
    } else {
      resolve(false)
    }
  })
}

const deleteImageTips = (imageObj: UploadedImageModel) => {
  ElMessageBox.confirm(
    `
    <div>${instance?.proxy?.$t('management.delTips')}：</div>
    <strong>${imageObj.name}</strong>
    `,
    instance?.proxy?.$t('tips'),
    {
      dangerouslyUseHTMLString: true,
      type: 'warning'
    }
  )
    .then(() => {
      deleteOriginImage(imageObj)
    })
    .catch(() => {
      console.log('Cancel')
    })
}

const togglePick = (imageObj: UploadedImageModel) => {
  imageObj.checked = !imageObj.checked
  store.commit('IMAGE_CARD', { imageObj })
}

/**
 * 显示重命名输入框和确定按钮
 * @param imgObj
 */
const showRenameInput = async (imgObj: UploadedImageModel) => {
  isRenameImg.value = true
  renameInputValue.value = getFilename(imgObj.name)
  setTimeout(() => {
    renameInputRef.value?.focus()
  }, 100)
}

const updateRename = async () => {
  const { imageObj } = props

  if (!renameInputValue.value) {
    ElMessage.error({ message: instance?.proxy?.$t('management.message1') })
    renameInputRef.value?.focus()
    return
  }

  if (renameInputValue.value === getFilename(imageObj.name)) {
    ElMessage.error({ message: instance?.proxy?.$t('management.message2') })
    isRenameImg.value = false
    return
  }

  const renameImg = async () => {
    const loading = ElLoading.service({
      lock: true,
      text: instance?.proxy?.$t('management.loadingTxt2')
    })

    // 重命名的逻辑是先上传一张新名称的图片，再删除旧图片

    const suffix = getFileSuffix(imageObj.name)
    const newUuid = getUuid()
    const newFilename = `${renameInputValue.value}${
      userSettings.imageName.autoAddHash ? `.${newUuid}` : ''
    }.${suffix}`

    let base64

    if (!suffix.includes('svg')) {
      base64 = await getBase64ByImageUrl(imgUrl.value || '', suffix)
    } else {
      base64 = await blobToBase64ByImageUrl(imgUrl.value || '')
    }

    if (base64) {
      const tmpImgObj: UploadImageModel = createUploadImageObject()
      // 重命名重传：如果原图无标签，使用用户设置的默认标签
      const defaults = (userSettings.defaultTags && userSettings.defaultTags.length > 0)
        ? [...userSettings.defaultTags]
        : ['壁纸']
      tmpImgObj.tags = defaults
      tmpImgObj.uuid = newUuid
      tmpImgObj.base64.originalBase64 = base64
      tmpImgObj.filename.final = newFilename
      tmpImgObj.reUploadInfo!.isReUpload = true
      tmpImgObj.reUploadInfo!.dir = imageObj.dir
      let path = newFilename
      if (imageObj.dir !== '/') {
        path = `${imageObj.dir}/${newFilename}`
      }
      tmpImgObj.reUploadInfo!.path = path

      // 重新上传重命名后的图片
      const isUploadSuccess = await uploadImageToGitHub(userConfigInfo, tmpImgObj)

      if (isUploadSuccess) {
        // 如果原图片有标签，转移到新图片
        const oldTags = imageTags.value
        if (oldTags.length > 0) {
          await updateImageTags(userConfigInfo, tmpImgObj.reUploadInfo!.path, oldTags)
        }
        
        renameInputValue.value = ''
        await deleteOriginImage(imageObj, true)
        await store.dispatch('UPLOAD_IMG_LIST_REMOVE', imageObj.uuid)
      } else {
        ElMessage.error({ message: instance?.proxy?.$t('management.message3') })
      }
    } else {
      ElMessage.error({ message: instance?.proxy?.$t('management.message3') })
    }
    loading.close()
    isRenameImg.value = false
  }

  ElMessageBox.confirm(
    instance?.proxy?.$t('management.renameTips', { name: renameInputValue.value }),
    instance?.proxy?.$t('tips'),
    {
      type: 'info'
    }
  )
    .then(() => {
      renameImg()
    })
    .catch(() => {
      console.log('Cancel')
      isRenameImg.value = false
    })
}

const visibleChange = (e: boolean) => {
  dropdownVisible.value = e
}

/**
 * 查看图片属性
 * @param imgObj
 */
const viewImageProperties = (imgObj: UploadedImageModel) => {
  ElMessageBox.confirm(
    `
    <div>${instance?.proxy?.$t('management.imageName')}：<strong>${imgObj.name}</strong></div>
    <div>${instance?.proxy?.$t('management.imageSize')}：<strong>${getFileSize(
      imgObj.size
    )} KB</strong></div>
    `,
    instance?.proxy?.$t('management.property'),
    {
      showCancelButton: false,
      showConfirmButton: false,
      dangerouslyUseHTMLString: true,
      type: 'info'
    }
  )
}

/**
 * 编辑图片标签
 * @param imgObj
 */
const editTags = (imgObj: UploadedImageModel) => {
  const currentTags = ref<string[]>([...imageTags.value])

  const renderContent = () => {
    const vnode = h(TagInput, {
      modelValue: currentTags.value,
      'onUpdate:modelValue': (val: string[]) => {
        currentTags.value = [...val]
      }
    })
    if (instance?.appContext) {
      ;(vnode as any).appContext = instance.appContext
    }
    return vnode
  }

  ElMessageBox({
    title: 'Edit tags',
    message: renderContent,
    showCancelButton: true,
    confirmButtonText: 'Confirm',
    cancelButtonText: 'Cancel',
    distinguishCancelAndClose: true,
    closeOnClickModal: false,
    closeOnPressEscape: false,
    beforeClose: async (action, _instance, done) => {
      if (action === 'confirm') {
        const loading = ElLoading.service({
          lock: true,
          text: 'Saving'
        })
        const success = await updateImageTags(userConfigInfo, imgObj.path, currentTags.value)
        loading.close()
        if (success) {
          ElMessage.success({ message: 'Tags updated' })
          done()
        } else {
          ElMessage.error({ message: 'Update failed' })
        }
      } else {
        done()
      }
    }
  }).catch(() => {})
}
</script>

<style scoped lang="stylus">
@import 'image-card.styl'
</style>
