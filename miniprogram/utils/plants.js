const { formatDate, formatDisplayDate, formatRelativeTime, parseDate } = require('./date')

const RECORD_LABEL_MAP = {
  water: '浇水',
  rootSterilize: '杀菌灌根',
  sterilizeSpray: '杀菌喷药',
  pestSpray: '驱虫喷药',
}

const RECORD_CLASS_MAP = {
  water: 'water',
  rootSterilize: 'root-sterilize',
  sterilizeSpray: 'sterilize-spray',
  pestSpray: 'pest-spray',
}

function createRecord(type, time) {
  return {
    id: `record_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    type,
    time,
  }
}

function getRecordLabel(type) {
  return RECORD_LABEL_MAP[type] || '养护'
}

function getRecordClass(type) {
  return RECORD_CLASS_MAP[type] || 'water'
}

function normalizePlantRecords(plant) {
  if (Array.isArray(plant.records) && plant.records.length) {
    return plant.records.slice()
  }

  if (!plant.lastWater) {
    return []
  }

  return [createRecord('water', plant.lastWater)]
}

function createPlantRecord(payload) {
  const today = formatDate()
  const lastWater = payload.lastWater || today

  return {
    id: `plant_${Date.now()}`,
    name: payload.name,
    image: payload.image || '',
    note: payload.note ? payload.note.trim() : '',
    lastWater,
    records: [createRecord('water', lastWater)],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

function updatePlantRecord(currentPlant, payload) {
  return {
    ...currentPlant,
    ...payload,
    note: payload.note ? payload.note.trim() : '',
    records: currentPlant.records || normalizePlantRecords(currentPlant),
    updatedAt: new Date().toISOString(),
  }
}

function decoratePlant(plant) {
  const records = normalizePlantRecords(plant).sort((left, right) => {
    const rightTime = parseDate(right.time)
    const leftTime = parseDate(left.time)
    return (rightTime ? rightTime.getTime() : 0) - (leftTime ? leftTime.getTime() : 0)
  })
  const lastWaterDate = parseDate(plant.lastWater)
  const latestRecord = records[0] || null
  const latestRecordDate = latestRecord ? parseDate(latestRecord.time) : null

  return {
    ...plant,
    records,
    recordTimeline: records.map((record) => ({
      ...record,
      label: getRecordLabel(record.type),
      typeClass: getRecordClass(record.type),
      displayTime: formatDisplayDate(record.time),
      relativeTime: formatRelativeTime(record.time),
    })),
    isDue: false,
    nextDueInDays: 0,
    lastWaterDisplay: formatDisplayDate(plant.lastWater),
    lastWaterRelative: formatRelativeTime(plant.lastWater),
    lastWaterTimestamp: lastWaterDate ? lastWaterDate.getTime() : 0,
    latestRecordLabel: latestRecord ? getRecordLabel(latestRecord.type) : '',
    latestRecordDisplay: latestRecord ? formatDisplayDate(latestRecord.time) : '',
    latestRecordRelative: latestRecord ? formatRelativeTime(latestRecord.time) : '',
    latestRecordTimestamp: latestRecordDate ? latestRecordDate.getTime() : 0,
    heroStatus: latestRecord
      ? `最近养护：${getRecordLabel(latestRecord.type)} · ${formatDisplayDate(latestRecord.time)}`
      : '还没有养护记录',
    listStatus: `上次浇水 ${formatDisplayDate(plant.lastWater) || '暂无记录'}`,
  }
}

function sortPlantsByTask(plants) {
  return plants.slice().sort((left, right) => {
    if (left.latestRecordTimestamp !== right.latestRecordTimestamp) {
      return right.latestRecordTimestamp - left.latestRecordTimestamp
    }

    return left.name.localeCompare(right.name, 'zh-Hans-CN')
  })
}

function buildPlantList(plants) {
  return sortPlantsByTask(plants.map(decoratePlant))
}

module.exports = {
  buildPlantList,
  createPlantRecord,
  createRecord,
  decoratePlant,
  getRecordClass,
  getRecordLabel,
  normalizePlantRecords,
  updatePlantRecord,
}
