<template>
  <div class="tag-filter-container">
    <div class="filter-header">
      <span class="filter-title">{{ $t('tags.filter') || '标签筛选' }}</span>
      <el-button
        v-if="selectedTags.length > 0"
        link
        type="primary"
        size="small"
        @click="clearFilter"
      >
        {{ $t('tags.clearFilter') || '清除筛选' }}
      </el-button>
    </div>
    <div class="tags-list" v-if="tagStatistics.length > 0">
      <el-tag
        v-for="item in tagStatistics"
        :key="item.tag"
        @click="toggleTag(item.tag)"
        :effect="selectedTags.includes(item.tag) ? 'dark' : 'plain'"
        :type="selectedTags.includes(item.tag) ? 'primary' : 'info'"
        class="tag-item"
      >
        {{ item.tag }}
        <span class="tag-count">({{ item.count }})</span>
      </el-tag>
    </div>
    <el-empty
      v-else
      :description="$t('tags.noTags') || '暂无标签'"
      :image-size="60"
    />
  </div>
</template>

<script lang="ts" setup>
import { ref, computed, watch } from 'vue'
import { useStore } from '@/stores'
import type { TagStatistics } from '@/common/model'

const props = defineProps<{
  modelValue: string[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string[]]
}>()

const store = useStore()

const selectedTags = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const tagStatistics = computed<TagStatistics[]>(() => {
  return store.getters.getTagsStatistics || []
})

const toggleTag = (tag: string) => {
  const newTags = [...selectedTags.value]
  const index = newTags.indexOf(tag)
  
  if (index > -1) {
    newTags.splice(index, 1)
  } else {
    newTags.push(tag)
  }
  
  selectedTags.value = newTags
}

const clearFilter = () => {
  selectedTags.value = []
}
</script>

<style lang="stylus" scoped>
.tag-filter-container
  width: 100%
  padding: 12rem
  background-color: var(--el-bg-color)
  border-radius: 6rem
  border: 1px solid var(--el-border-color)

  .filter-header
    display: flex
    align-items: center
    justify-content: space-between
    margin-bottom: 10rem

    .filter-title
      font-size: 14rem
      font-weight: 500
      color: var(--el-text-color-primary)

  .tags-list
    display: flex
    flex-wrap: wrap
    gap: 8rem

    .tag-item
      cursor: pointer
      transition: all 0.3s

      &:hover
        transform: translateY(-2px)

      .tag-count
        margin-left: 4rem
        font-size: 12rem
        opacity: 0.8
</style>
