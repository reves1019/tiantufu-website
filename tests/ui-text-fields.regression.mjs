import assert from 'node:assert/strict'
import { flattenUiTextFields } from '../src/lib/uiTextFields.ts'

const fields = flattenUiTextFields(
  {
    heading: '关键词目录',
    typeLabels: { page: '页面', member: '成员' },
    ignored: ['不是单条文案'],
  },
  'ui.search',
)

assert.deepEqual(fields, [
  { path: 'ui.search.heading', label: 'heading', value: '关键词目录' },
  { path: 'ui.search.typeLabels.page', label: 'typeLabels.page', value: '页面' },
  { path: 'ui.search.typeLabels.member', label: 'typeLabels.member', value: '成员' },
])
console.log('UI text regression checks passed: nested strings map to editable paths and non-text values are ignored.')
