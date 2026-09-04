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

function shuffle<T>(items: T[], random: () => number): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// 1층 미궁 구조를 "어떤 캐릭터든 항상 똑같도록" 고정하기 위한 결정적
// 의사난수 생성기(mulberry32) — 같은 시드를 주면 항상 같은 순서의 0~1
// 실수열을 낸다. generateMaze()가 미로 생성 중 굴리는 모든 주사위(함정
// 배치, 통로 셔플)를 이 함수로 바꿔치기하면, Math.random() 대신 이 결과만
// 사용하는 한 몇 번을 다시 생성해도 완전히 같은 구조가 나온다.
function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) | 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
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

// 1층을 "더 넓히도록" 링을 추가한 값(1차 결정치) — 2026-09-04 하루 동안
// 2→3링(25칸)→4링(33칸)으로 두 차례 확장한 데 이어, 사용자가 "약 2배로
// 더 키워달라"고 재요청해 8링(중심부+64칸, 총 65칸 — 직전 33칸 대비 약
// 97%, 원래 2링/17칸 대비 약 282% 확장)으로 재확장했다. 실제 좌표/타일
// 기반 설계(designnotes.md 13번, 2D 렌더러 전환) 이전까지는 이 추상 링
// 구조를 그대로 확장하는 쪽을 택함 — 몬스터 배치(구역=zone)나 함정 로직 등
// 기존 규칙을 전혀 새로 설계하지 않고도 적용 가능하기 때문. 정확히 몇 링이
// 맞는 확장 폭인지는 마스터 설정에 근거가 없어 1차 추정치.
//
// 이미 floor1MazeTemplate을 저장한(=1층에 한 번이라도 들어간 적 있는)
// 기존 캐릭터는 이 값을 바꿔도 영향받지 않는다 — enterDungeon()(main.ts)이
// 저장된 템플릿을 그대로 이어받고 재생성하지 않기 때문. 새 링 구조는
// 아직 1층에 들어간 적 없는 캐릭터(신규 생성 포함)부터 적용되고, 기존
// 캐릭터는 사망(페르마데스) 후 다음 캐릭터부터 새 구조를 만난다.
export const FLOOR1_RING_COUNT = 8;

// index 0=북쪽으로 시작해 시계 방향으로 45°씩(COMPASS_LABEL 순서와 동일)
// 배치되는 극좌표 → 직교좌표 변환. y는 북쪽(+)이 양수인 수학 좌표계.
// radius는 링 번호를 그대로 쓴다(단위 없는 추상 스케일 — 미터/타일 값이
// 아니라 "어느 칸이 더 중심에서 먼가"만 일관되게 표현하면 충분하므로 링
// 번호 자체를 반지름으로 재사용, 별도 상수 불필요).
function ringPos(radius: number, index: number): CellPosition {
  const angleRad = ((90 - index * 45) * Math.PI) / 180;
  return { x: Math.round(radius * Math.cos(angleRad) * 100) / 100, y: Math.round(radius * Math.sin(angleRad) * 100) / 100 };
}

export function generateMaze(
  themeZone: ArmZone | null,
  allowTraps = false,
  ringCount = DEFAULT_RING_COUNT,
  random: () => number = Math.random,
  // true면 4개 포탈 방향(동/서/남/북, PORTAL_INDEX)마다 중심부에서 그
  // 포탈까지 일직선으로 뚫린 방사형 통로를 강제로 보장한다 — "각 방향으로
  // 계속 나가면 그 방향 포탈에 도착해야 한다"(1층 전용 요구, 아래
  // generateFloor1Maze 참고)는 요구를 만족시키기 위함. 나머지(대각선 4방향의
  // 스포크, 각 링의 원주 방향 통로)는 기존과 동일하게 Kruskal로 무작위
  // 배정되어 여전히 미로 구조(막다른 길 포함)를 유지한다. 2층은 기존 동작을
  // 그대로 유지하기 위해 기본값 false.
  directPortalSpokes = false
): DungeonMaze {
  const cells = new Map<CellId, DungeonCell>();

  const rollTrap = (zone: Zone, portal: ArmZone | null): TrapType | null =>
    allowTraps && zone === 'south' && !portal && random() < GOBLIN_TRAP_CHANCE ? 'goblin' : null;

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

  // 4개 포탈 방향(동/서/남/북)마다 중심부→링1→...→ringCount(포탈)까지
  // 일직선 방사형 통로를 강제로 열어둔다 — Kruskal이 돌기 전에 미리
  // union해두므로, 아래 Kruskal은 이 칸들을 다시 무작위로 고를 필요가 없어
  // 그만큼 다른(대각선) 통로를 뚫는 데 후보를 더 쓰게 된다.
  if (directPortalSpokes) {
    for (const idx of Object.values(PORTAL_INDEX)) {
      let prev: CellId = 'center';
      for (let r = 1; r <= ringCount; r++) {
        const cur = ringId(r, idx);
        connect(cells, prev, cur);
        uf.union(prev, cur);
        prev = cur;
      }
    }
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

  for (const [a, b] of shuffle(candidates, random)) {
    if (!uf.connected(a, b)) {
      uf.union(a, b);
      connect(cells, a, b);
    }
  }

  return { cells, portalsFound: new Set(), themeZone, ringCount, visited: new Set() };
}

// 1층 전용 시드 — 값 자체엔 의미 없음, "항상 같은 시드"라는 사실만 중요.
// 바꾸면 그 순간부터 1층 구조 자체가(이미 생성해서 profile에 저장해둔
// 캐릭터를 제외하고) 통째로 달라지므로, 함부로 바꾸지 않는다.
const FLOOR1_MAZE_SEED = 20260904;

// "1층 미궁은 어떤 캐릭터든 항상 똑같아야 한다"(사용자 지시, designnotes.md
// 16번 갱신 참고)는 요구를 만족시키는 유일한 진입점 — 매번 Math.random()으로
// 새로 뽑던 구조를, 고정된 시드로 결정적으로 재생산한다. 함정 배치까지
// 포함해 완전히 결정적이라, 이 함수를 몇 번을 다시 호출해도 항상 정확히
// 같은 65칸짜리 미로가 나온다(위 mulberry32 참고). 캐릭터별로 남는 차이는
// 오직 그 캐릭터 자신의 진행 상태(탐험 기록 visited, 처치해서 해제한 함정,
// 포탈 발견 여부)뿐이며, 그건 이 함수가 아니라 main.ts가
// PlayerProfile.floor1MazeTemplate에 별도로 보존한다.
//
// directPortalSpokes=true — "동/서/남/북 방향으로 계속 나가면 그 방향
// 포탈에 도착해야 한다, 지금은 너무 돌아간다"는 사용자 피드백에 따라 1층만
// 4개 포탈 방향에 중심부↔포탈 직행 통로를 보장한다(2층은 기존 동작 유지 —
// generateFloor2Maze는 이 인자를 넘기지 않음).
export function generateFloor1Maze(): DungeonMaze {
  return generateMaze(null, true, FLOOR1_RING_COUNT, mulberry32(FLOOR1_MAZE_SEED), true);
}

// 2층도 1층과 같은 이유로 무작위 생성을 그만둔다(사용자 지시, designnotes.md
// 16번 갱신 참고) — 방향(구역)마다 완전히 별개인 미궁이라는 기존 구조는
// 그대로 두되, 그 4개 미궁 각각을 고정 시드로 결정적으로 생성한다. 구역마다
// 다른 시드를 써서 네 방향의 구조가 서로 겹치지 않게 한다(값 자체엔 의미
// 없음, 서로 다르기만 하면 됨 — FLOOR1_MAZE_SEED와도 겹치지 않게 배치).
const FLOOR2_MAZE_SEEDS: Record<ArmZone, number> = {
  north: 20260905,
  east: 20260906,
  south: 20260907,
  west: 20260908,
};

// FLOOR1_RING_COUNT 없이 기본값(DEFAULT_RING_COUNT=2)을 그대로 쓴다 — 이번
// 요청은 "무작위 생성을 멈춰라"였을 뿐 "더 넓혀라"는 아니었으므로 1층처럼
// 링을 늘리지 않음. allowTraps도 기존과 동일하게 false(2층 덫은 아직
// 미착수, 4-3-1번 참고).
export function generateFloor2Maze(zone: ArmZone): DungeonMaze {
  return generateMaze(zone, false, DEFAULT_RING_COUNT, mulberry32(FLOOR2_MAZE_SEEDS[zone]));
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
