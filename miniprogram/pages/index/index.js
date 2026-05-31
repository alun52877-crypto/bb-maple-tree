const { formatDate } = require('../../utils/date')
const { buildPlantList } = require('../../utils/plants')
const { getPlantById, getPlantsPage, updatePlant } = require('../../utils/storage')

const PAGE_SIZE = 20

Page({
  data: {
    todayLabel: '',
    plants: [],
    actionKey: '',
    missionCard: null,
    hasMorePlants: true,
    isLoadingPlants: false,
  },

  plantSource: [],

  onShow() {
    this.setData({
      todayLabel: formatDate(),
    })
    this.loadPlants()
  },

  async loadPlants() {
    if (this.data.isLoadingPlants) {
      return
    }

    try {
      this.setData({ isLoadingPlants: true })
      this.plantSource = []
      let hasMore = true

      while (hasMore) {
        const { plants, hasMore: nextHasMore } = await getPlantsPage({
          offset: this.plantSource.length,
          limit: PAGE_SIZE,
        })
        this.plantSource = this.plantSource.concat(plants)
        hasMore = nextHasMore
      }

      const plantList = buildPlantList(this.plantSource)
      const missionCard = this.buildMissionCard(plantList)

      this.setData({
        plants: plantList,
        missionCard,
        hasMorePlants: hasMore,
      })
    } catch (error) {
      wx.showToast({
        title: error.message || '加载植物失败',
        icon: 'none',
      })
    } finally {
      this.setData({ isLoadingPlants: false })
    }
  },

  buildMissionCard(plants) {
    if (plants.length) {
      const latestPlant = plants[0]
      const latestLabel = latestPlant.latestRecordLabel || '养护'
      const latestRelative = latestPlant.latestRecordRelative || '今天'
      const isTodayRecord = latestRelative === '今天'
      const latestDateText = latestPlant.latestRecordDisplay || this.data.todayLabel || formatDate()

      return {
        kicker: '养护卡片',
        title: isTodayRecord
          ? `${latestPlant.name} · 刚记下一次${latestLabel}`
          : `${latestPlant.name} · 上一次养护是${latestLabel}`,
        subtitle: '',
        dateText: isTodayRecord
          ? latestDateText
          : latestRelative === latestDateText
            ? latestDateText
            : `${latestRelative} · ${latestDateText}`,
      }
    }

    return null
  },

  goToCreate() {
    wx.navigateTo({
      url: '/pages/plant-form/index',
    })
  },

  openPlantDetail(event) {
    const { id } = event.currentTarget.dataset

    wx.navigateTo({
      url: `/pages/plant-detail/index?id=${id}`,
    })
  },

  markWatered(event) {
    this.updateCareRecord(event.currentTarget.dataset.id, 'lastWater', '已记录浇水')
  },

  async updateCareRecord(id, field, message) {
    const actionKey = `${id}_${field}`

    if (this.data.actionKey === actionKey) {
      return
    }

    const plant = await getPlantById(id)

    if (!plant) {
      wx.showToast({
        title: '植物不存在',
        icon: 'none',
      })
      return
    }

    this.setData({ actionKey })

    try {
      await updatePlant(id, {
        ...plant,
        [field]: formatDate(),
        updatedAt: new Date().toISOString(),
      })
      await this.loadPlants()

      wx.showToast({
        title: message,
        icon: 'success',
      })
    } catch (error) {
      wx.showToast({
        title: error.message || '保存失败',
        icon: 'none',
      })
    } finally {
      this.setData({ actionKey: '' })
    }
  },
})
