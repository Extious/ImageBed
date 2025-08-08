<template>
  <div class="tag-input-container">
    <div class="tag-input-wrapper">
      <el-tag
        v-for="(tag, index) in tags"
        :key="tag"
        :disable-transitions="false"
        closable
        @close="handleClose(index)"
        class="tag-item"
      >
        {{ tag }}
      </el-tag>
      <el-input
        v-if="inputVisible"
        ref="InputRef"
        v-model="inputValue"
        class="tag-input"
        size="small"
        @keyup.enter="handleInputConfirm"
        @blur="handleInputConfirm"
      />
      <el-button
        v-else
        class="button-new-tag"
        size="small"
        @click="showInput"
      >
        + {{ $t('tags.addTag') || '添加标签' }}
      </el-button>
    </div>
    <div class="tag-suggestions" v-if="suggestedTags.length > 0">
      <span class="suggestion-label">{{ $t('tags.suggestions') || '常用标签' }}:</span>
      <el-tag
        v-for="tag in suggestedTags"
        :key="tag"
        @click="addSuggestedTag(tag)"
        class="suggested-tag"
        effect="plain"
      >
        {{ tag }}
      </el-tag>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, computed, nextTick, watch } from 'vue'
import { ElInput } from 'element-plus'
import { useStore } from '@/stores'

const props = defineProps<{
  modelValue: string[]
  maxTags?: number
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string[]]
}>()

const store = useStore()
const InputRef = ref<InstanceType<typeof ElInput>>()

const tags = computed({
  get: () => props.modelValue || [],
  set: (value) => emit('update:modelValue', value)
})

const inputVisible = ref(false)
const inputValue = ref('')

// 获取所有已使用的标签作为建议
const suggestedTags = computed(() => {
  const allTags = store.getters.getAllTags || []
  return allTags
    .filter((tag: string) => !tags.value.includes(tag))
    .slice(0, 10) // 最多显示10个建议
})

const handleClose = (index: number) => {
  const newTags = [...tags.value]
  newTags.splice(index, 1)
  tags.value = newTags
}

const showInput = () => {
  inputVisible.value = true
  nextTick(() => {
    InputRef.value?.focus()
  })
}

const handleInputConfirm = () => {
  if (inputValue.value) {
    const trimmedValue = inputValue.value.trim()
    if (trimmedValue && !tags.value.includes(trimmedValue)) {
      if (!props.maxTags || tags.value.length < props.maxTags) {
        tags.value = [...tags.value, trimmedValue]
      }
    }
  }
  inputVisible.value = false
  inputValue.value = ''
}

const addSuggestedTag = (tag: string) => {
  if (!tags.value.includes(tag)) {
    if (!props.maxTags || tags.value.length < props.maxTags) {
      tags.value = [...tags.value, tag]
    }
  }
}
</script>

<style lang="stylus" scoped>
.tag-input-container
  width: 100%

  .tag-input-wrapper
    display: flex
    flex-wrap: wrap
    gap: 8rem
    align-items: center
    min-height: 32rem
    padding: 4rem
    border: 1px solid var(--el-border-color)
    border-radius: 4rem
    background-color: var(--el-bg-color)

    .tag-item
      height: 24rem

    .tag-input
      width: 90rem
      height: 24rem

    .button-new-tag
      height: 24rem
      line-height: 22rem
      padding: 0 8rem

  .tag-suggestions
    margin-top: 8rem
    display: flex
    align-items: center
    flex-wrap: wrap
    gap: 6rem

    .suggestion-label
      font-size: 12rem
      color: var(--el-text-color-secondary)
      margin-right: 4rem

    .suggested-tag
      cursor: pointer
      height: 22rem
      line-height: 20rem
      font-size: 12rem
      transition: all 0.3s

      &:hover
        color: var(--el-color-primary)
        border-color: var(--el-color-primary)
</style>