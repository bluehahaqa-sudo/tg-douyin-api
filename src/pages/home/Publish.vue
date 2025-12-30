<template>
  <div class="Publish">
    <!-- 步骤 1: 选择视频 -->
    <div v-if="step === 'select'" class="select-step">
      <!-- 相机预览 -->
      <video
        v-if="showCamera"
        ref="cameraVideoRef"
        autoplay
        muted
        playsinline
        class="camera-preview"
      ></video>
      <div v-else class="camera-placeholder">
        <Icon icon="mdi:video-off" />
        <span>无法访问相机</span>
      </div>

      <!-- 关闭按钮 -->
      <Icon class="close-btn" icon="mingcute:close-line" @click="handleBack" />

      <!-- 选择选项 -->
      <div class="select-options">
        <div class="option" @click="selectFromGallery">
          <Icon icon="mdi:image-multiple" />
          <span>相册</span>
        </div>
        <div class="record-btn">
          <div class="inner"></div>
        </div>
        <div class="option" @click="toggleCamera">
          <Icon icon="mdi:camera-flip" />
          <span>翻转</span>
        </div>
      </div>

      <!-- 隐藏的文件输入 -->
      <input
        ref="fileInputRef"
        type="file"
        accept="video/*"
        style="display: none"
        @change="handleFileSelect"
      />
    </div>

    <!-- 步骤 2: 编辑和发布 -->
    <div v-else-if="step === 'edit'" class="edit-step">
      <!-- 顶部栏 -->
      <div class="header">
        <Icon class="back-btn" icon="mingcute:arrow-left-line" @click="goBackToSelect" />
        <span class="title">发布</span>
        <span class="publish-btn" :class="{ disabled: uploading }" @click="handlePublish">
          {{ uploading ? '发布中...' : '发布' }}
        </span>
      </div>

      <!-- 视频预览 -->
      <div class="video-container">
        <video
          ref="previewVideoRef"
          :src="videoPreviewUrl"
          controls
          playsinline
          class="video-preview"
        ></video>

        <!-- 封面选择 -->
        <div class="cover-selector" @click="selectCover">
          <img v-if="coverPreviewUrl" :src="coverPreviewUrl" alt="封面" />
          <div v-else class="cover-placeholder">
            <Icon icon="mdi:image-plus" />
            <span>选封面</span>
          </div>
        </div>
        <input
          ref="coverInputRef"
          type="file"
          accept="image/*"
          style="display: none"
          @change="handleCoverSelect"
        />
      </div>

      <!-- 表单 -->
      <div class="form">
        <!-- 标题 -->
        <div class="form-item">
          <input
            v-model="formData.title"
            type="text"
            placeholder="添加标题，让更多人看到"
            maxlength="100"
            class="title-input"
          />
        </div>

        <!-- 描述 -->
        <div class="form-item">
          <textarea
            v-model="formData.description"
            placeholder="添加描述... #话题 @好友"
            maxlength="500"
            rows="3"
            class="desc-input"
          ></textarea>
        </div>

        <!-- 标签 -->
        <div class="form-item tags-section">
          <div class="tags-header">
            <span>标签</span>
            <span class="tag-count">{{ formData.tags.length }}/5</span>
          </div>
          <div class="tags-input-wrapper">
            <input
              v-model="tagInput"
              type="text"
              placeholder="输入标签后按回车"
              @keydown.enter.prevent="addTag"
            />
          </div>
          <div v-if="formData.tags.length > 0" class="tags-list">
            <span v-for="(tag, index) in formData.tags" :key="index" class="tag">
              #{{ tag }}
              <Icon icon="mdi:close" @click="removeTag(index)" />
            </span>
          </div>
        </div>

        <!-- 分类 -->
        <div class="form-item category-section">
          <span class="label">分类</span>
          <select v-model="formData.category">
            <option value="">选择分类</option>
            <option value="entertainment">娱乐</option>
            <option value="music">音乐</option>
            <option value="dance">舞蹈</option>
            <option value="comedy">搞笑</option>
            <option value="sports">运动</option>
            <option value="gaming">游戏</option>
            <option value="food">美食</option>
            <option value="fashion">时尚</option>
            <option value="education">教育</option>
            <option value="other">其他</option>
          </select>
        </div>
      </div>

      <!-- 上传进度 -->
      <div v-if="uploading" class="upload-progress">
        <div class="progress-bar">
          <div class="progress-fill" :style="{ width: uploadProgress + '%' }"></div>
        </div>
        <span class="progress-text">上传中... {{ uploadProgress }}%</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { Icon } from '@iconify/vue'
import { uploadVideo } from '@/api/videos'
import { _notice } from '@/utils'

defineOptions({ name: 'Publish' })

const router = useRouter()

// 步骤控制
const step = ref<'select' | 'edit'>('select')

// 相机相关
const cameraVideoRef = ref<HTMLVideoElement | null>(null)
const showCamera = ref(true)
let mediaStream: MediaStream | null = null
let facingMode = 'user'

// 文件相关
const fileInputRef = ref<HTMLInputElement | null>(null)
const coverInputRef = ref<HTMLInputElement | null>(null)
const previewVideoRef = ref<HTMLVideoElement | null>(null)

// 视频数据
const videoFile = ref<File | null>(null)
const coverFile = ref<File | null>(null)
const videoPreviewUrl = ref('')
const coverPreviewUrl = ref('')
const videoDuration = ref(0)

// 表单数据
const formData = reactive({
  title: '',
  description: '',
  category: '',
  tags: [] as string[]
})
const tagInput = ref('')

// 上传状态
const uploading = ref(false)
const uploadProgress = ref(0)

// 初始化相机
async function initCamera() {
  try {
    mediaStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode },
      audio: false
    })
    if (cameraVideoRef.value) {
      cameraVideoRef.value.srcObject = mediaStream
    }
    showCamera.value = true
  } catch (error) {
    console.error('相机访问失败:', error)
    showCamera.value = false
  }
}

// 停止相机
function stopCamera() {
  if (mediaStream) {
    mediaStream.getTracks().forEach((track) => track.stop())
    mediaStream = null
  }
}

// 切换前后摄像头
async function toggleCamera() {
  stopCamera()
  facingMode = facingMode === 'user' ? 'environment' : 'user'
  await initCamera()
}

// 从相册选择
function selectFromGallery() {
  fileInputRef.value?.click()
}

// 处理文件选择
function handleFileSelect(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]

  if (!file) return

  // 验证文件类型
  if (!file.type.startsWith('video/')) {
    _notice('请选择视频文件')
    return
  }

  // 验证文件大小 (100MB)
  const maxSize = 100 * 1024 * 1024
  if (file.size > maxSize) {
    _notice('视频大小不能超过 100MB')
    return
  }

  videoFile.value = file
  videoPreviewUrl.value = URL.createObjectURL(file)

  // 获取视频时长
  const video = document.createElement('video')
  video.preload = 'metadata'
  video.onloadedmetadata = () => {
    videoDuration.value = Math.round(video.duration)
    URL.revokeObjectURL(video.src)
  }
  video.src = URL.createObjectURL(file)

  // 停止相机并切换到编辑步骤
  stopCamera()
  step.value = 'edit'
}

// 选择封面
function selectCover() {
  coverInputRef.value?.click()
}

// 处理封面选择
function handleCoverSelect(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]

  if (!file) return

  if (!file.type.startsWith('image/')) {
    _notice('请选择图片文件')
    return
  }

  coverFile.value = file
  coverPreviewUrl.value = URL.createObjectURL(file)
}

// 标签管理
function addTag() {
  const tag = tagInput.value.trim().replace(/^#/, '')
  if (!tag) return

  if (formData.tags.length >= 5) {
    _notice('最多添加 5 个标签')
    return
  }

  if (formData.tags.includes(tag)) {
    _notice('标签已存在')
    return
  }

  formData.tags.push(tag)
  tagInput.value = ''
}

function removeTag(index: number) {
  formData.tags.splice(index, 1)
}

// 返回选择步骤
function goBackToSelect() {
  step.value = 'select'
  // 清理预览
  if (videoPreviewUrl.value) URL.revokeObjectURL(videoPreviewUrl.value)
  if (coverPreviewUrl.value) URL.revokeObjectURL(coverPreviewUrl.value)
  videoFile.value = null
  coverFile.value = null
  videoPreviewUrl.value = ''
  coverPreviewUrl.value = ''
  // 重新启动相机
  initCamera()
}

// 返回上一页
function handleBack() {
  stopCamera()
  router.back()
}

// 发布视频
async function handlePublish() {
  if (!videoFile.value) {
    _notice('请选择视频')
    return
  }

  if (uploading.value) return

  uploading.value = true
  uploadProgress.value = 0

  try {
    const formDataObj = new FormData()
    formDataObj.append('video', videoFile.value)

    if (coverFile.value) {
      formDataObj.append('cover', coverFile.value)
    }

    if (formData.title) formDataObj.append('title', formData.title)
    if (formData.description) formDataObj.append('description', formData.description)
    if (formData.category) formDataObj.append('category', formData.category)
    if (formData.tags.length > 0) {
      formDataObj.append('tags', JSON.stringify(formData.tags))
    }
    if (videoDuration.value) {
      formDataObj.append('duration', String(videoDuration.value))
    }

    const response = await uploadVideo(formDataObj, (progress) => {
      uploadProgress.value = progress
    })

    if (response.data?.success !== false) {
      _notice('发布成功!')
      router.push('/me')
    } else {
      _notice(response.data?.message || '发布失败')
    }
  } catch (error: any) {
    console.error('上传错误:', error)
    _notice(error.response?.data?.message || error.message || '发布失败')
  } finally {
    uploading.value = false
  }
}

// 生命周期
onMounted(() => {
  initCamera()
})

onUnmounted(() => {
  stopCamera()
  if (videoPreviewUrl.value) URL.revokeObjectURL(videoPreviewUrl.value)
  if (coverPreviewUrl.value) URL.revokeObjectURL(coverPreviewUrl.value)
})
</script>

<style scoped lang="less">
@import '@/assets/less/index';

.Publish {
  position: fixed;
  inset: 0;
  background: #000;
  color: #fff;
  overflow: hidden;

  .select-step {
    position: relative;
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;

    .camera-preview {
      flex: 1;
      width: 100%;
      object-fit: cover;
    }

    .camera-placeholder {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: #111;
      color: #666;

      svg {
        font-size: 60rem;
        margin-bottom: 15rem;
      }

      span {
        font-size: 14rem;
      }
    }

    .close-btn {
      position: absolute;
      top: 20rem;
      left: 20rem;
      font-size: 28rem;
      z-index: 10;
    }

    .select-options {
      position: absolute;
      bottom: 40rem;
      left: 0;
      right: 0;
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 50rem;

      .option {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8rem;

        svg {
          font-size: 28rem;
        }

        span {
          font-size: 12rem;
        }
      }

      .record-btn {
        width: 70rem;
        height: 70rem;
        border-radius: 50%;
        border: 4px solid #fff;
        display: flex;
        align-items: center;
        justify-content: center;

        .inner {
          width: 56rem;
          height: 56rem;
          border-radius: 50%;
          background: #fe2c55;
        }
      }
    }
  }

  .edit-step {
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow-y: auto;

    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 15rem;
      background: #111;

      .back-btn {
        font-size: 24rem;
      }

      .title {
        font-size: 16rem;
        font-weight: 600;
      }

      .publish-btn {
        color: #fe2c55;
        font-weight: 600;
        font-size: 15rem;

        &.disabled {
          opacity: 0.5;
        }
      }
    }

    .video-container {
      position: relative;
      background: #111;

      .video-preview {
        width: 100%;
        max-height: 300rem;
        object-fit: contain;
      }

      .cover-selector {
        position: absolute;
        right: 15rem;
        bottom: 15rem;
        width: 60rem;
        height: 80rem;
        border-radius: 4rem;
        overflow: hidden;
        background: rgba(0, 0, 0, 0.6);
        border: 1px solid #333;

        img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .cover-placeholder {
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 4rem;
          color: #888;

          svg {
            font-size: 20rem;
          }

          span {
            font-size: 10rem;
          }
        }
      }
    }

    .form {
      flex: 1;
      padding: 15rem;

      .form-item {
        margin-bottom: 20rem;
      }

      .title-input,
      .desc-input {
        width: 100%;
        background: transparent;
        border: none;
        color: #fff;
        font-size: 15rem;
        padding: 10rem 0;
        border-bottom: 1px solid #333;
        resize: none;
        outline: none;

        &::placeholder {
          color: #666;
        }
      }

      .tags-section {
        .tags-header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 10rem;
          font-size: 14rem;
          color: #888;
        }

        .tags-input-wrapper {
          input {
            width: 100%;
            background: #222;
            border: none;
            border-radius: 8rem;
            padding: 10rem 15rem;
            color: #fff;
            outline: none;

            &::placeholder {
              color: #666;
            }
          }
        }

        .tags-list {
          display: flex;
          flex-wrap: wrap;
          gap: 8rem;
          margin-top: 10rem;

          .tag {
            display: flex;
            align-items: center;
            gap: 4rem;
            background: #fe2c55;
            padding: 5rem 10rem;
            border-radius: 15rem;
            font-size: 12rem;

            svg {
              font-size: 14rem;
              cursor: pointer;
            }
          }
        }
      }

      .category-section {
        display: flex;
        align-items: center;
        justify-content: space-between;

        .label {
          font-size: 14rem;
          color: #888;
        }

        select {
          background: #222;
          color: #fff;
          border: none;
          padding: 8rem 12rem;
          border-radius: 8rem;
          outline: none;
        }
      }
    }

    .upload-progress {
      padding: 15rem;
      background: #111;

      .progress-bar {
        height: 4rem;
        background: #333;
        border-radius: 2rem;
        overflow: hidden;

        .progress-fill {
          height: 100%;
          background: #fe2c55;
          transition: width 0.3s;
        }
      }

      .progress-text {
        display: block;
        text-align: center;
        margin-top: 8rem;
        font-size: 12rem;
        color: #888;
      }
    }
  }
}
</style>
