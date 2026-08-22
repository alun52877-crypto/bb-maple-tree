const assert = require('assert')
const { buildPlantList, decoratePlant, selectMissionPlant } = require('../miniprogram/utils/plants')

function makePlant({ id, name, records = [] }) {
  return { id, name, lastWater: '', records }
}

async function run() {
  // 养护卡片选取"最近养护"最新的植物(输入为常规排序后的列表)
  const plants = buildPlantList([
    makePlant({ id: 'plant_a', name: 'A植物', records: [{ id: 'r1', type: 'water', time: '2026-08-01' }] }),
    makePlant({ id: 'plant_b', name: 'B植物', records: [{ id: 'r2', type: 'repot', time: '2026-08-20' }] }),
    makePlant({ id: 'plant_c', name: 'C植物', records: [{ id: 'r3', type: 'water', time: '2026-08-10' }] }),
  ])

  const selected = selectMissionPlant(plants)

  assert.strictEqual(selected.id, 'plant_b')

  // 选取与输入顺序无关,且"最近养护"时间相同时按植物名称升序选取(与原列表首位的行为一致)
  const tiePlants = [
    decoratePlant(makePlant({ id: 'plant_z', name: 'B植物', records: [{ id: 'r4', type: 'water', time: '2026-08-15' }] })),
    decoratePlant(makePlant({ id: 'plant_y', name: 'A植物', records: [{ id: 'r5', type: 'water', time: '2026-08-15' }] })),
  ]

  assert.strictEqual(selectMissionPlant(tiePlants).id, 'plant_y')

  // 所有植物都没有养护记录时,兜底选取名称排序最靠前的植物(与原列表首位行为一致)
  const noRecordPlants = [
    decoratePlant(makePlant({ id: 'plant_m', name: 'B植物' })),
    decoratePlant(makePlant({ id: 'plant_n', name: 'A植物' })),
  ]

  assert.strictEqual(selectMissionPlant(noRecordPlants).id, 'plant_n')

  // 植物列表为空时,选取结果为空
  assert.strictEqual(selectMissionPlant([]), null)
}

run().catch((error) => {
  console.error(error)
  process.exit(1)
})
