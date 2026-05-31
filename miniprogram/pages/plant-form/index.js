const { formatDate, isFutureDate, parseDate } = require('../../utils/date')
const { createPlantRecord, updatePlantRecord } = require('../../utils/plants')
const { addPlant, getPlantById, updatePlant } = require('../../utils/storage')
const { uploadPlantImage } = require('../../utils/cloud')

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
    dayOptions,
    pickerValue: [
      Math.max(yearOptions.indexOf(year), 0),
      Math.max(monthOptions.indexOf(month), 0),
      Math.max(dayOptions.indexOf(day), 0),
    ],
  }
}

Page({
  data: {
    form: {
      name: '',
      lastWater: '',
      note: '',
      image: '',
    },
    tempImagePath: '',
    isEditMode: false,
    isSubmitting: false,
    showDatePicker: false,
    pickerYears: [],
    pickerMonths: [],
    pickerDays: [],
    pickerValue: [0, 0, 0],
  },

  async onLoad(options) {
    const today = formatDate()
    this.pickerYears = buildYearOptions()
    this.pickerMonths = buildMonthOptions()

    this.setData({
      today,
      'form.lastWater': today,
      pickerYears: this.pickerYears,
      pickerMonths: this.pickerMonths,
    })

    if (!options.id) {
      return
    }

    const plant = await getPlantById(options.id)

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

    wx.setNavigationBarTitle({
      title: '编辑植物',
    })

    this.plantId = options.id
    this.originalPlant = plant
    this.setData({
      isEditMode: true,
      form: {
        name: plant.name,
        lastWater: plant.lastWater || today,
        note: plant.note || '',
        image: plant.image || '',
      },
    })
  },

  onNameChange(event) {
    this.setData({
      'form.name': event.detail.value,
    })
  },

  openLastWaterPicker() {
    const pickerState = getPickerValue(this.data.form.lastWater, this.pickerYears, this.pickerMonths)

    this.setData({
      showDatePicker: true,
      pickerDays: pickerState.dayOptions,
      pickerValue: pickerState.pickerValue,
    })
  },

  closeDatePicker() {
    this.setData({
      showDatePicker: false,
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

  confirmDatePicker() {
    const { pickerValue, pickerDays, today } = this.data
    const [yearIndex = 0, monthIndex = 0, dayIndex = 0] = pickerValue
    const year = this.pickerYears[yearIndex] || this.pickerYears[0]
    const month = this.pickerMonths[monthIndex] || this.pickerMonths[0]
    const day = pickerDays[dayIndex] || pickerDays[0]
    const pickedDate = `${year}-${month}-${day}`

    if (pickedDate > today) {
      wx.showToast({
        title: '不能选择未来日期',
        icon: 'none',
      })
      return
    }

    this.setData({
      'form.lastWater': pickedDate,
      showDatePicker: false,
    })
  },

  onNoteChange(event) {
    this.setData({
      'form.note': event.detail.value,
    })
  },

  chooseImage() {
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: ({ tempFilePaths }) => {
        const [tempImagePath] = tempFilePaths

        this.setData({
          tempImagePath,
        })
      },
      fail: (error) => {
        if (error && error.errMsg && error.errMsg.includes('cancel')) {
          return
        }

        wx.showToast({
          title: '选图失败，请检查权限',
          icon: 'none',
        })
      },
    })
  },

  async submitForm() {
    if (this.data.isSubmitting) {
      return
    }

    const validationMessage = this.validateForm()

    if (validationMessage) {
      wx.showToast({
        title: validationMessage,
        icon: 'none',
      })
      return
    }

    this.setData({ isSubmitting: true })

    try {
      const image = await this.resolveImage()
      const payload = {
        ...this.data.form,
        name: this.data.form.name.trim(),
        image,
      }

      if (this.data.isEditMode) {
        const nextPlant = updatePlantRecord(this.originalPlant, payload)
        await updatePlant(this.plantId, nextPlant)
      } else {
        const plant = createPlantRecord(payload)
        await addPlant(plant)
      }

      wx.showToast({
        title: this.data.isEditMode ? '已更新' : '已保存',
        icon: 'success',
      })

      setTimeout(() => {
        wx.navigateBack()
      }, 450)
    } catch (error) {
      wx.showToast({
        title: error.message || '保存失败',
        icon: 'none',
      })
    } finally {
      this.setData({ isSubmitting: false })
    }
  },

  validateForm() {
    const { name, lastWater } = this.data.form

    if (!name.trim()) {
      return '请输入植物名称'
    }

    if (!lastWater) {
      return '请选择上次浇水时间'
    }

    if (isFutureDate(lastWater)) {
      return '上次浇水不能晚于今天'
    }

    return ''
  },

  resolveImage() {
    if (!this.data.tempImagePath) {
      return Promise.resolve(this.data.form.image || '')
    }

    return uploadPlantImage(this.data.tempImagePath)
  },
})
