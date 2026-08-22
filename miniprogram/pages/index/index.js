const { formatDate } = require('../../utils/date')
const { buildPlantList, selectMissionPlant } = require('../../utils/plants')
const { getPlantsPage } = require('../../utils/storage')

const PAGE_SIZE = 20

Page({
  data: {
    todayLabel: '',
    plants: [],
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
    const latestPlant = selectMissionPlant(plants)

    if (latestPlant) {
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
})
