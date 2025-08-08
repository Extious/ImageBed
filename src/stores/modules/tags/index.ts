import { Module } from 'vuex'
import { TagsDataModel, ImageTagsMap } from '@/common/model'
import RootStateTypes from '@/stores/types'

export interface TagsModuleState {
  tagsData: TagsDataModel | null
  loading: boolean
  error: string | null
}

const tagsModule: Module<TagsModuleState, RootStateTypes> = {
  state: {
    tagsData: null,
    loading: false,
    error: null
  },

  mutations: {
    SET_TAGS_DATA(state: TagsModuleState, data: TagsDataModel) {
      state.tagsData = data
    },

    UPDATE_IMAGE_TAGS(state: TagsModuleState, { path, tags }: { path: string; tags: string[] }) {
      if (state.tagsData) {
        state.tagsData.images[path] = tags
        state.tagsData.lastUpdated = new Date().toISOString()
      }
    },

    REMOVE_IMAGE_TAGS(state: TagsModuleState, path: string) {
      if (state.tagsData) {
        delete state.tagsData.images[path]
        state.tagsData.lastUpdated = new Date().toISOString()
      }
    },

    SET_LOADING(state: TagsModuleState, loading: boolean) {
      state.loading = loading
    },

    SET_ERROR(state: TagsModuleState, error: string | null) {
      state.error = error
    }
  },

  actions: {
    async initTagsData({ commit }: any) {
      commit('SET_LOADING', true)
      try {
        // 初始化标签数据
        const initialData: TagsDataModel = {
          version: '1.0.0',
          lastUpdated: new Date().toISOString(),
          images: {}
        }
        commit('SET_TAGS_DATA', initialData)
        commit('SET_ERROR', null)
      } catch (error: any) {
        commit('SET_ERROR', error.message)
      } finally {
        commit('SET_LOADING', false)
      }
    },

    async updateImageTags({ commit }: any, { path, tags }: { path: string; tags: string[] }) {
      commit('UPDATE_IMAGE_TAGS', { path, tags })
    },

    async removeImageTags({ commit }: any, path: string) {
      commit('REMOVE_IMAGE_TAGS', path)
    }
  },

  getters: {
    getTagsData: (state: TagsModuleState) => state.tagsData,
    getImageTags: (state: TagsModuleState) => (path: string) => {
      return state.tagsData?.images[path] || []
    },
    getAllTags: (state: TagsModuleState) => {
      if (!state.tagsData) return []
      const tagsSet = new Set<string>()
      Object.values(state.tagsData.images).forEach(tags => {
        tags.forEach(tag => tagsSet.add(tag))
      })
      return Array.from(tagsSet).sort()
    },
    getTagsStatistics: (state: TagsModuleState) => {
      if (!state.tagsData) return []
      const tagCounts = new Map<string, number>()
      Object.values(state.tagsData.images).forEach(tags => {
        tags.forEach(tag => {
          tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1)
        })
      })
      return Array.from(tagCounts.entries())
        .map(([tag, count]) => ({ tag, count }))
        .sort((a, b) => b.count - a.count)
    }
  }
}

export default tagsModule
