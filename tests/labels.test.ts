import { describe, expect, it } from 'vitest'
import { layoutLabels, type LabelItem } from '../src/lib/games/labels'

const CW = 11
const rectOf = (i: LabelItem, s: { x: number; y: number; anchor: string }) => {
  const w = i.name.length * CW
  const x0 = s.anchor === 'start' ? s.x : s.anchor === 'end' ? s.x - w : s.x - w / 2
  return { x0, x1: x0 + w, y0: s.y - 11, y1: s.y + 11 }
}
const hit = (a: ReturnType<typeof rectOf>, b: ReturnType<typeof rectOf>) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1

describe('layoutLabels', () => {
  it('puts a lone label to the right of its marker', () => {
    const s = layoutLabels([{ id: 'a', x: 100, y: 100, name: 'Paris', gap: 13 }], 620, 620, CW)
    expect(s.a).toEqual({ x: 113, y: 100, anchor: 'start' })
  })

  it('flips left near the right edge and stays inside the map', () => {
    const s = layoutLabels([{ id: 'a', x: 600, y: 100, name: 'Strasbourg', gap: 13 }], 620, 620, CW)
    expect(s.a.anchor).toBe('end')
  })

  it('keeps labels of close markers from overlapping each other', () => {
    const items: LabelItem[] = [
      { id: 'a', x: 300, y: 300, name: 'Le Mont-Saint-Michel', gap: 13 },
      { id: 'b', x: 325, y: 306, name: 'Saint-Malo', gap: 13 },
      { id: 'c', x: 290, y: 322, name: 'Rennes', gap: 13 },
    ]
    const s = layoutLabels(items, 620, 620, CW)
    const rects = items.map((i) => rectOf(i, s[i.id]))
    for (let i = 0; i < rects.length; i++) for (let j = i + 1; j < rects.length; j++) expect(hit(rects[i], rects[j]), `${items[i].name} / ${items[j].name}`).toBe(false)
  })

  it('does not cover another marker', () => {
    const items: LabelItem[] = [
      { id: 'a', x: 300, y: 300, name: 'Casablanca', gap: 13 },
      { id: 'b', x: 340, y: 300, name: 'Rabat', gap: 13 },
    ]
    const s = layoutLabels(items, 620, 620, CW)
    const a = rectOf(items[0], s.a)
    expect(hit(a, { x0: 328, x1: 352, y0: 288, y1: 312 })).toBe(false)
  })
})
