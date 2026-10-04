import type { Member } from '../config/site'

/** Keep old JSON readable; an explicit empty selection stays empty. */
export function memberDomains(member: Pick<Member, 'domains' | 'topic'>): string[] {
  return [...new Set((member.domains ?? [member.topic]).filter((id) => typeof id === 'string' && id.trim()))]
}

export function safePublicUrl(value?: string): string | null {
  if (!value) return null
  try {
    const url = new URL(value)
    return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password ? url.href : null
  } catch { return null }
}
