const { createRecord, decoratePlant, getRecordLabel, normalizePlantRecords } = require('../../utils/plants')
const { formatDate, parseDate } = require('../../utils/date')
const { getPlantById, removePlant, updatePlant } = require('../../utils/storage')
const { uploadPlantImage } = require('../../utils/cloud')

const NOTE_MAX_LENGTH = 100

function padNumber(value) {
  return value > 9 ? `${value}` : `0${value}`
}

function buildYearOptions() {
  const currentYear = new Date().getFullYear()
  const years = []

  for (let year = currentYear - 5; year <= currentYear + 1; year += 1) {
    years.push(`${year}`)
  }

  return years
}

function buildMonthOptions() {
  return Array.from({ length: 12 }, (_, index) => padNumber(index + 1))
}

function getDaysInMonth(year, month) {
  return new Date(year, month, 0).getDate()
}

function buildDayOptions(year, month) {
  const totalDays = getDaysInMonth(year, month)
  return Array.from({ length: totalDays }, (_, index) => padNumber(index + 1))
}

function getPickerValue(dateString, yearOptions, monthOptions) {
  const date = parseDate(dateString) || new Date()
  const year = `${date.getFullYear()}`
  const month = padNumber(date.getMonth() + 1)
  const day = padNumber(date.getDate())
  const dayOptions = buildDayOptions(Number(year), Number(month))

  return {
    yearOptions,
    monthOptions,
    dayOptions,
    pickerValue: [
      Math.max(yearOptions.indexOf(year), 0),
      Math.max(monthOptions.indexOf(month), 0),
      Math.max(dayOptions.indexOf(day), 0),
    ],
  }
}

function getLatestWaterTime(records) {
  const waterRecord = records.find((record) => record.type === 'water')
  return waterRecord ? waterRecord.time : ''
}

Page({
  data: {
    plant: null,
    activeAction: '',
    visibleRecordCount: 50,
    today: '',
    showRecordPicker: false,
    editingRecordId: '',
    pendingRecordType: '',
    pickerMode: 'edit',
    pickerYears: [],
    pickerMonths: [],
    pickerDays: [],
    pickerValue: [0, 0, 0],
  },

  onShow() {
    if (this.plantId) {
      this.loadPlant(this.plantId)
    }
  },

  onLoad(options) {
    this.plantId = options.id
    this.pickerYears = buildYearOptions()
    this.pickerMonths = buildMonthOptions()
    this.setData({
      visibleRecordCount: 50,
      today: formatDate(),
      pickerYears: this.pickerYears,
      pickerMonths: this.pickerMonths,
    })
    this.loadPlant(this.plantId)
  },

  async loadPlant(id) {
    const plant = await getPlantById(id)

    if (!plant) {
      wx.showToast({
        title: '植物不存在',
        icon: 'none',
      })

      setTimeout(() => {
        wx.navigateBack()
      }, 400)
      return
    }

    const decoratedPlant = decoratePlant(plant)
    const visibleRecordCount = this.data.visibleRecordCount || 50

    this.setData({
      plant: {
        ...decoratedPlant,
        visibleTimeline: decoratedPlant.recordTimeline.slice(0, visibleRecordCount),
        hasMoreTimeline: decoratedPlant.recordTimeline.length > visibleRecordCount,
      },
    })
  },

  markWatered() {
    this.openCreateRecordPicker('water')
  },

  async changeImage() {
    const { confirm } = await wx.showModal({
      title: '更换图片',
      content: '要重新选择这盆植物的图片吗？',
      confirmText: '更换',
      cancelText: '取消',
    })

    if (!confirm) {
      return
    }

    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: async ({ tempFilePaths }) => {
        const [tempImagePath] = tempFilePaths

        if (!tempImagePath) {
          return
        }

        this.setData({ activeAction: 'image' })

        try {
          const image = await uploadPlantImage(tempImagePath)
          const { plant } = this.data
          await updatePlant(plant.id, {
            ...plant,
            image,
            updatedAt: new Date().toISOString(),
          })
          await this.loadPlant(plant.id)
          wx.showToast({
            title: '已更新图片',
            icon: 'success',
          })
        } catch (error) {
          wx.showToast({
            title: error.message || '更新图片失败',
            icon: 'none',
          })
        } finally {
          this.setData({ activeAction: '' })
        }
      },
    })
  },

  async editNote() {
    const { plant } = this.data
    const { confirm, content } = await wx.showModal({
      title: '修改备注',
      editable: true,
      placeholderText: '记录一些植物状态、位置或照顾习惯',
      content: plant.note || '',
      confirmText: '保存',
      cancelText: '取消',
    })

    if (!confirm) {
      return
    }

    await updatePlant(plant.id, {
      ...plant,
      note: (content || '').trim(),
      updatedAt: new Date().toISOString(),
    })
    await this.loadPlant(plant.id)
    wx.showToast({
      title: '已更新备注',
      icon: 'success',
    })
  },

  async editName() {
    const { plant } = this.data
    const { confirm, content } = await wx.showModal({
      title: '修改名称',
      editable: true,
      placeholderText: '请输入植物名称',
      content: plant.name || '',
      confirmText: '保存',
      cancelText: '取消',
    })

    if (!confirm) {
      return
    }

    const name = (content || '').trim()

    if (!name) {
      wx.showToast({
        title: '名称不能为空',
        icon: 'none',
      })
      return
    }

    await updatePlant(plant.id, {
      ...plant,
      name,
      updatedAt: new Date().toISOString(),
    })
    await this.loadPlant(plant.id)
    wx.showToast({
      title: '已更新名称',
      icon: 'success',
    })
  },

  addRecord() {
    const recordTypes = ['rootSterilize', 'rootFertilize', 'sterilizeSpray', 'pestSpray', 'repot']

    wx.showActionSheet({
      itemList: ['杀菌灌根', '施肥灌根', '杀菌喷药', '驱虫喷药', '换盆换土'],
      success: ({ tapIndex }) => {
        const type = recordTypes[tapIndex]

        if (type) {
          this.openCreateRecordPicker(type)
        }
      },
    })
  },

  async appendRecord(type, note = '') {
    if (this.data.activeAction === type) {
      return
    }

    const { plant } = this.data
    const time = this.getPickedDate()
    const records = [createRecord(type, time, note), ...normalizePlantRecords(plant)]
    const nextPlant = {
      ...plant,
      records,
      lastWater: type === 'water' ? time : plant.lastWater,
      updatedAt: new Date().toISOString(),
    }

    this.setData({
      activeAction: type,
    })
    try {
      await updatePlant(plant.id, nextPlant)
      await this.loadPlant(plant.id)

      wx.showToast({
        title: `已记录${getRecordLabel(type)}`,
        icon: 'success',
      })
    } catch (error) {
      wx.showToast({
        title: error.message || '记录失败',
        icon: 'none',
      })
    } finally {
      this.setData({
        activeAction: '',
      })
    }
  },

  openCreateRecordPicker(type) {
    const pickerState = getPickerValue(this.data.today, this.pickerYears, this.pickerMonths)

    this.setData({
      showRecordPicker: true,
      pendingRecordType: type,
      editingRecordId: '',
      pickerMode: 'create',
      pickerDays: pickerState.dayOptions,
      pickerValue: pickerState.pickerValue,
    })
  },

  async editRecord(event) {
    const { id } = event.currentTarget.dataset
    const { plant } = this.data
    const targetRecord = (plant.records || []).find((record) => record.id === id)

    if (!targetRecord) {
      return
    }

    const canEditNote = targetRecord.type === 'rootFertilize'
    const itemList = canEditNote
      ? ['修改时间', '修改备注', '删除记录']
      : ['修改时间', '删除记录']
    let tapIndex = -1

    try {
      const result = await wx.showActionSheet({ itemList })
      tapIndex = result.tapIndex
    } catch (error) {
      return
    }

    if (tapIndex === 0) {
      this.openRecordPicker(targetRecord)
      return
    }

    if (canEditNote && tapIndex === 1) {
      await this.editRecordNote(targetRecord)
      return
    }

    const { confirm } = await wx.showModal({
      title: '删除记录',
      content: `确认删除这条“${getRecordLabel(targetRecord.type)}”记录吗？`,
      confirmColor: '#FF6B6B',
    })

    if (!confirm) {
      return
    }

    const nextRecords = normalizePlantRecords(plant).filter((record) => record.id !== id)
    await updatePlant(plant.id, {
      ...plant,
      records: nextRecords,
      lastWater: getLatestWaterTime(nextRecords),
      updatedAt: new Date().toISOString(),
    })
    await this.loadPlant(plant.id)
    wx.showToast({
      title: '已删除记录',
      icon: 'success',
    })
  },

  async promptRecordNote({ title, content = '', cancelText }) {
    const result = await wx.showModal({
      title,
      editable: true,
      placeholderText: '用了什么肥、稀释比例等',
      content,
      confirmText: '保存',
      cancelText,
    })

    return {
      confirm: result.confirm,
      note: (result.content || '').trim(),
    }
  },

  async editRecordNote(record) {
    const { plant } = this.data
    const { confirm, note } = await this.promptRecordNote({
      title: '修改备注',
      content: record.note || '',
      cancelText: '取消',
    })

    if (!confirm) {
      return
    }

    if (note.length > NOTE_MAX_LENGTH) {
      wx.showToast({
        title: '备注最多 100 字',
        icon: 'none',
      })
      return
    }

    const nextRecords = normalizePlantRecords(plant).map((item) => {
      if (item.id !== record.id) {
        return item
      }

      const nextRecord = { ...item }

      if (note) {
        nextRecord.note = note
      } else {
        delete nextRecord.note
      }

      return nextRecord
    })

    await updatePlant(plant.id, {
      ...plant,
      records: nextRecords,
      updatedAt: new Date().toISOString(),
    })
    await this.loadPlant(plant.id)
    wx.showToast({
      title: '已更新备注',
      icon: 'success',
    })
  },

  openRecordPicker(record) {
    const pickerState = getPickerValue(record.time, this.pickerYears, this.pickerMonths)

    this.setData({
      showRecordPicker: true,
      editingRecordId: record.id,
      pendingRecordType: '',
      pickerMode: 'edit',
      pickerDays: pickerState.dayOptions,
      pickerValue: pickerState.pickerValue,
    })
  },

  closeRecordPicker() {
    this.setData({
      showRecordPicker: false,
      editingRecordId: '',
      pendingRecordType: '',
    })
  },

  noop() {},

  onPickerChange(event) {
    const [yearIndex = 0, monthIndex = 0, dayIndex = 0] = event.detail.value
    const year = Number(this.pickerYears[yearIndex] || this.pickerYears[0])
    const month = Number(this.pickerMonths[monthIndex] || this.pickerMonths[0])
    const nextDayOptions = buildDayOptions(year, month)
    const safeDayIndex = Math.min(dayIndex, nextDayOptions.length - 1)

    this.setData({
      pickerDays: nextDayOptions,
      pickerValue: [yearIndex, monthIndex, safeDayIndex],
    })
  },

  getPickedDate() {
    const { pickerValue, pickerDays } = this.data
    const [yearIndex = 0, monthIndex = 0, dayIndex = 0] = pickerValue
    const year = this.pickerYears[yearIndex] || this.pickerYears[0]
    const month = this.pickerMonths[monthIndex] || this.pickerMonths[0]
    const day = pickerDays[dayIndex] || pickerDays[0]

    return `${year}-${month}-${day}`
  },

  async confirmRecordPicker() {
    const { plant, editingRecordId, pendingRecordType, today, pickerMode } = this.data
    const pickedDate = this.getPickedDate()

    if (pickedDate > today) {
      wx.showToast({
        title: '不能选择未来日期',
        icon: 'none',
      })
      return
    }

    if (pickerMode === 'create' && pendingRecordType) {
      const type = pendingRecordType
      this.closeRecordPicker()

      if (type === 'rootFertilize') {
        const { confirm, note } = await this.promptRecordNote({
          title: '添加备注（可跳过）',
          cancelText: '跳过',
        })
        let nextNote = ''

        if (confirm) {
          if (note.length > NOTE_MAX_LENGTH) {
            wx.showToast({
              title: '备注最多 100 字',
              icon: 'none',
            })
            // 让超限提示展示完再落库;本次不写入备注,可事后从时光轴补写
            await new Promise((resolve) => setTimeout(resolve, 1500))
          } else {
            nextNote = note
          }
        }

        await this.appendRecord(type, nextNote)
        return
      }

      await this.appendRecord(type)
      return
    }

    if (!editingRecordId) {
      return
    }

    const nextRecords = normalizePlantRecords(plant).map((record) => {
      if (record.id !== editingRecordId) {
        return record
      }
      return {
        ...record,
        time: pickedDate,
      }
    })

    await updatePlant(plant.id, {
      ...plant,
      records: nextRecords,
      lastWater: getLatestWaterTime(nextRecords),
      updatedAt: new Date().toISOString(),
    })

    this.closeRecordPicker()
    await this.loadPlant(plant.id)
    wx.showToast({
      title: '已更新时间',
      icon: 'success',
    })
  },

  loadMoreTimeline() {
    this.setData({
      visibleRecordCount: (this.data.visibleRecordCount || 50) + 50,
    })

    if (this.plantId) {
      this.loadPlant(this.plantId)
    }
  },

  deletePlant() {
    wx.showModal({
      title: '删除植物',
      content: '删除后将无法恢复，确认删除这盆植物吗？',
      confirmColor: '#FF6B6B',
      success: async ({ confirm }) => {
        if (!confirm) {
          return
        }

        await removePlant(this.plantId)
        wx.showToast({
          title: '已删除',
          icon: 'success',
        })

        setTimeout(() => {
          wx.navigateBack()
        }, 400)
      },
    })
  },
})
