const DAY_MS = 24 * 60 * 60 * 1000

function padNumber(value) {
  return value > 9 ? `${value}` : `0${value}`
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function formatDate(date = new Date()) {
  return [
    date.getFullYear(),
    padNumber(date.getMonth() + 1),
    padNumber(date.getDate()),
  ].join('-')
}

function parseDate(dateString) {
  if (!dateString) {
    return null
  }

  const [datePart] = `${dateString}`.split(' ')
  const [year, month, day] = datePart.split('-').map(Number)
  return new Date(year, month - 1, day)
}

function formatDisplayDate(dateString) {
  const date = parseDate(dateString)

  if (!date) {
    return ''
  }

  return formatDate(date)
}

function formatRelativeTime(dateString, compareDate = new Date()) {
  const targetDate = parseDate(dateString)

  if (!targetDate) {
    return ''
  }

  const diffDaysCount = diffDays(dateString, compareDate)

  if (diffDaysCount < 0) {
    return '今天'
  }

  if (diffDaysCount === 0) {
    return '今天'
  }

  if (diffDaysCount === 1) {
    return '昨天'
  }

  if (diffDaysCount < 7) {
    return `${diffDaysCount} 天前`
  }

  return formatDisplayDate(dateString)
}

function diffDays(fromDateString, toDate = new Date()) {
  const fromDate = parseDate(fromDateString)

  if (!fromDate) {
    return 0
  }

  const diff = startOfDay(toDate).getTime() - startOfDay(fromDate).getTime()
  return Math.floor(diff / DAY_MS)
}

function isFutureDate(dateString, compareDate = new Date()) {
  const targetDate = parseDate(dateString)

  if (!targetDate) {
    return false
  }

  return startOfDay(targetDate).getTime() > startOfDay(compareDate).getTime()
}

module.exports = {
  diffDays,
  formatDate,
  formatDisplayDate,
  formatRelativeTime,
  isFutureDate,
  parseDate,
}
