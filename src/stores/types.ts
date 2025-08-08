import DirImageListStateTypes from './modules/dir-image-list/types'
import UserConfigInfoStateTypes from './modules/user-config-info/types'
import UploadAreaActiveStateTypes from './modules/upload-area-active/types'
import ToolboxImageListStateTypes from './modules/toolbox-image-list/types'
import UploadImageListStateTypes from './modules/upload-image-list/types'
import GitHubAuthorizeStateTypes from './modules/github-authorize/types'
import { TagsModuleState } from './modules/tags'

export default interface RootStateTypes {
  rootName: string
}

export interface AllStateTypes extends RootStateTypes {
  dirImageListModule: DirImageListStateTypes
  userConfigInfoModule: UserConfigInfoStateTypes
  uploadAreaActiveModule: UploadAreaActiveStateTypes
  toolboxImageListModule: ToolboxImageListStateTypes
  uploadImageListModule: UploadImageListStateTypes
  githubAuthorizeModule: GitHubAuthorizeStateTypes
  tagsModule: TagsModuleState
}
