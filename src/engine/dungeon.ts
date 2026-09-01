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

// 고블린 필드 함정(남쪽 구역 전용, 1층 한정 — generateMaze의 allowTraps 참고).
// 저 멀리서도 눈치챌 수 있는 함정이라, 이동할 때마다 새로 굴리는 게 아니라
// 미궁 생성 시점에 그 칸의 고정 속성으로 확정된다. 2D 탑다운 전환 시에도
// 이 필드 하나로 타일 위 시각 표시를 대체할 수 있도록 순수 데이터로만 둔다.
export type TrapType = 'goblin';

export interface DungeonCell {
  id: CellId;
  ring: 0 | 1 | 2;
  index: number;
  open: Set<CellId>;
  zone: Zone;
  portal: ArmZone | null;
  trap: TrapType | null;
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

export interface SerializedDungeonCell {
  id: CellId;
  ring: 0 | 1 | 2;
  index: number;
  open: CellId[];
  zone: Zone;
  portal: ArmZone | null;
  trap: TrapType | null;
}

export interface SerializedDungeonMaze {
  cells: SerializedDungeonCell[];
  portalsFound: ArmZone[];
  themeZone: ArmZone | null;
}

export function serializeMaze(maze: DungeonMaze): SerializedDungeonMaze {
  return {
    cells: [...maze.cells.values()].map((cell) => ({ ...cell, open: [...cell.open] })),
    portalsFound: [...maze.portalsFound],
    themeZone: maze.themeZone,
  };
}

export function deserializeMaze(serialized: SerializedDungeonMaze): DungeonMaze {
  return {
    cells: new Map(serialized.cells.map((cell) => [cell.id, { ...cell, open: new Set(cell.open) }])),
    portalsFound: new Set(serialized.portalsFound),
    themeZone: serialized.themeZone,
  };
}

// 남쪽 구역(고블린 서식지)의 포탈이 아닌 칸마다 이 확률로 함정이 고정 배치됨
// — allowTraps=true(1층 진입)일 때만. 2층은 애초에 9등급(고블린)이 절대
// 등장하지 않는 목표 등급 분포라(rollTargetGrade 참고) 대상에서 제외한다.
const GOBLIN_TRAP_CHANCE = 0.25;

export function generateMaze(themeZone: ArmZone | null, allowTraps = false): DungeonMaze {
  const cells = new Map<CellId, DungeonCell>();

  const rollTrap = (zone: Zone, portal: ArmZone | null): TrapType | null =>
    allowTraps && zone === 'south' && !portal && Math.random() < GOBLIN_TRAP_CHANCE ? 'goblin' : null;

  cells.set('center', { id: 'center', ring: 0, index: -1, open: new Set(), zone: 'center', portal: null, trap: null });
  for (let i = 0; i < RING_SIZE; i++) {
    const zone = themeZone ?? zoneForIndex(i);
    cells.set(ring1Id(i), { id: ring1Id(i), ring: 1, index: i, open: new Set(), zone, portal: null, trap: rollTrap(zone, null) });
  }
  for (let i = 0; i < RING_SIZE; i++) {
    const zone = themeZone ?? zoneForIndex(i);
    const portal = (Object.keys(PORTAL_INDEX) as ArmZone[]).find((z) => PORTAL_INDEX[z] === i) ?? null;
    cells.set(ring2Id(i), { id: ring2Id(i), ring: 2, index: i, open: new Set(), zone, portal, trap: rollTrap(zone, portal) });
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
  // 함정이 있는 칸으로의 이동만 'trigger'(밟는다)/'avoid'(우회한다) 두 개의
  // 별도 선택지로 나뉜다 — 그 외 모든 이동은 null(기존과 동일한 단일 선택지).
  trapChoice: 'trigger' | 'avoid' | null;
}

export function availableMoves(maze: DungeonMaze, pos: CellId): DungeonMove[] {
  const cell = cellAt(maze, pos);
  return [...cell.open].flatMap((neighborId): DungeonMove[] => {
    const neighbor = cellAt(maze, neighborId);
    const battleChance = neighbor.portal ? 0 : BASE_BATTLE_CHANCE;
    const chanceLabel = neighbor.portal ? '전투 없음' : `전투 확률 ${Math.round(BASE_BATTLE_CHANCE * 100)}%`;

    if (neighbor.trap) {
      const label = cellLabel(neighbor);
      return [
        { label: `${label} (고블린 덫 감지) · 덫을 밟고 이동 · 전투 없음, 출혈`, next: neighborId, battleChance: 0, trapChoice: 'trigger' },
        { label: `${label} (고블린 덫 감지) · 우회해서 이동 · 기습당할 수 있음`, next: neighborId, battleChance: 1, trapChoice: 'avoid' },
      ];
    }

    return [{ label: `${cellLabel(neighbor)}로 이동 · ${chanceLabel}`, next: neighborId, battleChance, trapChoice: null }];
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

// 디자인 노트(designnotes.md 4-3번)의 1층/2층 로스터에 맞춰 정리한 구역
// 설명 — 예전 문구(북=언데드, 서=화염/마법)는 옛 24종 로스터 기준이라
// 지금 몬스터(monsters.ts)와 맞지 않아 전부 다시 씀.
export function zoneFlavor(zone: Zone): string {
  switch (zone) {
    case 'center':
      return '미궁의 중심부. 사방에서 몰려온 것들의 기척이 뒤섞여 있다.';
    case 'north':
      return '땅을 파고 사는 노움들의 영역. 더 깊은 곳은 고블린 숲으로 이어진다.';
    case 'east':
      return '야생 짐승들의 서식지.';
    case 'south':
      return '고블린들이 숨어있는 소굴. 더 깊은 곳은 검은 바위산으로 이어진다.';
    case 'west':
      return '썩은 내가 진동하는 구울들의 영역. 더 깊은 곳은 망자의 땅으로 이어진다.';
  }
}
