/**
 * 标签数据模型
 */
export interface TagsDataModel {
  version: string // 数据版本
  lastUpdated: string // 最后更新时间
  images: ImageTagsMap // 图片标签映射
}

/**
 * 图片标签映射
 * key: 图片路径 (path)
 * value: 标签数组
 */
export interface ImageTagsMap {
  [path: string]: string[]
}

/**
 * 标签统计信息
 */
export interface TagStatistics {
  tag: string
  count: number
}
