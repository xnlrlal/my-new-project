export type Zone = 'center' | 'north' | 'east' | 'south' | 'west';
export type ArmZone = 'north' | 'east' | 'south' | 'west';

export type CellId = string;

const RING_SIZE = 8;

// 8 angular slots around each ring: N, NE, E, SE, S, SW, W, NW
const COMPASS_LABEL = ['북쪽', '북동쪽', '동쪽', '남동쪽', '남쪽', '남서쪽', '서쪽', '북서쪽'];

const PORTAL_INDEX: Record<ArmZone, number> = { north: 0, east: 2, south: 4, west: 6 };

// export됨 — 그리드(1층 동굴)용 zoneForAngle이 같은 8구간 경계를 재사용해
// 두 좌표계의 나침반→구역 매핑이 항상 일치하게 한다(따로 베껴 쓰면 나중에
// 둘이 어긋날 위험이 있음 — designnotes.md의 "같은 상수를 여러 파일에 수동
// 복제할 땐 경고 주석 필수" 원칙과 같은 이유로 아예 복제하지 않고 공유).
export function zoneForIndex(idx: number): ArmZone {
  if (idx === 0 || idx === 1) return 'north';
  if (idx === 2 || idx === 3) return 'east';
  if (idx === 4 || idx === 5) return 'south';
  return 'west';
}

// 그리드(1층 동굴) 칸의 구역 배정 — 중심 기준 좌표(pos)의 각도를 8방위
// index로 환산해 zoneForIndex를 그대로 재사용한다. ringPos()가 index를
// "90 - index*45도"로 배치하는 것과 반대 방향 계산(각도→index)이라, 두
// 좌표계에서 같은 방향은 항상 같은 구역으로 분류됨이 보장된다.
export function zoneForAngle(pos: CellPosition): ArmZone {
  const angleDeg = (Math.atan2(pos.y, pos.x) * 180) / Math.PI;
  let idx = Math.round((90 - angleDeg) / 45) % RING_SIZE;
  if (idx < 0) idx += RING_SIZE;
  return zoneForIndex(idx);
}

// export됨 — 미니맵(ui/dungeon-minimap.ts)이 어떤 칸의 반지름 방향/원주
// 방향 이웃 슬롯 id를 직접 계산해(그 슬롯이 실제로 존재하는지, open에
// 포함되는지) 미로 벽을 그리는 데 재사용한다.
export function ringId(ring: number, i: number): CellId {
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
  ring: number; // 폴라(2층, 구세이브 1층) 전용: 0=중심부, 1..ringCount=바깥. 그리드는 -1(미사용 센티널).
  index: number; // 폴라 전용: 0~7 나침반 슬롯. 그리드는 -1(미사용 센티널).
  row: number; // 그리드(1층 동굴) 전용: 0..gridSize-1. 폴라는 -1(미사용 센티널).
  col: number; // 그리드 전용: 0..gridSize-1. 폴라는 -1(미사용 센티널).
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
  // 어떤 좌표계로 생성된 미궁인지 — 2층(generateFloor2Maze)과 구세이브 1층
  // (topology 필드 도입 이전에 저장된 floor1MazeTemplate, deserializeMaze의
  // 폴백 참고)은 항상 'polar', 새로 생성되는 1층(generateFloor1Maze)은
  // 'grid'. UI(ui/dungeon-map.ts)가 이 값으로 폴라 전용 풀 미니맵을 그대로
  // 쓸지, 그리드 전용 로컬 뷰/전체맵(ui/dungeon-viewport.ts)을 쓸지 가른다.
  topology: 'polar' | 'grid';
  // 링 개수(중심부 제외, 폴라 전용) — floor 2는 기본값 2, 구세이브 1층은
  // 저장된 값 그대로. 그리드 미궁은 0(미사용 센티널).
  ringCount: number;
  // 격자 한 변의 칸 수(그리드 전용) — isDarkZoneCell 등이 "가장자리인가"
  // 판단하는 데 쓴다. 폴라 미궁은 0(미사용 센티널).
  gridSize: number;
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
  row: number;
  col: number;
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
  topology: 'polar' | 'grid';
  ringCount: number;
  gridSize: number;
  visited: CellId[];
}

export function serializeMaze(maze: DungeonMaze): SerializedDungeonMaze {
  return {
    cells: [...maze.cells.values()].map((cell) => ({ ...cell, open: [...cell.open] })),
    portalsFound: [...maze.portalsFound],
    themeZone: maze.themeZone,
    topology: maze.topology,
    ringCount: maze.ringCount,
    gridSize: maze.gridSize,
    visited: [...maze.visited],
  };
}

export function deserializeMaze(serialized: SerializedDungeonMaze): DungeonMaze {
  return {
    cells: new Map(
      serialized.cells.map((cell) => [
        cell.id,
        {
          ...cell,
          // 이 필드들이 없는 구세이브(row/col 도입 이전)를 위한 폴백 — 전부
          // 폴라 미궁이었으므로 -1 센티널로 채운다(DungeonCell 필드 설명 참고).
          row: typeof cell.row === 'number' ? cell.row : -1,
          col: typeof cell.col === 'number' ? cell.col : -1,
          open: new Set(cell.open),
        },
      ])
    ),
    portalsFound: new Set(serialized.portalsFound),
    themeZone: serialized.themeZone,
    // topology가 없는 구세이브(이 필드 도입 이전 — 그리드 1층이 생기기 전엔
    // 모든 미궁이 폴라였다)는 'polar'로 간주한다. 이게 "이미
    // floor1MazeTemplate을 가진 기존 캐릭터는 새 그리드 동굴이 아니라 계속
    // 옛 폴라 구조 + 기존 풀 미니맵 UI를 본다"는 하위호환의 핵심 분기점 —
    // ui/dungeon-map.ts가 이 값으로 렌더러를 고른다.
    topology: serialized.topology === 'grid' ? 'grid' : 'polar',
    // 이 필드들이 없는 구세이브(ringCount/visited 도입 이전)를 위한 폴백 —
    // 기존 2층짜리 미궁으로, 지금까지 아무 데도 안 가본 것으로 취급한다.
    ringCount: typeof serialized.ringCount === 'number' ? serialized.ringCount : 2,
    gridSize: typeof serialized.gridSize === 'number' ? serialized.gridSize : 0,
    visited: new Set(Array.isArray(serialized.visited) ? serialized.visited : []),
  };
}

// 남쪽 구역(고블린 서식지)의 포탈이 아닌 칸마다 이 확률로 함정이 고정 배치됨
// — allowTraps=true(1층 진입)일 때만. 2층은 애초에 9등급(고블린)이 절대
// 등장하지 않는 목표 등급 분포라(rollTargetGrade 참고) 대상에서 제외한다.
// 폴라(generateMaze)와 그리드(generateFloor1CaveMaze) 양쪽에서 rollGoblinTrap
// 헬퍼가 공유하므로 두 곳에 따로 복제할 필요가 없다.
const GOBLIN_TRAP_CHANCE = 0.25;

function rollGoblinTrap(zone: Zone, portal: ArmZone | null, allowTraps: boolean, random: () => number): TrapType | null {
  return allowTraps && zone === 'south' && !portal && random() < GOBLIN_TRAP_CHANCE ? 'goblin' : null;
}

// 기본 링 개수(중심부 제외) — 2층(zone별 미궁)은 지금까지와 동일하게 2링
// 구조를 유지한다. 1층은 이제 폴라가 아니라 그리드(아래 FLOOR1_GRID_SIZE)라
// 이 상수와 무관.
const DEFAULT_RING_COUNT = 2;

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
  random: () => number = Math.random
): DungeonMaze {
  const cells = new Map<CellId, DungeonCell>();

  cells.set('center', {
    id: 'center',
    ring: 0,
    index: -1,
    row: -1,
    col: -1,
    open: new Set(),
    zone: 'center',
    portal: null,
    trap: null,
    pos: { x: 0, y: 0 },
  });

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
        row: -1,
        col: -1,
        open: new Set(),
        zone,
        portal,
        trap: rollGoblinTrap(zone, portal, allowTraps, random),
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

  for (const [a, b] of shuffle(candidates, random)) {
    if (!uf.connected(a, b)) {
      uf.union(a, b);
      connect(cells, a, b);
    }
  }

  return { cells, portalsFound: new Set(), themeZone, topology: 'polar', ringCount, gridSize: 0, visited: new Set() };
}

// 1층 전용 시드 — 값 자체엔 의미 없음, "항상 같은 시드"라는 사실만 중요.
// 바꾸면 그 순간부터 1층 구조 자체가(이미 생성해서 profile에 저장해둔
// 캐릭터를 제외하고) 통째로 달라지므로, 함부로 바꾸지 않는다.
const FLOOR1_MAZE_SEED = 20260904;

// 1층 동굴 생성 파라미터 — 셀룰러 오토마타로 "미로처럼 돌아가는 통로"
// 대신 "동굴처럼 뚫린 공간"을 만들기로 함(사용자가 도감 아티팩트에서
// 유기적 동굴형을 선택). N/채움율/스무딩 횟수는 고정 시드
// FLOOR1_MAZE_SEED 기준으로 실제 생성 결과를 여러 조합(N 13~29, 채움율
// 0.38~0.48)으로 실측해 고른 값 — 이 조합(N=29, 채움 40%)이 4개 포탈 전부
// 별도 보정 없이 자연스럽게 중심부와 연결되고, 4구역 몬스터 분포가 고르게
// 나뉘고(0칸짜리 구역 없음), 암흑지대(아래 참고)를 제외한 스폰 후보가
// 충분히(40개) 남는 유일한 조합이었다. 정확히 이 숫자여야 하는 마스터
// 설정 근거는 없어 1차 결정치.
const FLOOR1_GRID_SIZE = 29;
const CAVE_FILL_CHANCE = 0.4;
const CAVE_SMOOTH_ITERATIONS = 4;

// 최외곽 몇 칸까지를 "암흑지역"으로 볼지 — designnotes.md 12-2번("암흑지대가
// 일부 존재... 넓지 않고, 주로 2층으로 이어지는 최외곽부에 집중")을 그대로
// 반영해 가장 바깥 1칸 테두리로 좁게 잡음. 정확히 몇 칸이어야 하는지는
// 마스터 설정에 없어 1차 결정치 — "넓지 않고"라는 문구가 근거.
const FLOOR1_DARK_BORDER = 1;

// 그리드(1층 동굴) 전용 — 그 칸이 designnotes.md 12-2번의 "암흑지역"(광원인
// 벽면 수정이 닿지 않는 최외곽부)에 속하는지. 폴라(2층, 구세이브 1층)는
// 이 개념 자체가 없어 항상 false. ui/dungeon-viewport.ts가 로컬 뷰 반경을
// 0으로 줄일지 판단하는 데, dungeon.ts의 availableMoves가 이동 버튼 문구를
// 가릴지 판단하는 데 둘 다 이 함수 하나를 공유한다.
export function isDarkZoneCell(cell: DungeonCell, maze: DungeonMaze): boolean {
  if (maze.topology !== 'grid') return false;
  const edge = FLOOR1_DARK_BORDER - 1;
  return cell.row <= edge || cell.row >= maze.gridSize - 1 - edge || cell.col <= edge || cell.col >= maze.gridSize - 1 - edge;
}

// 순수 셀룰러 오토마타 생성기 — 게임 개념(구역/포탈/함정)을 전혀 모르는
// N×N 벽/바닥 격자만 만든다(true=벽). 표준 알고리즘: 무작위 채움 →
// 스무딩 반복(8이웃 중 벽이 다수면 벽, 아니면 바닥 — 격자 밖은 벽으로 침).
function generateCaveGrid(gridSize: number, fillChance: number, smoothIterations: number, random: () => number): boolean[][] {
  let grid: boolean[][] = [];
  for (let y = 0; y < gridSize; y++) {
    const row: boolean[] = [];
    for (let x = 0; x < gridSize; x++) row.push(random() < fillChance);
    grid.push(row);
  }

  const wallNeighbors8 = (g: boolean[][], x: number, y: number): number => {
    let n = 0;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= gridSize || ny >= gridSize) {
          n++;
          continue;
        }
        if (g[ny][nx]) n++;
      }
    }
    return n;
  };

  for (let iter = 0; iter < smoothIterations; iter++) {
    const next = grid.map((row) => row.slice());
    for (let y = 0; y < gridSize; y++) {
      for (let x = 0; x < gridSize; x++) {
        const wn = wallNeighbors8(grid, x, y);
        if (wn > 4) next[y][x] = true;
        else if (wn < 4) next[y][x] = false;
      }
    }
    grid = next;
  }

  return grid;
}

// 중심에서 4방향(상하좌우)으로 도달 가능한 바닥 칸만 남긴다 — 동굴 생성이
// 만들어낼 수 있는 고립된 웅덩이(중심부와 연결 안 된 바닥 조각)를 걸러내는
// 표준 후처리. 반환값은 "row,col" 키 집합.
function floodFillReachable(grid: boolean[][], gridSize: number, startRow: number, startCol: number): Set<string> {
  const key = (r: number, c: number) => `${r},${c}`;
  const seen = new Set<string>([key(startRow, startCol)]);
  const queue: [number, number][] = [[startRow, startCol]];
  const dirs: [number, number][] = [
    [0, 1],
    [0, -1],
    [1, 0],
    [-1, 0],
  ];
  while (queue.length) {
    const [y, x] = queue.shift()!;
    for (const [dy, dx] of dirs) {
      const ny = y + dy;
      const nx = x + dx;
      if (ny < 0 || nx < 0 || ny >= gridSize || nx >= gridSize) continue;
      const k = key(ny, nx);
      if (seen.has(k) || grid[ny][nx]) continue; // 이미 봤거나 벽
      seen.add(k);
      queue.push([ny, nx]);
    }
  }
  return seen;
}

// "1층 미궁은 어떤 캐릭터든 항상 똑같아야 한다"(사용자 지시, designnotes.md
// 16번 갱신 참고)는 요구를 만족시키는 유일한 진입점 — 매번 Math.random()으로
// 새로 뽑던 구조를, 고정된 시드로 결정적으로 재생산한다. 예전엔 원형(폴라)
// 미로였지만, 사용자가 실제 플레이 후 "너무 돌아간다"고 지적하고 도감
// 아티팩트로 5가지 스타일을 비교해본 뒤 셀룰러 오토마타 동굴형을 택해
// 완전히 새로 만들었다(designnotes.md 20번 참고). "동/서/남/북으로 나가면
// 그 포탈에 직행"하던 이전 보장은 이번엔 사용자가 명시적으로 폐기하도록
// 요청함 — 포탈은 여전히 항상 중심부와 연결되지만(아래), 그 경로가
// 일직선이라는 보장은 없다.
export function generateFloor1Maze(): DungeonMaze {
  const random = mulberry32(FLOOR1_MAZE_SEED);
  const N = FLOOR1_GRID_SIZE;
  const centerRow = Math.floor(N / 2);
  const centerCol = Math.floor(N / 2);

  const wallGrid = generateCaveGrid(N, CAVE_FILL_CHANCE, CAVE_SMOOTH_ITERATIONS, random);
  wallGrid[centerRow][centerCol] = false; // 중심은 항상 바닥 — flood-fill의 유효한 시작점을 보장.
  const reachable = floodFillReachable(wallGrid, N, centerRow, centerCol);

  // 포탈은 연결성이 확인된 뒤에 고른다 — 4변(북=row0/남=rowN-1/동=colN-1/
  // 서=col0) 각각에서 이미 중심부와 연결된(reachable) 칸 중 그 변의
  // 중앙에 가장 가까운 칸을 그 방향 포탈로 삼는다. 이 방식이면 포탈은
  // 태생적으로 항상 이미 연결된 칸이라 "직행 통로 강제 보장" 같은 상시
  // 기능 없이도 도달 가능성이 확보된다 — 아래 forcePortalConnection은
  // 한 변에 연결된 칸이 아예 없는 극단적인 경우에만 쓰이는 비상 폴백이며,
  // FLOOR1_GRID_SIZE/CAVE_FILL_CHANCE 조합(위 주석 참고)에서는 실측상
  // 발동하지 않는다.
  type PortalSpec = { zone: ArmZone; axis: 'row' | 'col'; fixed: number; mid: number };
  const portalSpecs: PortalSpec[] = [
    { zone: 'north', axis: 'row', fixed: 0, mid: centerCol },
    { zone: 'south', axis: 'row', fixed: N - 1, mid: centerCol },
    { zone: 'east', axis: 'col', fixed: N - 1, mid: centerRow },
    { zone: 'west', axis: 'col', fixed: 0, mid: centerRow },
  ];

  const portalCells = new Map<ArmZone, { row: number; col: number }>();
  for (const spec of portalSpecs) {
    let best: { row: number; col: number } | null = null;
    let bestDist = Infinity;
    if (spec.axis === 'row') {
      const row = spec.fixed;
      for (let col = 0; col < N; col++) {
        if (!reachable.has(`${row},${col}`)) continue;
        const dist = Math.abs(col - spec.mid);
        if (dist < bestDist) {
          bestDist = dist;
          best = { row, col };
        }
      }
    } else {
      const col = spec.fixed;
      for (let row = 0; row < N; row++) {
        if (!reachable.has(`${row},${col}`)) continue;
        const dist = Math.abs(row - spec.mid);
        if (dist < bestDist) {
          bestDist = dist;
          best = { row, col };
        }
      }
    }
    if (!best) {
      // 비상 폴백: 이 변엔 연결된 칸이 전혀 없음 — 목표 칸을 강제로 뚫고,
      // reachable 안에서 가장 가까운 칸까지 직선(먼저 행, 다음 열)으로
      // 통로를 뚫어 연결한다. 상시 기능이 아니라 이 경우에만 쓰이는
      // 예외 처리.
      const target = { row: spec.axis === 'row' ? spec.fixed : spec.mid, col: spec.axis === 'row' ? spec.mid : spec.fixed };
      let nearest = { row: centerRow, col: centerCol };
      let nearestDist = Infinity;
      for (const k of reachable) {
        const [r, c] = k.split(',').map(Number);
        const dist = Math.abs(r - target.row) + Math.abs(c - target.col);
        if (dist < nearestDist) {
          nearestDist = dist;
          nearest = { row: r, col: c };
        }
      }
      let r = nearest.row;
      let c = nearest.col;
      const step = (from: number, to: number) => (from < to ? from + 1 : from > to ? from - 1 : from);
      while (r !== target.row) {
        r = step(r, target.row);
        wallGrid[r][c] = false;
        reachable.add(`${r},${c}`);
      }
      while (c !== target.col) {
        c = step(c, target.col);
        wallGrid[r][c] = false;
        reachable.add(`${r},${c}`);
      }
      best = target;
    }
    portalCells.set(spec.zone, best);
  }
  const portalByCoord = new Map<string, ArmZone>([...portalCells.entries()].map(([zone, p]) => [`${p.row},${p.col}`, zone]));

  const cells = new Map<CellId, DungeonCell>();
  for (const key of reachable) {
    const [row, col] = key.split(',').map(Number);
    const id = `grid${row}-${col}`;
    const isCenter = row === centerRow && col === centerCol;
    const pos: CellPosition = { x: col - centerCol, y: centerRow - row };
    const zone: Zone = isCenter ? 'center' : zoneForAngle(pos);
    const portal = portalByCoord.get(key) ?? null;
    cells.set(id, {
      id,
      ring: -1,
      index: -1,
      row,
      col,
      open: new Set(),
      zone,
      portal,
      trap: rollGoblinTrap(zone, portal, true, random),
      pos,
    });
  }

  // 4방향(상하좌우) 인접만 연결한다 — 대각선 이동 없음, 이동 버튼이 항상
  // 최대 4개 방향(북/남/동/서)만 갖도록 보장(cellLabel/availableMoves의
  // 그리드 분기가 이 전제를 씀).
  const neighborDeltas: [number, number][] = [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ];
  for (const key of reachable) {
    const [row, col] = key.split(',').map(Number);
    for (const [dr, dc] of neighborDeltas) {
      const nk = `${row + dr},${col + dc}`;
      if (reachable.has(nk)) connect(cells, `grid${row}-${col}`, `grid${row + dr}-${col + dc}`);
    }
  }

  return { cells, portalsFound: new Set(), themeZone: null, topology: 'grid', ringCount: 0, gridSize: N, visited: new Set() };
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

// 그리드(1층 동굴) 스폰 후보를 찾는 반경 — 폴라의 "중심부+링1"과 같은
// 정신(중심부 부근에서만 스폰)을 그리드에 옮긴 것. 정확히 몇 칸이어야
// 하는지는 마스터 설정에 없어 1차 결정치(FLOOR1_GRID_SIZE=29 기준 실측상
// 이 반경 안에 암흑지대 제외 후보가 40개 남아 충분함을 확인).
const FLOOR1_SPAWN_RADIUS = 3;

// 입장 시 스폰 위치. 폴라(2층, 구세이브 1층)는 링 개수와 무관하게 항상
// "중심부 부근"(중심부+링1)으로 고정하던 기존 동작을 그대로 유지 — maze는
// 분기 판단에만 쓰이고 폴라 쪽 결과는 이전과 완전히 동일하다.
//
// 그리드(1층 동굴)는 어떤 칸이 실제로 바닥인지가 절차적으로 정해지므로
// 폴라처럼 좌표만으로 후보를 나열할 수 없다 — 중심부에서 체비셰프 반경
// FLOOR1_SPAWN_RADIUS 이내의 실제 바닥 칸 중 암흑지대(isDarkZoneCell)가
// 아닌 칸들 중에서 고른다. designnotes.md 12-2번 "시작 위치는 랜덤이지만
// 완전 무작위 암흑 배치는 아니다... 완전한 암흑 속에 던져지는 일은 없음"이
// 암흑지대를 스폰 후보에서 제외하는 근거.
export function randomStartPosition(maze: DungeonMaze): CellId {
  if (maze.topology === 'polar') {
    const candidates: CellId[] = ['center'];
    for (let i = 0; i < RING_SIZE; i++) candidates.push(ringId(1, i));
    return candidates[Math.floor(Math.random() * candidates.length)];
  }

  const center = cellAt(maze, [...maze.cells.values()].find((c) => c.zone === 'center')!.id);
  const candidates: CellId[] = [];
  for (const cell of maze.cells.values()) {
    const chebyshev = Math.max(Math.abs(cell.row - center.row), Math.abs(cell.col - center.col));
    if (chebyshev <= FLOOR1_SPAWN_RADIUS && !isDarkZoneCell(cell, maze)) candidates.push(cell.id);
  }
  if (candidates.length === 0) {
    // 방어적 폴백 — 실측상 발생하지 않지만(위 FLOOR1_GRID_SIZE 주석), 만약
    // 암흑지대 아닌 칸이 반경 안에 하나도 없다면 반경 제한 없이 암흑지대만
    // 피해서 고르고, 그마저 없으면 중심부로 보낸다.
    for (const cell of maze.cells.values()) if (!isDarkZoneCell(cell, maze)) candidates.push(cell.id);
  }
  if (candidates.length === 0) return center.id;
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

// 그리드(1층 동굴) 전용 — 4방향 인접만 있는 그리드에서는 이웃의 나침반
// 방향이 "그 칸의 고유 인덱스"가 아니라 "지금 서 있는 칸(fromCell)에서
// 봤을 때 어느 쪽인가"로만 정해진다(폴라 링 칸은 인덱스 자체가 나침반
// 방향이라 이 계산이 필요 없음). cellLabel의 그리드 분기와
// availableMoves의 암흑지역 문구 은닉(포탈/함정 정보 없이 방향만) 양쪽이
// 이 헬퍼 하나를 공유해, 둘이 서로 다른 방향을 말하는 일이 없게 한다.
function gridCompassWord(cell: DungeonCell, fromCell: DungeonCell): string {
  if (cell.row < fromCell.row) return '북쪽';
  if (cell.row > fromCell.row) return '남쪽';
  if (cell.col > fromCell.col) return '동쪽';
  return '서쪽';
}

// fromCell은 그리드 분기에서만 쓰인다(위 gridCompassWord 참고). 폴라(2층,
// 구세이브 1층)는 링 칸 자체가 이미 고유한 나침반 인덱스를 갖고 있어
// fromCell 없이도 라벨이 정해진다.
function cellLabel(cell: DungeonCell, maze: DungeonMaze, fromCell: DungeonCell): string {
  if (cell.id === 'center') return '중심부';

  if (maze.topology === 'grid') {
    const compass = gridCompassWord(cell, fromCell);
    return cell.portal ? `${compass} 포탈` : compass;
  }

  const compass = COMPASS_LABEL[cell.index];
  if (cell.portal) return `${compass} 포탈`;
  if (cell.ring === maze.ringCount) return `${compass} (가장자리)`;
  // 중간 링이 여러 겹(1층, ringCount=3)일 때만 몇 번째 링인지 번호를
  // 붙인다 — 기존처럼 중간 링이 하나뿐인 2층은 지금까지와 같은 문구 유지.
  return maze.ringCount > 2 ? `${compass} (중간 고리${cell.ring})` : `${compass} (중간 고리)`;
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
  // 지금 서 있는 칸이 그리드(1층 동굴)의 암흑지역이면 이동 버튼 문구도
  // "안 보이는 것"에 맞춰 가린다(사용자 확인) — 포탈/함정 여부를 미리
  // 알려주지 않고 방향만 표시. 다만 실제 전투 확률/기습 발생 등 게임
  // 로직은 그대로 유지 — 오직 표시 텍스트만 가리는 것이라, 안 보이는 채로
  // 걸어 들어가 기습당할 수 있음(이게 암흑의 핵심).
  const hidden = maze.topology === 'grid' && isDarkZoneCell(cell, maze);

  return [...cell.open].flatMap((neighborId): DungeonMove[] => {
    const neighbor = cellAt(maze, neighborId);
    const battleChance = neighbor.portal ? 0 : BASE_BATTLE_CHANCE;
    const chanceLabel = neighbor.portal ? '전투 없음' : `전투 확률 ${Math.round(BASE_BATTLE_CHANCE * 100)}%`;
    // 은닉 시엔 포탈/함정 여부를 전혀 드러내지 않는 "방향만" 문구를 쓴다 —
    // cellLabel은 포탈이면 "포탈"을 덧붙이므로 여기선 절대 쓰지 않는다.
    const label = hidden ? `${gridCompassWord(neighbor, cell)}으로 이동` : `${cellLabel(neighbor, maze, cell)}로 이동 · ${chanceLabel}`;

    if (neighbor.trap) {
      const trapLabel = hidden ? `${gridCompassWord(neighbor, cell)}으로 이동` : `${cellLabel(neighbor, maze, cell)} (고블린 덫 감지 — 접근하면 기습당함)`;
      return [{ label: trapLabel, next: neighborId, battleChance: 1, trapChoice: 'ambush' }];
    }

    return [{ label, next: neighborId, battleChance, trapChoice: null }];
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
