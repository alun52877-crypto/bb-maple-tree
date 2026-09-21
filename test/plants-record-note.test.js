const assert = require('assert')
const {
  buildPlantList,
  createRecord,
  decoratePlant,
  getRecordClass,
  getRecordLabel,
} = require('../miniprogram/utils/plants')

async function run() {
  // 施肥灌根进入 label/class 映射,不再落到"养护"/water 兜底
  assert.strictEqual(getRecordLabel('rootFertilize'), '施肥灌根')
  assert.strictEqual(getRecordClass('rootFertilize'), 'root-fertilize')

  // createRecord:备注 trim 后非空才写入 note 字段;未传或空白备注不产生该字段
  const withNote = createRecord('rootFertilize', '2026-09-21', '  花多多 1 号 1:1000  ')
  assert.strictEqual(withNote.type, 'rootFertilize')
  assert.strictEqual(withNote.time, '2026-09-21')
  assert.strictEqual(withNote.note, '花多多 1 号 1:1000')

  assert.ok(!('note' in createRecord('rootFertilize', '2026-09-21')))
  assert.ok(!('note' in createRecord('rootFertilize', '2026-09-21', '   ')))
  assert.ok(!('note' in createRecord('water', '2026-09-21')))

  // 时光轴条目透传备注;存量记录缺失 note 字段时条目上不出现 note(字段缺失=无备注)
  const decorated = decoratePlant({
    id: 'plant_a',
    name: 'A植物',
    lastWater: '2026-09-01',
    records: [
      { id: 'r1', type: 'rootFertilize', time: '2026-09-21', note: '花多多 1 号' },
      { id: 'r2', type: 'water', time: '2026-09-01' },
    ],
  })

  assert.strictEqual(decorated.recordTimeline[0].id, 'r1')
  assert.strictEqual(decorated.recordTimeline[0].note, '花多多 1 号')
  assert.strictEqual(decorated.recordTimeline[0].label, '施肥灌根')
  assert.strictEqual(decorated.recordTimeline[0].typeClass, 'root-fertilize')
  assert.ok(!('note' in decorated.recordTimeline[1]))

  // 施肥灌根不影响"上次浇水时间"与主页排序,但按定义成为"最近养护";摘要不带备注
  const plants = buildPlantList([
    {
      id: 'plant_a',
      name: 'A植物',
      lastWater: '2026-08-01',
      records: [
        { id: 'r1', type: 'rootFertilize', time: '2026-08-21', note: '花多多 1 号' },
        { id: 'r2', type: 'water', time: '2026-08-01' },
      ],
    },
    {
      id: 'plant_b',
      name: 'B植物',
      lastWater: '2026-08-10',
      records: [{ id: 'r3', type: 'water', time: '2026-08-10' }],
    },
  ])

  assert.deepStrictEqual(
    plants.map((plant) => plant.id),
    ['plant_b', 'plant_a'],
  )

  const fertilizedPlant = plants[1]
  assert.strictEqual(fertilizedPlant.lastWater, '2026-08-01')
  assert.strictEqual(fertilizedPlant.latestRecordLabel, '施肥灌根')
  assert.ok(fertilizedPlant.heroStatus.includes('施肥灌根'))
  assert.ok(!fertilizedPlant.heroStatus.includes('花多多'))
}

run().catch((error) => {
  console.error(error)
  process.exit(1)
})
