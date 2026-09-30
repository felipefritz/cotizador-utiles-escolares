import type { SelectedItem } from '../types'

/**
 * Reglas de selección de ítems frente al límite del plan.
 *
 * `maxItems === null` significa sin límite (visitante sin cuenta, plan
 * ilimitado o planes desactivados). Antes el componente representaba "sin
 * límite" como `items.length`: con todos los ítems marcados parecía que se
 * había llegado al tope, y al agregar uno nuevo se desmarcaba otro.
 */

export function isSelectable(row: SelectedItem): boolean {
  return row.item.tipo !== 'lectura'
}

export function countSelected(items: SelectedItem[]): number {
  return items.filter((row) => row.selected && isSelectable(row)).length
}

export function isAtLimit(selectedCount: number, maxItems: number | null): boolean {
  return maxItems !== null && selectedCount >= maxItems
}

/** Cuántos ítems quedan marcados cuando el usuario pide "todos". */
export function selectAllTarget(items: SelectedItem[], maxItems: number | null): number {
  const selectable = items.filter(isSelectable).length
  return maxItems === null ? selectable : Math.min(maxItems, selectable)
}

/**
 * Agrega un ítem marcado. Si el plan ya está en su tope, se desmarca el ítem
 * marcado más reciente para dejarle lugar al nuevo.
 */
export function appendItem(
  items: SelectedItem[],
  nextItem: SelectedItem,
  maxItems: number | null,
): { items: SelectedItem[]; deselected: boolean } {
  const next = [...items]
  let deselected = false
  if (maxItems !== null && maxItems > 0 && countSelected(items) >= maxItems) {
    for (let i = next.length - 1; i >= 0; i -= 1) {
      if (next[i].selected && isSelectable(next[i])) {
        next[i] = { ...next[i], selected: false }
        deselected = true
        break
      }
    }
  }
  const selected = maxItems === null || maxItems > 0
  return { items: [...next, { ...nextItem, selected }], deselected }
}

/** Marca hasta completar el límite, contando los que ya estaban marcados. */
export function selectUpToLimit(items: SelectedItem[], maxItems: number | null): SelectedItem[] {
  let count = countSelected(items)
  return items.map((row) => {
    if (!isSelectable(row) || row.selected) return row
    if (maxItems !== null && count >= maxItems) return row
    count += 1
    return { ...row, selected: true }
  })
}

/** Desmarca lo que excede el límite, conservando los primeros. */
export function trimToLimit(items: SelectedItem[], maxItems: number | null): SelectedItem[] {
  if (maxItems === null) return items
  let count = 0
  return items.map((row) => {
    if (!row.selected || !isSelectable(row)) return row
    count += 1
    return count > maxItems ? { ...row, selected: false } : row
  })
}
