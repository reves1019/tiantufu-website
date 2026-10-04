/** PostgreSQL timestamps retain microseconds; Date.parse alone loses them. */
export function compareCloudVersions(a: string, b: string): number {
  const micros = (value: string): bigint | null => {
    const ms = Date.parse(value)
    if (!Number.isFinite(ms)) return null
    const fraction = value.match(/\.(\d+)/)?.[1] ?? ''
    return BigInt(ms) * 1000n + BigInt(fraction.slice(3, 6).padEnd(3, '0'))
  }
  const left = micros(a), right = micros(b)
  if (left === null || right === null) return 0
  return left < right ? -1 : left > right ? 1 : 0
}

export function isCurrentCloudSave(currentJson: string, submittedJson: string, savedVersion: string, newestVersion: string): boolean {
  return currentJson === submittedJson && Number.isFinite(Date.parse(savedVersion)) &&
    Number.isFinite(Date.parse(newestVersion)) && compareCloudVersions(savedVersion, newestVersion) >= 0
}

/** Receive decisions are shared by initial fetch, reconnect and Realtime. */
export function classifyCloudSnapshot(input: {
  currentJson: string; incomingJson: string; dirty: boolean; savingJson: string | null
  incomingVersion: string; baseVersion: string; newestVersion: string
}): 'stale' | 'own-echo' | 'same-base' | 'conflict' | 'accept' {
  if (compareCloudVersions(input.incomingVersion, input.newestVersion) < 0) return 'stale'
  if (!input.dirty || input.currentJson === input.incomingJson) return 'accept'
  if (input.incomingJson === input.savingJson) return 'own-echo'
  if (input.incomingVersion === input.baseVersion) return 'same-base'
  return 'conflict'
}
