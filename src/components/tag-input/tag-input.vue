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
        @keydown.enter.stop.prevent="handleInputConfirm"
        @blur="handleInputConfirm"
      />
      <el-button
        v-else
        class="button-new-tag"
        size="small"
        @click="showInput"
      >
        + 添加标签
      </el-button>
    </div>
    <div class="tag-suggestions" v-if="suggestedTags.length">
      <span class="suggestion-label">Suggestions:</span>
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
import { store } from '@/stores'

const props = defineProps<{
  modelValue: string[]
  maxTags?: number
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string[]]
}>()

const InputRef = ref<InstanceType<typeof ElInput>>()

// 本地可编辑状态，确保在服务式弹窗环境下也能即时更新 UI
const tags = ref<string[]>([...(props.modelValue || [])])
watch(
  () => props.modelValue,
  (val) => {
    tags.value = [...(val || [])]
  },
  { deep: true }
)

const inputVisible = ref(false)
const inputValue = ref('')

// 获取建议标签：优先展示常用标签，其次展示历史已使用标签
const userSettings = computed(() => (store?.getters as any)?.getUserSettings ?? null)
const suggestedTags = computed(() => {
  const allTags: string[] = ((store?.getters as any)?.getAllTags as string[] | undefined) ?? []
  const common: string[] = (userSettings.value?.commonTags as string[] | undefined) ?? []

  // 先放常用标签（排除已选），再补充历史标签（去重且排除已选）
  const priority = common.filter((t) => !tags.value.includes(t))
  const others = allTags.filter(
    (t: string) => !tags.value.includes(t) && !priority.includes(t)
  )

  return [...priority, ...others].slice(0, 20)
})

const handleClose = (index: number) => {
  const newTags = [...tags.value]
  newTags.splice(index, 1)
  tags.value = newTags
  emit('update:modelValue', newTags)
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
        const newTags = [...tags.value, trimmedValue]
        tags.value = newTags
        emit('update:modelValue', newTags)
      }
    }
  }
  nextTick(() => {
    inputVisible.value = false
    inputValue.value = ''
  })
}

const addSuggestedTag = (tag: string) => {
  if (!tags.value.includes(tag)) {
    if (!props.maxTags || tags.value.length < props.maxTags) {
      const newTags = [...tags.value, tag]
      tags.value = newTags
      emit('update:modelValue', newTags)
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
