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

function ringId(ring: number, i: number): CellId {
  return `ring${ring}-${((i % RING_SIZE) + RING_SIZE) % RING_SIZE}`;
}

// 고블린 필드 함정(남쪽 구역 전용, 1층 한정 — generateMaze의 allowTraps 참고).
// 저 멀리서도 눈치챌 수 있는 함정이라, 이동할 때마다 새로 굴리는 게 아니라
// 미궁 생성 시점에 그 칸의 고정 속성으로 확정된다. 2D 탑다운 전환 시에도
// 이 필드 하나로 타일 위 시각 표시를 대체할 수 있도록 순수 데이터로만 둔다.
// "덫이 있다" = 그 칸에 고블린이 실제로 숨어있다는 뜻 — 접근하면 반드시
// 기습당한다(availableMoves 참고). 그 전투를 이기면 main.ts가
// resolveTrap()으로 이 필드를 지워, 같은 칸을 다시 지나가도 더는 아무
// 일도 일어나지 않는다(그 고블린은 이미 죽었으므로).
export type TrapType = 'goblin';

// 2D 탑다운 전환(designnotes.md 1번 원칙 "데이터와 표시를 분리")을 대비한
// 좌표 필드 — 지금의 그래프 구조(open으로 연결된 인접 칸) 자체는 이동
// 가능 여부의 유일한 근거로 계속 남고, pos는 오직 "이 칸을 화면 어디에
// 그릴지"를 위한 부가 데이터일 뿐이다. 지금 버튼 UI는 이 필드를 전혀
// 읽지 않으므로 기존 동작에 영향 없음 — 나중에 실제 타일맵/좌표 기반
// 미궁 생성으로 옮겨갈 때 이 필드를 그대로 대체하면 그래프(open) 쪽 로직은
// 손댈 필요가 없다는 게 핵심 의도.
export interface CellPosition {
  x: number;
  y: number;
}

export interface DungeonCell {
  id: CellId;
  ring: number; // 0=중심부, 1..ringCount=바깥으로 갈수록 증가, ringCount가 가장자리(포탈) 링
  index: number;
  open: Set<CellId>;
  zone: Zone;
  portal: ArmZone | null;
  trap: TrapType | null;
  pos: CellPosition;
}

export interface DungeonMaze {
  cells: Map<CellId, DungeonCell>;
  portalsFound: Set<ArmZone>;
  themeZone: ArmZone | null;
  // 링 개수(중심부 제외) — floor 1은 FLOOR1_RING_COUNT(3), floor 2는 기본값
  // 2. cellLabel/미니맵(ui/dungeon-minimap.ts)이 "이 링이 가장자리인가"를
  // 판단하는 데 쓴다.
  ringCount: number;
  // 실제로 발을 들인 칸의 집합 — 미니맵이 "대략적으로 파악 가능"한 수준만
  // 보여주기 위한 탐험 기록. portalsFound(보상 지급 여부)와는 별개 개념.
  // 1층은 이제 profile.floor1MazeTemplate로 영구 보관되므로, 이 기록도
  // 캐릭터가 살아있는 한 함께 유지된다(같은 곳을 다시 가면 이미 가본 곳으로
  // 표시).
  visited: Set<CellId>;
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
  ring: number;
  index: number;
  open: CellId[];
  zone: Zone;
  portal: ArmZone | null;
  trap: TrapType | null;
  pos: CellPosition;
}

export interface SerializedDungeonMaze {
  cells: SerializedDungeonCell[];
  portalsFound: ArmZone[];
  themeZone: ArmZone | null;
  ringCount: number;
  visited: CellId[];
}

export function serializeMaze(maze: DungeonMaze): SerializedDungeonMaze {
  return {
    cells: [...maze.cells.values()].map((cell) => ({ ...cell, open: [...cell.open] })),
    portalsFound: [...maze.portalsFound],
    themeZone: maze.themeZone,
    ringCount: maze.ringCount,
    visited: [...maze.visited],
  };
}

export function deserializeMaze(serialized: SerializedDungeonMaze): DungeonMaze {
  return {
    cells: new Map(serialized.cells.map((cell) => [cell.id, { ...cell, open: new Set(cell.open) }])),
    portalsFound: new Set(serialized.portalsFound),
    themeZone: serialized.themeZone,
    // 이 필드들이 없는 구세이브(ringCount/visited 도입 이전)를 위한 폴백 —
    // 기존 2층짜리 미궁으로, 지금까지 아무 데도 안 가본 것으로 취급한다.
    ringCount: typeof serialized.ringCount === 'number' ? serialized.ringCount : 2,
    visited: new Set(Array.isArray(serialized.visited) ? serialized.visited : []),
  };
}

// 남쪽 구역(고블린 서식지)의 포탈이 아닌 칸마다 이 확률로 함정이 고정 배치됨
// — allowTraps=true(1층 진입)일 때만. 2층은 애초에 9등급(고블린)이 절대
// 등장하지 않는 목표 등급 분포라(rollTargetGrade 참고) 대상에서 제외한다.
const GOBLIN_TRAP_CHANCE = 0.25;

// 기본 링 개수(중심부 제외) — 2층(zone별 미궁)은 지금까지와 동일하게 2링
// 구조를 유지한다. 1층만 아래 FLOOR1_RING_COUNT로 확장됨.
const DEFAULT_RING_COUNT = 2;

// 1층을 "더 넓히도록" 링 하나를 추가한 값(1차 결정치) — 3링(중심부+24칸,
// 총 25칸)으로 기존(2링, 17칸) 대비 약 47% 넓어진다. 실제 좌표/타일 기반
// 설계(designnotes.md 13번, 2D 렌더러 전환) 이전까지는 이 추상 링 구조를
// 그대로 확장하는 쪽을 택함 — 몬스터 배치(구역=zone)나 함정 로직 등 기존
// 규칙을 전혀 새로 설계하지 않고도 적용 가능하기 때문. 정확히 "링 1개
// 추가"가 맞는 확장 폭인지는 마스터 설정에 근거가 없어 1차 추정치.
export const FLOOR1_RING_COUNT = 3;

// index 0=북쪽으로 시작해 시계 방향으로 45°씩(COMPASS_LABEL 순서와 동일)
// 배치되는 극좌표 → 직교좌표 변환. y는 북쪽(+)이 양수인 수학 좌표계.
// radius는 링 번호를 그대로 쓴다(단위 없는 추상 스케일 — 미터/타일 값이
// 아니라 "어느 칸이 더 중심에서 먼가"만 일관되게 표현하면 충분하므로 링
// 번호 자체를 반지름으로 재사용, 별도 상수 불필요).
function ringPos(radius: number, index: number): CellPosition {
  const angleRad = ((90 - index * 45) * Math.PI) / 180;
  return { x: Math.round(radius * Math.cos(angleRad) * 100) / 100, y: Math.round(radius * Math.sin(angleRad) * 100) / 100 };
}

export function generateMaze(themeZone: ArmZone | null, allowTraps = false, ringCount = DEFAULT_RING_COUNT): DungeonMaze {
  const cells = new Map<CellId, DungeonCell>();

  const rollTrap = (zone: Zone, portal: ArmZone | null): TrapType | null =>
    allowTraps && zone === 'south' && !portal && Math.random() < GOBLIN_TRAP_CHANCE ? 'goblin' : null;

  cells.set('center', { id: 'center', ring: 0, index: -1, open: new Set(), zone: 'center', portal: null, trap: null, pos: { x: 0, y: 0 } });

  // 링 1..ringCount를 전부 같은 방식으로 생성 — 포탈은 언제나 가장 바깥
  // 링(ringCount)에만 배정된다("가장자리 고리는 항상 완전히 순환 연결"
  // 원칙도 가장 바깥 링에만 적용, 아래 outer-loop 참고).
  for (let r = 1; r <= ringCount; r++) {
    const isOuter = r === ringCount;
    for (let i = 0; i < RING_SIZE; i++) {
      const zone = themeZone ?? zoneForIndex(i);
      const portal = isOuter ? ((Object.keys(PORTAL_INDEX) as ArmZone[]).find((z) => PORTAL_INDEX[z] === i) ?? null) : null;
      cells.set(ringId(r, i), {
        id: ringId(r, i),
        ring: r,
        index: i,
        open: new Set(),
        zone,
        portal,
        trap: rollTrap(zone, portal),
        pos: ringPos(r, i),
      });
    }
  }

  const uf = new UnionFind();

  // The outermost ring (가장자리) is always a fully open loop, so every cell
  // on it — including all 4 portals — is directly reachable from its
  // neighbors with no dead ends, no matter how the inward maze turns out.
  for (let i = 0; i < RING_SIZE; i++) {
    connect(cells, ringId(ringCount, i), ringId(ringCount, i + 1));
    uf.union(ringId(ringCount, i), ringId(ringCount, i + 1));
  }

  // Randomized Kruskal's algorithm over the remaining candidate passages
  // (center<->ring1 spokes, and for every inner ring r<ringCount: its own
  // circumferential edges plus its spokes out to ring r+1) connects the
  // center and every inner ring into the already-unified outer loop. Only as
  // many edges as needed to reach full connectivity get opened, so this
  // branch of the maze still produces genuine dead ends.
  const candidates: [CellId, CellId][] = [];
  for (let i = 0; i < RING_SIZE; i++) candidates.push(['center', ringId(1, i)]);
  for (let r = 1; r < ringCount; r++) {
    for (let i = 0; i < RING_SIZE; i++) {
      candidates.push([ringId(r, i), ringId(r, i + 1)]);
      candidates.push([ringId(r, i), ringId(r + 1, i)]);
    }
  }

  for (const [a, b] of shuffle(candidates)) {
    if (!uf.connected(a, b)) {
      uf.union(a, b);
      connect(cells, a, b);
    }
  }

  return { cells, portalsFound: new Set(), themeZone, ringCount, visited: new Set() };
}

export function cellAt(maze: DungeonMaze, id: CellId): DungeonCell {
  const cell = maze.cells.get(id);
  if (!cell) throw new Error(`No cell with id ${id}`);
  return cell;
}

// 그 칸의 매복 고블린을 처치한 뒤 호출 — 같은 칸을 다시 지나가도 더는
// 기습당하지 않는다(handlePortalArrival이 maze.portalsFound를 직접
// mutate하는 것과 같은 패턴: DungeonMaze는 세이브/복원되는 참조 데이터라
// 새 객체를 만들어 반환하지 않고 그 자리에서 고친다).
export function resolveTrap(maze: DungeonMaze, id: CellId): void {
  cellAt(maze, id).trap = null;
}

// 입장 시 스폰 위치 — 링 개수와 무관하게 항상 "중심부 부근"(중심부 +
// 가장 안쪽 링1)으로 고정. 미궁이 넓어져도(FLOOR1_RING_COUNT) 이 규칙 자체는
// 그대로 유지하기로 함(사용자 지시) — 더 넓어진 바깥 링까지 무작위 스폰
// 대상에 넣지 않는다.
export function randomStartPosition(): CellId {
  const candidates: CellId[] = ['center'];
  for (let i = 0; i < RING_SIZE; i++) candidates.push(ringId(1, i));
  return candidates[Math.floor(Math.random() * candidates.length)];
}

// 그 칸에 실제로 도착했음을 기록 — 미니맵(ui/dungeon-minimap.ts)이 "가본
// 곳"과 "안 가본 곳"을 구분하는 유일한 근거. DungeonMaze는 세이브/복원되는
// 참조 데이터라 resolveTrap과 같은 패턴으로 그 자리에서 고친다.
export function markVisited(maze: DungeonMaze, id: CellId): void {
  maze.visited.add(id);
}

export const BASE_BATTLE_CHANCE = 0.55;

export function rollBattle(chance: number): boolean {
  return Math.random() < chance;
}

function cellLabel(cell: DungeonCell, ringCount: number): string {
  if (cell.id === 'center') return '중심부';
  const compass = COMPASS_LABEL[cell.index];
  if (cell.portal) return `${compass} 포탈`;
  if (cell.ring === ringCount) return `${compass} (가장자리)`;
  // 중간 링이 여러 겹(1층, ringCount=3)일 때만 몇 번째 링인지 번호를
  // 붙인다 — 기존처럼 중간 링이 하나뿐인 2층은 지금까지와 같은 문구 유지.
  return ringCount > 2 ? `${compass} (중간 고리${cell.ring})` : `${compass} (중간 고리)`;
}

export interface DungeonMove {
  label: string;
  next: CellId;
  battleChance: number;
  // 함정이 감지된 칸으로의 이동은 선택의 여지 없이 'ambush' 하나뿐이다 —
  // 그 외 모든 이동은 null. 예전엔 "덫을 밟는다(bleed만, 전투 없음)"라는
  // 선택지가 따로 있었으나, 뻔히 보이는 덫을 굳이 밟을 이유가 없다는 지적
  // (설계 논의 참고 — designnotes.md 4-4번의 "빛이 있으면 함정 무력화"
  // 원칙과도 모순됐음)에 따라 제거함. 지금은 "덫이 있다 = 그 자리에 고블린이
  // 숨어있다"는 뜻으로 재정의되어, 그 칸으로 이동하면(다른 칸을 골라
  // 피해가는 건 여전히 가능) 반드시 고블린이 튀어나와 기습한다.
  trapChoice: 'ambush' | null;
}

export function availableMoves(maze: DungeonMaze, pos: CellId): DungeonMove[] {
  const cell = cellAt(maze, pos);
  return [...cell.open].flatMap((neighborId): DungeonMove[] => {
    const neighbor = cellAt(maze, neighborId);
    const battleChance = neighbor.portal ? 0 : BASE_BATTLE_CHANCE;
    const chanceLabel = neighbor.portal ? '전투 없음' : `전투 확률 ${Math.round(BASE_BATTLE_CHANCE * 100)}%`;

    if (neighbor.trap) {
      const label = cellLabel(neighbor, maze.ringCount);
      return [{ label: `${label} (고블린 덫 감지 — 접근하면 기습당함)`, next: neighborId, battleChance: 1, trapChoice: 'ambush' }];
    }

    return [{ label: `${cellLabel(neighbor, maze.ringCount)}로 이동 · ${chanceLabel}`, next: neighborId, battleChance, trapChoice: null }];
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
