const CLOUD_ENV_ID = 'cloudbase-d9gvqh53i02eba787'

function isCloudReady() {
  return Boolean(wx.cloud) && CLOUD_ENV_ID
}

function getCloudEnvId() {
  return CLOUD_ENV_ID
}

function uploadPlantImage(filePath) {
  if (!filePath) {
    return Promise.resolve('')
  }

  if (!isCloudReady()) {
    return Promise.reject(new Error('请先配置可用的云开发环境'))
  }

  const extension = filePath.split('.').pop() || 'jpg'
  const cloudPath = `plant/${Date.now()}.${extension}`

  return wx.cloud.uploadFile({
    cloudPath,
    filePath,
  }).then(({ fileID }) => fileID)
}

module.exports = {
  getCloudEnvId,
  isCloudReady,
  uploadPlantImage,
}
