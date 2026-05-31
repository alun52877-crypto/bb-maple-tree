const assert = require('assert')
const storage = require('../miniprogram/utils/storage')

function createCollectionMock(data) {
  const calls = []

  const query = {
    orderBy(field, direction) {
      calls.push(['orderBy', field, direction])
      return this
    },
    skip(offset) {
      calls.push(['skip', offset])
      return this
    },
    limit(limit) {
      calls.push(['limit', limit])
      return this
    },
    async get() {
      calls.push(['get'])
      return { data }
    },
  }

  return {
    calls,
    collection: query,
  }
}

async function run() {
  const data = Array.from({ length: 20 }, (_, index) => ({
    _id: `doc_${index}`,
    id: `plant_${index}`,
    name: `Plant ${index}`,
  }))
  const collectionMock = createCollectionMock(data)

  global.wx = {
    getStorageSync() {
      return true
    },
    cloud: {
      database() {
        return {
          collection() {
            return collectionMock.collection
          },
        }
      },
    },
  }

  assert.strictEqual(typeof storage.getPlantsPage, 'function')

  const result = await storage.getPlantsPage({ offset: 20, limit: 20 })

  assert.deepStrictEqual(collectionMock.calls, [
    ['orderBy', 'updatedAt', 'desc'],
    ['skip', 20],
    ['limit', 20],
    ['get'],
  ])
  assert.strictEqual(result.hasMore, true)
  assert.strictEqual(result.plants.length, 20)
  assert.strictEqual(result.plants[0]._id, undefined)
}

run().catch((error) => {
  console.error(error)
  process.exit(1)
})
