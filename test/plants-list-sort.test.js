const assert = require('assert')
const { buildPlantList } = require('../miniprogram/utils/plants')

function makePlant({ id, name, lastWater = '', records = [] }) {
  return { id, name, lastWater, records }
}

async function run() {
  // 列表按"上次浇水时间"降序:刚记录过非浇水养护(换盆换土)的植物不应排到最前
  const plants = buildPlantList([
    makePlant({
      id: 'plant_a',
      name: 'A植物',
      lastWater: '2026-08-01',
      records: [
        { id: 'r1', type: 'repot', time: '2026-08-21' },
        { id: 'r2', type: 'water', time: '2026-08-01' },
      ],
    }),
    makePlant({
      id: 'plant_b',
      name: 'B植物',
      lastWater: '2026-08-20',
      records: [{ id: 'r3', type: 'water', time: '2026-08-20' }],
    }),
  ])

  assert.deepStrictEqual(
    plants.map((plant) => plant.id),
    ['plant_b', 'plant_a'],
  )

  // 从未浇过水的植物排在列表最底部,即使它有更新的非浇水养护记录
  const unwateredPlants = buildPlantList([
    makePlant({
      id: 'plant_c',
      name: 'C植物',
      records: [{ id: 'r4', type: 'repot', time: '2026-08-22' }],
    }),
    makePlant({
      id: 'plant_d',
      name: 'D植物',
      lastWater: '2026-07-01',
      records: [{ id: 'r5', type: 'water', time: '2026-07-01' }],
    }),
  ])

  assert.deepStrictEqual(
    unwateredPlants.map((plant) => plant.id),
    ['plant_d', 'plant_c'],
  )

  // 上次浇水时间相同时,按植物名称升序排序;全部植物都未浇水时同样按名称排序
  const tiePlants = buildPlantList([
    makePlant({ id: 'plant_e', name: 'B植物', lastWater: '2026-08-10', records: [{ id: 'r6', type: 'water', time: '2026-08-10' }] }),
    makePlant({ id: 'plant_f', name: 'A植物', lastWater: '2026-08-10', records: [{ id: 'r7', type: 'water', time: '2026-08-10' }] }),
    makePlant({ id: 'plant_g', name: 'C植物' }),
    makePlant({ id: 'plant_h', name: 'D植物' }),
  ])

  assert.deepStrictEqual(
    tiePlants.map((plant) => plant.id),
    ['plant_f', 'plant_e', 'plant_g', 'plant_h'],
  )
}

run().catch((error) => {
  console.error(error)
  process.exit(1)
})
