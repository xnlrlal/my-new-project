export type Zone = 'center' | 'north' | 'east' | 'south' | 'west';
export type ArmZone = 'north' | 'east' | 'south' | 'west';

export type CellId = string;

const RING_SIZE = 8;

// 8 angular slots around each ring: N, NE, E, SE, S, SW, W, NW
const COMPASS_LABEL = ['북쪽', '북동쪽', '동쪽', '남동쪽', '남쪽', '남서쪽', '서쪽', '북서쪽'];

const PORTAL_INDEX: Record<ArmZone, number> = { north: 0, east: 2, south: 4, west: 6 };

function zoneForIndex(idx: number): ArmZone {
  if (idx === 0 || idx === 1) return 'north';
  if (idx === 2 || idx === 3) return 'east';
  if (idx === 4 || idx === 5) return 'south';
  return 'west';
}

function ring1Id(i: number): CellId {
  return `ring1-${((i % RING_SIZE) + RING_SIZE) % RING_SIZE}`;
}

function ring2Id(i: number): CellId {
  return `ring2-${((i % RING_SIZE) + RING_SIZE) % RING_SIZE}`;
}

export interface DungeonCell {
  id: CellId;
  ring: 0 | 1 | 2;
  index: number;
  open: Set<CellId>;
  zone: Zone;
  portal: ArmZone | null;
}

export interface DungeonMaze {
  cells: Map<CellId, DungeonCell>;
  portalsFound: Set<ArmZone>;
  themeZone: ArmZone | null;
}

function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

class UnionFind {
  private parent = new Map<CellId, CellId>();

  private find(x: CellId): CellId {
    const p = this.parent.get(x) ?? x;
    if (p === x) {
      this.parent.set(x, x);
      return x;
    }
    const root = this.find(p);
    this.parent.set(x, root);
    return root;
  }

  union(a: CellId, b: CellId): void {
    const ra = this.find(a);
    const rb = this.find(b);
    if (ra !== rb) this.parent.set(ra, rb);
  }

  connected(a: CellId, b: CellId): boolean {
    return this.find(a) === this.find(b);
  }
}

function connect(cells: Map<CellId, DungeonCell>, a: CellId, b: CellId): void {
  cells.get(a)!.open.add(b);
  cells.get(b)!.open.add(a);
}

export function generateMaze(themeZone: ArmZone | null): DungeonMaze {
  const cells = new Map<CellId, DungeonCell>();

  cells.set('center', { id: 'center', ring: 0, index: -1, open: new Set(), zone: 'center', portal: null });
  for (let i = 0; i < RING_SIZE; i++) {
    cells.set(ring1Id(i), { id: ring1Id(i), ring: 1, index: i, open: new Set(), zone: themeZone ?? zoneForIndex(i), portal: null });
  }
  for (let i = 0; i < RING_SIZE; i++) {
    const portal = (Object.keys(PORTAL_INDEX) as ArmZone[]).find((z) => PORTAL_INDEX[z] === i) ?? null;
    cells.set(ring2Id(i), { id: ring2Id(i), ring: 2, index: i, open: new Set(), zone: themeZone ?? zoneForIndex(i), portal });
  }

  const uf = new UnionFind();

  // The outer ring (가장자리) is always a fully open loop, so every cell on
  // it — including all 4 portals — is directly reachable from its neighbors
  // with no dead ends, no matter how the inward maze turns out.
  for (let i = 0; i < RING_SIZE; i++) {
    connect(cells, ring2Id(i), ring2Id(i + 1));
    uf.union(ring2Id(i), ring2Id(i + 1));
  }

  // Randomized Kruskal's algorithm over the remaining candidate passages
  // (center<->ring1 spokes, ring1<->ring2 spokes, ring1 circumferential)
  // connects the center and inner ring into the already-unified outer loop.
  // Only as many edges as needed to reach full connectivity get opened, so
  // this branch of the maze still produces genuine dead ends.
  const candidates: [CellId, CellId][] = [];
  for (let i = 0; i < RING_SIZE; i++) {
    candidates.push(['center', ring1Id(i)]);
    candidates.push([ring1Id(i), ring2Id(i)]);
    candidates.push([ring1Id(i), ring1Id(i + 1)]);
  }

  for (const [a, b] of shuffle(candidates)) {
    if (!uf.connected(a, b)) {
      uf.union(a, b);
      connect(cells, a, b);
    }
  }

  return { cells, portalsFound: new Set(), themeZone };
}

export function cellAt(maze: DungeonMaze, id: CellId): DungeonCell {
  const cell = maze.cells.get(id);
  if (!cell) throw new Error(`No cell with id ${id}`);
  return cell;
}

export function randomStartPosition(): CellId {
  const candidates: CellId[] = ['center'];
  for (let i = 0; i < RING_SIZE; i++) candidates.push(ring1Id(i));
  return candidates[Math.floor(Math.random() * candidates.length)];
}

export const BASE_BATTLE_CHANCE = 0.55;

export function rollBattle(chance: number): boolean {
  return Math.random() < chance;
}

function cellLabel(cell: DungeonCell): string {
  if (cell.id === 'center') return '중심부';
  const compass = COMPASS_LABEL[cell.index];
  if (cell.portal) return `${compass} 포탈`;
  return cell.ring === 1 ? `${compass} (중간 고리)` : `${compass} (가장자리)`;
}

export interface DungeonMove {
  label: string;
  next: CellId;
  battleChance: number;
}

export function availableMoves(maze: DungeonMaze, pos: CellId): DungeonMove[] {
  const cell = cellAt(maze, pos);
  return [...cell.open].map((neighborId) => {
    const neighbor = cellAt(maze, neighborId);
    const battleChance = neighbor.portal ? 0 : BASE_BATTLE_CHANCE;
    const chanceLabel = neighbor.portal ? '전투 없음' : `전투 확률 ${Math.round(BASE_BATTLE_CHANCE * 100)}%`;
    return {
      label: `${cellLabel(neighbor)}로 이동 · ${chanceLabel}`,
      next: neighborId,
      battleChance,
    };
  });
}

export function zoneLabel(zone: Zone): string {
  switch (zone) {
    case 'center':
      return '중심부';
    case 'north':
      return '북쪽 구역';
    case 'east':
      return '동쪽 구역';
    case 'south':
      return '남쪽 구역';
    case 'west':
      return '서쪽 구역';
  }
}

export function zoneFlavor(zone: Zone): string {
  switch (zone) {
    case 'center':
      return '미궁의 중심부. 사방에서 몰려온 것들의 기척이 뒤섞여 있다.';
    case 'north':
      return '서늘한 냉기가 감도는 언데드의 영역.';
    case 'east':
      return '야생 짐승들의 서식지.';
    case 'south':
      return '도적과 몬스터들이 숨어있는 소굴.';
    case 'west':
      return '뜨거운 열기가 느껴지는 위험한 지역.';
  }
}
