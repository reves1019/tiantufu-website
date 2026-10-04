import assert from 'node:assert/strict'
import {
  accountPresets,
  authenticateAccount,
  exportMemberAccountMetadata,
  filterEditableProfilePatch,
  mergeMemberAccountMetadata,
  reconcilePresetAdmins,
  registerMemberAccount,
  sha256,
  validateMemberRegistration,
} from '../src/lib/accounts.ts'
import { attachApprovedMember, makeApprovedMemberCard } from '../src/lib/memberFactory.ts'
import { File as NodeFile } from 'node:buffer'
import { uploadImage } from '../src/lib/imageUpload.ts'

function memoryStorage() {
  const values = new Map()
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
  }
}

globalThis.localStorage = memoryStorage()
globalThis.sessionStorage = memoryStorage()

const seeded = await reconcilePresetAdmins([])
assert.equal(seeded.filter((account) => account.role === 'admin').length, 3)
assert.deepEqual(
  new Set(seeded.map((account) => account.username)),
  new Set(accountPresets.map((preset) => preset.username)),
)

const partialSeed = await reconcilePresetAdmins(seeded.slice(0, 1))
assert.equal(partialSeed.filter((account) => account.role === 'admin').length, 3)
assert.equal(partialSeed.find((account) => account.id === seeded[0].id).passwordHash, seeded[0].passwordHash)

const registration = await registerMemberAccount(seeded, 'cartographer1', '制图成员', 'member-pass')
assert.equal(registration.ok, true)
assert.equal(registration.account.role, 'member')
assert.equal(registration.account.status, 'pending')
assert.equal(validateMemberRegistration('a', '制图成员', 'long-enough-password', 8), '用户名需为 2-24 位中英文/数字/下划线/连字符')
assert.equal(validateMemberRegistration('valid-name', '  ', 'long-enough-password', 8), '请填写你想展示的昵称')
assert.equal(validateMemberRegistration('valid-name', '制图成员', 'short', 8), '密码至少 8 位')
assert.equal(validateMemberRegistration('valid-name', '制图成员', 'valid-pass-123', 8), null)
assert.equal((await registerMemberAccount(seeded, 'reves', '冒用管理员名', 'member-pass')).ok, false)
assert.deepEqual(
  (await authenticateAccount([...seeded, registration.account], 'cartographer1', 'member-pass', false)).error,
  'pending',
)
const approved = { ...registration.account, status: 'approved', memberId: 'member-cartographer1' }
assert.equal((await authenticateAccount([...seeded, approved], 'cartographer1', 'member-pass', false)).ok, true)
assert.deepEqual(
  filterEditableProfilePatch('member', { displayName: '新昵称', bio: '新简介', avatar: '/avatar.png', topic: 'privilege-escalation' }),
  { displayName: '新昵称', bio: '新简介', avatar: '/avatar.png' },
)
assert.equal(filterEditableProfilePatch('admin', { topic: 'zhengshi' }).topic, 'zhengshi')

const approvedCard = makeApprovedMemberCard(approved, 'zhengshi', '/fallback-avatar.png', '/fallback-work.png')
assert.equal(approvedCard.id, `member-${approved.id}`)
assert.equal(approvedCard.name, '制图成员')
assert.equal(approvedCard.avatar, '/fallback-avatar.png')
const attached = attachApprovedMember([], [], approvedCard, 'zhengshi')
assert.equal(attached.members.length, 1)
assert.equal(attached.worksArchive.length, 1)
assert.equal(attached.worksArchive[0].id, `wa-${approvedCard.id}`)
const attachedAgain = attachApprovedMember(attached.members, attached.worksArchive, approvedCard, 'zhengshi')
assert.equal(attachedAgain.members.length, 1)
assert.equal(attachedAgain.worksArchive.length, 1)

const legacySalt = 'legacy-salt'
const legacyAdmin = {
  id: 'old-extra-admin',
  username: 'old-admin',
  displayName: '旧管理员',
  role: 'admin',
  status: 'approved',
  salt: legacySalt,
  passwordHash: await sha256(`${legacySalt}:old-password`),
  createdAt: 1,
  updatedAt: 1,
}
const migrated = await reconcilePresetAdmins([...seeded, legacyAdmin])
assert.equal(migrated.filter((account) => account.role === 'admin').length, 3)
assert.equal(migrated.some((account) => account.id === legacyAdmin.id), false)
assert.equal((await authenticateAccount(migrated, 'old-admin', 'old-password', false)).ok, true)

const memberForExport = { ...approved, salt: 'member-salt', passwordHash: 'private-hash' }
const exported = JSON.parse(exportMemberAccountMetadata([...seeded, memberForExport]))
assert.equal(exported.length, 1)
assert.equal(exported[0].role, 'member')
assert.equal(exported[0].salt, '')
assert.equal(exported[0].passwordHash, '')

const existingMember = { ...memberForExport, displayName: '旧昵称' }
const merged = mergeMemberAccountMetadata([...seeded, existingMember], JSON.stringify(exported), new Set([approved.memberId]))
assert.equal(merged.ok, true)
assert.equal(merged.accounts.find((account) => account.id === approved.id).salt, 'member-salt')
assert.equal(merged.accounts.find((account) => account.id === approved.id).passwordHash, 'private-hash')
assert.equal(merged.accounts.find((account) => account.id === approved.id).status, 'approved')

const imported = mergeMemberAccountMetadata(seeded, JSON.stringify(exported))
assert.equal(imported.ok, true)
assert.equal(imported.accounts.find((account) => account.id === approved.id).status, 'pending')
const forgedAdmin = mergeMemberAccountMetadata(seeded, JSON.stringify([
  { id: 'forged-admin', username: 'forged-admin', role: 'admin', status: 'approved', salt: 'x', passwordHash: 'x' },
]))
assert.equal(forgedAdmin.ok, false)
assert.equal(seeded.filter((account) => account.role === 'admin').length, 3)

// 验证不支持静态目录写入时的小图 Base64 回退，以及非图像拒绝。
globalThis.indexedDB = undefined
globalThis.window = {}
globalThis.FileReader = class {
  readAsDataURL(file) {
    file.arrayBuffer().then((buffer) => {
      this.result = `data:${file.type};base64,${Buffer.from(buffer).toString('base64')}`
      this.onload?.()
    }, (error) => this.onerror?.(error))
  }
}
const imageRef = await uploadImage(new NodeFile([new Uint8Array([137, 80, 78, 71])], 'tiny.png', { type: 'image/png' }))
assert.equal(imageRef.mode, 'dataurl')
assert.match(imageRef.ref, /^data:image\/png;base64,/)
await assert.rejects(
  uploadImage(new NodeFile(['not an image'], 'notes.txt', { type: 'text/plain' })),
  /请选择 PNG/,
)

console.log('Regression checks passed: three admins, member registration/approval, own-profile permissions, member page+portfolio creation, legacy alias, safe import/export, credential preservation, and image fallback validation.')
