const LOCAL_STORAGE_KEY = 'plants'
const COLLECTION_NAME = 'plants'

function getLocalPlants() {
  const plants = wx.getStorageSync(LOCAL_STORAGE_KEY)
  return Array.isArray(plants) ? plants : []
}

function saveLocalPlants(plants) {
  wx.setStorageSync(LOCAL_STORAGE_KEY, plants)
  return plants
}

function getCollection() {
  if (!wx.cloud || !wx.cloud.database) {
    throw new Error('云开发不可用，请检查环境配置')
  }

  return wx.cloud.database().collection(COLLECTION_NAME)
}

function stripDocId(plant) {
  if (!plant) {
    return null
  }

  const {
    _id,
    _openid,
    __openid,
    visibleTimeline,
    hasMoreTimeline,
    recordTimeline,
    lastWaterDisplay,
    lastWaterRelative,
    lastWaterTimestamp,
    heroStatus,
    listStatus,
    isDue,
    nextDueInDays,
    ...rest
  } = plant
  return rest
}

async function ensureMigrated() {
  const migrated = wx.getStorageSync(`${LOCAL_STORAGE_KEY}_migrated_to_cloud`)

  if (migrated) {
    return
  }

  const localPlants = getLocalPlants()

  if (!localPlants.length) {
    wx.setStorageSync(`${LOCAL_STORAGE_KEY}_migrated_to_cloud`, true)
    return
  }

  const collection = getCollection()
  const { data } = await collection.limit(1).get()

  if (Array.isArray(data) && data.length) {
    wx.setStorageSync(`${LOCAL_STORAGE_KEY}_migrated_to_cloud`, true)
    return
  }

  for (const plant of localPlants) {
    await collection.add({
      data: stripDocId(plant),
    })
  }

  wx.setStorageSync(`${LOCAL_STORAGE_KEY}_migrated_to_cloud`, true)
}

async function getPlants() {
  await ensureMigrated()
  const collection = getCollection()
  const { data } = await collection.orderBy('updatedAt', 'desc').get()
  return Array.isArray(data) ? data.map(stripDocId) : []
}

async function getPlantById(id) {
  const collection = getCollection()
  await ensureMigrated()
  const { data } = await collection.where({ id }).limit(1).get()
  return Array.isArray(data) && data.length ? stripDocId(data[0]) : null
}

async function addPlant(plant) {
  await ensureMigrated()
  const collection = getCollection()
  await collection.add({
    data: stripDocId(plant),
  })
  return plant
}

async function updatePlant(id, nextPlant) {
  await ensureMigrated()
  const collection = getCollection()
  const result = await collection.where({ id }).update({
    data: stripDocId(nextPlant),
  })

  if (!result.stats || !result.stats.updated) {
    throw new Error('植物不存在或无写入权限')
  }

  return nextPlant
}

async function removePlant(id) {
  await ensureMigrated()
  const collection = getCollection()
  const result = await collection.where({ id }).remove()

  if (!result.stats || !result.stats.removed) {
    throw new Error('植物不存在或无删除权限')
  }
}

module.exports = {
  addPlant,
  getPlantById,
  getPlants,
  getLocalPlants,
  removePlant,
  saveLocalPlants,
  updatePlant,
}
