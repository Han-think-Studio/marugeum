import { Rng } from '../core/rng';
import { OBJECT_LABEL, type GameState, type MapNode, type SceneObject } from '../core/types';
import { BODY_NAMES, PLACE_OBJECTS } from '../data/objects';
import type { FixedObject } from '../data/places';

// 자리에 사물을 놓는다. 지도를 만들 때 한 번
export function spawnObjects(rng: Rng, node: MapNode, nextId: () => number, fixed: FixedObject[] = []): void {
  const spec = PLACE_OBJECTS[node.kind];
  const anchors = [...spec.anchors];
  const used = new Set<string>();
  // 자리에 정해진 사물부터. 보이는 채로 놓인다
  for (const f of fixed) {
    if (anchors.length === 0) break;
    const kind = Array.isArray(f) ? f[0] : f;
    const name = Array.isArray(f) ? f[1] : OBJECT_LABEL[kind];
    used.add(kind);
    const a = anchors.splice(rng.int(0, anchors.length - 1), 1)[0];
    node.objects.push({ id: nextId(), kind, x: a[0] + rng.range(-0.03, 0.03), y: a[1] + rng.range(-0.02, 0.02), hidden: false, used: false, usedDay: 0, name });
  }
  const n = Math.max(0, rng.int(spec.count[0], spec.count[1]) - fixed.length);
  for (let i = 0; i < n && anchors.length > 0; i++) {
    const total = spec.pool.reduce((a, o) => a + o.weight, 0);
    let r = rng.next() * total;
    let pick = spec.pool[spec.pool.length - 1];
    for (const o of spec.pool) {
      r -= o.weight;
      if (r <= 0) { pick = o; break; }
    }
    if (used.has(pick.kind) && pick.kind !== 'car' && pick.kind !== 'body') continue;
    used.add(pick.kind);
    const a = anchors.splice(rng.int(0, anchors.length - 1), 1)[0];
    node.objects.push({
      id: nextId(),
      kind: pick.kind,
      x: a[0] + rng.range(-0.03, 0.03),
      y: a[1] + rng.range(-0.02, 0.02),
      hidden: !!pick.hidden,
      used: false,
      usedDay: 0,
      name: pick.kind === 'body' ? rng.pick(BODY_NAMES) : OBJECT_LABEL[pick.kind],
    });
  }
}

// 지금 보이는 사물. 숨은 것은 둘러본 뒤에만
export function visibleObjects(node: MapNode): SceneObject[] {
  return node.objects.filter((o) => !o.hidden || node.looked);
}

export function hiddenCount(node: MapNode): number {
  return node.objects.filter((o) => o.hidden && !node.looked).length;
}

// 되돌아오는 사물(물가, 풀밭)은 며칠 지나면 다시 쓸 수 있다
export function refreshObjects(state: GameState): void {
  for (const n of state.nodes) {
    for (const o of n.objects) {
      const spec = PLACE_OBJECTS[n.kind].pool.find((p) => p.kind === o.kind);
      if (o.used && spec?.reusableDays && state.day - o.usedDay >= spec.reusableDays) o.used = false;
    }
  }
}

export function objectLabel(o: SceneObject): string {
  return o.kind === 'body' ? `쓰러진 사람` : OBJECT_LABEL[o.kind];
}
