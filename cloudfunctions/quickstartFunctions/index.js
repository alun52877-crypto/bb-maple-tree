const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
})

const db = cloud.database()

exports.main = async (event) => {
  const {
    action,
    collection = 'plants',
    data,
    id,
  } = event

  try {
    const targetCollection = db.collection(collection)

    if (action === 'add') {
      const result = await targetCollection.add({ data })
      return {
        success: true,
        data: result,
      }
    }

    if (action === 'updateById') {
      const result = await targetCollection.where({ id }).update({ data })

      if (!result.stats || !result.stats.updated) {
        return {
          success: false,
          message: '植物不存在',
        }
      }
      return {
        success: true,
        data: result,
      }
    }

    if (action === 'removeById') {
      const result = await targetCollection.where({ id }).remove()

      if (!result.stats || !result.stats.removed) {
        return {
          success: true,
          data: null,
        }
      }
      return {
        success: true,
        data: result,
      }
    }

    return {
      success: false,
      message: '不支持的操作',
    }
  } catch (error) {
    return {
      success: false,
      message: error.message || '云函数执行失败',
      stack: error.stack || '',
    }
  }
}
