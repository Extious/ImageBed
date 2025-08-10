<template>
  <div class="page-container feedback-page-container">
    <el-card class="section">
      <div class="section-title">{{ $t('feedback.section_overview') }}</div>
      <p class="description">{{ $t('feedback.desc') }}</p>
      <p class="bookmark">
        {{ $t('feedback.bookmark') }} {{ $t('shortcut_key') }}: <code>{{ shortcutKey }}</code>
      </p>
    </el-card>

    <el-card class="section">
      <div class="section-title">{{ $t('feedback.section_quickstart') }}</div>
      <ol class="list">
        <li>{{ $t('feedback.quick_1') }}</li>
        <li>{{ $t('feedback.quick_2') }}</li>
        <li>{{ $t('feedback.quick_3') }}</li>
        <li>{{ $t('feedback.quick_4') }}</li>
      </ol>
    </el-card>

    <el-card class="section">
      <div class="section-title">{{ $t('feedback.section_features') }}</div>
      <ul class="list">
        <li>{{ $t('feedback.feature_1') }}</li>
        <li>{{ $t('feedback.feature_2') }}</li>
        <li>{{ $t('feedback.feature_3') }}</li>
        <li>{{ $t('feedback.feature_4') }}</li>
        <li>{{ $t('feedback.feature_5') }}</li>
        <li>{{ $t('feedback.feature_6') }}</li>
      </ul>
    </el-card>

    

    <el-card class="section">
      <div class="section-title">{{ $t('feedback.section_disclaimer') }}</div>
      <div class="red-text"><strong>{{ $t('feedback.disclaimer') }}</strong></div>
    </el-card>
  </div>
  
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { getOSName } from '@/utils'

const shortcutKey = computed(() => (getOSName() === 'win' ? 'Ctrl + D' : 'Command + D'))
</script>

<style scoped lang="stylus">
@import "./feedback-info.styl"
</style>
