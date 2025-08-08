<template>
  <div class="page-container management-page-container">
    <div class="content-container">
      <div class="top">
        <div class="left">
          <selected-info-bar bar-type="management" />
        </div>
        <div class="right flex-start">
          <el-tooltip
            placement="top"
            :content="$t('management.reload', { dir: userConfigInfo.viewDir })"
          >
            <el-icon class="btn-icon" @click.stop="reloadCurrentDirContent">
              <IEpRefresh />
            </el-icon>
          </el-tooltip>
        </div>
      </div>

      <!-- 标签筛选区域 -->
      <div class="tag-filter-wrapper">
        <tag-filter v-model="selectedTags" :visiblePaths="currentPathImageList.map((x:any)=>x.path)" />
      </div>

      <div
        class="bottom"
        v-loading="loadingImageList"
        :element-loading-text="$t('management.loadingTxt1')"
      >
        <template v-if="loadError">
          <el-result icon="warning" :title="$t('error') || 'Error'" :sub-title="loadError">
            <template #extra>
              <el-button type="primary" @click="reloadCurrentDirContent">{{ $t('reload') || 'Reload' }}</el-button>
            </template>
          </el-result>
        </template>
        <image-selector
          v-if="!loadError && filteredImageList.length"
          :currentDirImageList="filteredImageList"
          @update:initImageList="filteredImageList"
          :key="renderKey"
        ></image-selector>
        <el-empty v-if="!loadError && !filteredImageList.length && !currentPathDirList.length && !loadingImageList" :description="$t('management.noData') || 'No data'" />
        <ul
          class="image-management-list"
          :style="{
            height: isShowBatchTools ? 'calc(100% - 50rem)' : '100%'
          }"
          v-contextmenu="{ type: ContextmenuEnum.parentDir }"
        >
          <li class="image-management-item" v-if="userConfigInfo.viewDir !== '/'">
            <folder-card mode="back" />
          </li>
          <li
            class="image-management-item"
            v-for="(dir, index) in currentPathDirList"
            :key="'folder-card-' + dir.dir + '-' + index"
            v-contextmenu="{ type: ContextmenuEnum.childDir, dir: dir.dir }"
          >
            <folder-card :folder-obj="dir" />
          </li>
          <div style="width: 100%" />
          <li
            class="image-management-item image"
            v-for="(image, index) in filteredImageList"
            :key="'image-card-' + index"
            v-contextmenu="{ type: ContextmenuEnum.img, img: image }"
          >
            <image-card :image-obj="image" />
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed, onMounted, watch, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useStore } from '@/stores'
import { getRepoPathContent } from '@/common/api'
import { filterDirContent, getDirContent } from '@/views/imgs-management/imgs-management.util'

import ImageCard from '@/components/image-card/image-card.vue'
import SelectedInfoBar from '@/components/selected-info-bar/selected-info-bar.vue'
import FolderCard from '@/components/folder-card/folder-card.vue'
import ImageSelector from '@/components/image-selector/image-selector.vue'
import TagFilter from '@/components/tag-filter/tag-filter.vue'
import { UploadedImageModel, DirModeEnum, ContextmenuEnum } from '@/common/model'
import { initializeTagsData, reconcileTagsForDir, refreshTagsFromGitHub } from '@/utils/tags-utils'

const store = useStore()
const router = useRouter()

const userConfigInfo = computed(() => store.getters.getUserConfigInfo).value
const loginStatus = computed(() => store.getters.getUserLoginStatus).value
const dirObject = computed(() => store.getters.getDirObject).value

const renderKey = ref(new Date().getTime()) // key for update image-selector component
const loadingImageList = ref(false)
const loadError = ref<string>('')

const currentPathDirList = ref([])
const currentPathImageList = ref([])
const selectedTags = ref<string[]>([]) // 选中的标签

const isShowBatchTools = ref(false)

// 是否显示标签筛选器
// 始终渲染筛选器，由组件内部处理无数据时的占位
const showTagFilter = computed(() => true)

// 根据标签筛选后的图片列表
const filteredImageList = computed(() => {
  if (selectedTags.value.length === 0) {
    return currentPathImageList.value
  }
  
  return currentPathImageList.value.filter((image: UploadedImageModel) => {
    const imageTags = store.getters.getImageTags(image.path) || []
    // 检查图片是否包含所有选中的标签
    return selectedTags.value.every(tag => imageTags.includes(tag))
  })
})

// 对齐标签的防抖定时器
let reconcileTimer: ReturnType<typeof setTimeout> | null = null

async function dirContentHandle(dir: string) {
  loadingImageList.value = true
  loadError.value = ''
  // 始终清空并重新拉取，避免使用本地缓存导致列表滞后
  try {
    await store.dispatch('DIR_IMAGE_LIST_INIT_DIR', dir)
    const ok = await getRepoPathContent(userConfigInfo, dir)
    if (!ok) {
      loadError.value = 'No content or not deployed'
    }
    // 拉取最新标签，保证新增标签可见
    await refreshTagsFromGitHub(userConfigInfo)
  } catch (e: any) {
    loadError.value = e?.message || 'Load failed'
  }
  loadingImageList.value = false
}

async function initDirImageList() {
  const { selectedDir, viewDir, dirMode } = userConfigInfo

  if (viewDir === '') {
    if (
      (dirMode === DirModeEnum.newDir || dirMode === DirModeEnum.autoDir) &&
      !getDirContent(selectedDir, dirObject)
    ) {
      userConfigInfo.selectedDir = '/'
      userConfigInfo.dirMode = 'rootDir'
    }

    if (userConfigInfo.selectedDir) {
      userConfigInfo.viewDir = userConfigInfo.selectedDir
    } else {
      userConfigInfo.viewDir = '/'
    }
  }

  if (!dirObject.imageList.length && !dirObject.childrenDirs.length) {
    await getRepoPathContent(userConfigInfo, userConfigInfo.viewDir)
    return
  }

  await dirContentHandle(userConfigInfo.viewDir)
}

// 重新加载当前目录内容（网络请求）
async function reloadCurrentDirContent() {
  const { viewDir } = userConfigInfo
  await store.dispatch('DIR_IMAGE_LIST_INIT_DIR', viewDir)
  loadingImageList.value = true
  await getRepoPathContent(userConfigInfo, viewDir)
  loadingImageList.value = false
}

onMounted(async () => {
  await initializeTagsData(userConfigInfo)
  initDirImageList()
})

watch(
  () => loginStatus,
  (nv) => {
    if (nv === false) {
      router.push('/config')
    }
  }
)

watch(
  () => userConfigInfo.viewDir,
  async (nDir) => {
    await dirContentHandle(nDir)
    renderKey.value += 1
  },
  { deep: true }
)

watch(
  () => dirObject,
  (nv: any) => {
    const { viewDir } = userConfigInfo
    const dirContent = getDirContent(viewDir, nv)
    if (dirContent) {
      currentPathDirList.value = filterDirContent(viewDir, dirContent, 'dir')
      currentPathImageList.value = filterDirContent(viewDir, dirContent, 'image')
      store.commit('REPLACE_IMAGE_CARD', { checkedImgArr: currentPathImageList.value })
      // 防抖对齐当前目录标签数据，剔除已删图片的标签
      if (reconcileTimer) clearTimeout(reconcileTimer)
      reconcileTimer = setTimeout(() => {
        const validPaths = currentPathImageList.value.map((img: UploadedImageModel) => img.path)
        reconcileTagsForDir(userConfigInfo, viewDir, validPaths)
      }, 300)
    }
  },
  { deep: true }
)

watch(
  () => currentPathImageList.value,
  (nv: UploadedImageModel[]) => {
    isShowBatchTools.value = filteredImageList.value.filter((x) => x.checked).length > 0
  },
  { deep: true }
)
</script>

<style scoped lang="stylus">
@import './imgs-management.styl'
</style>
