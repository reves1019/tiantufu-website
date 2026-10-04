export interface UiTextField {
  path: string
  label: string
  value: string
}

/** Flatten nested UI-copy objects into editable string paths for Content Manager. */
export function flattenUiTextFields(value: unknown, path: string): UiTextField[] {
  if (typeof value === 'string') {
    return [{ path, label: path.split('.').slice(2).join('.'), value }]
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) return []
  return Object.entries(value).flatMap(([key, child]) => flattenUiTextFields(child, `${path}.${key}`))
}
