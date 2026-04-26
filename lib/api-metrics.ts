let successCount = 0
let errorCount = 0
const WINDOW_SIZE = 10

export function trackApiResult(success: boolean) {
  if (success) {
    successCount++
  } else {
    errorCount++
  }
  const total = successCount + errorCount
  if (total > WINDOW_SIZE * 4) {
    successCount = Math.round((successCount / total) * WINDOW_SIZE)
    errorCount = WINDOW_SIZE - successCount
  }
}

export function getConnectionStatus(): "green" | "amber" | "red" {
  const total = successCount + errorCount
  if (total === 0) return "amber"
  const errorRate = errorCount / total
  if (errorRate === 0) return "green"
  if (errorRate <= 0.3) return "amber"
  return "red"
}
