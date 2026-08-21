export type Zone = 'center' | 'north' | 'east' | 'south' | 'west';
export type ArmZone = 'north' | 'east' | 'south' | 'west';

export type Direction = 'N' | 'E' | 'S' | 'W';

export interface GridPos {
  x: number;
  y: number;
}

const DIRECTIONS: Direction[] = ['N', 'E', 'S', 'W'];

const DIRECTION_DELTA: Record<Direction, GridPos> = {
  N: { x: 0, y: 1 },
  S: { x: 0, y: -1 },
  E: { x: 1, y: 0 },
  W: { x: -1, y: 0 },
};

const OPPOSITE: Record<Direction, Direction> = { N: 'S', S: 'N', E: 'W', W: 'E' };

const DIRECTION_TO_ZONE: Record<Direction, ArmZone> = { N: 'north', S: 'south', E: 'east', W: 'west' };

export const DIRECTION_LABEL: Record<Direction, string> = { N: '북쪽', E: '동쪽', S: '남쪽', W: '서쪽' };

const RADIUS = 2;

function cellKey(pos: GridPos): string {
  return `${pos.x},${pos.y}`;
}

function inBounds(pos: GridPos): boolean {
  return Math.abs(pos.x) <= RADIUS && Math.abs(pos.y) <= RADIUS;
}

function zoneForPos(pos: GridPos, themeZone: ArmZone | null): Zone {
  if (themeZone) return themeZone;
  if (Math.max(Math.abs(pos.x), Math.abs(pos.y)) <= 1) return 'center';
  if (Math.abs(pos.y) >= Math.abs(pos.x)) return pos.y > 0 ? 'north' : 'south';
  return pos.x > 0 ? 'east' : 'west';
}

export interface DungeonCell {
  pos: GridPos;
  open: Partial<Record<Direction, true>>;
  zone: Zone;
  portal: ArmZone | null;
}

export interface DungeonMaze {
  cells: Map<string, DungeonCell>;
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

export function generateMaze(themeZone: ArmZone | null): DungeonMaze {
  const cells = new Map<string, DungeonCell>();

  for (let x = -RADIUS; x <= RADIUS; x++) {
    for (let y = -RADIUS; y <= RADIUS; y++) {
      const pos = { x, y };
      cells.set(cellKey(pos), { pos, open: {}, zone: zoneForPos(pos, themeZone), portal: null });
    }
  }

  cells.get(cellKey({ x: 0, y: RADIUS }))!.portal = 'north';
  cells.get(cellKey({ x: 0, y: -RADIUS }))!.portal = 'south';
  cells.get(cellKey({ x: RADIUS, y: 0 }))!.portal = 'east';
  cells.get(cellKey({ x: -RADIUS, y: 0 }))!.portal = 'west';

  // Randomized DFS (recursive backtracker) spanning tree over every cell,
  // starting from the origin. A spanning tree connects every cell to every
  // other cell exactly once, so all 4 portals are always reachable, while
  // naturally producing dead ends elsewhere.
  const visited = new Set<string>([cellKey({ x: 0, y: 0 })]);
  const stack: GridPos[] = [{ x: 0, y: 0 }];

  while (stack.length > 0) {
    const current = stack[stack.length - 1];
    const currentKey = cellKey(current);

    const candidates = shuffle(DIRECTIONS)
      .map((dir) => ({ dir, pos: { x: current.x + DIRECTION_DELTA[dir].x, y: current.y + DIRECTION_DELTA[dir].y } }))
      .filter(({ pos }) => inBounds(pos) && !visited.has(cellKey(pos)));

    if (candidates.length === 0) {
      stack.pop();
      continue;
    }

    const { dir, pos } = candidates[0];
    cells.get(currentKey)!.open[dir] = true;
    cells.get(cellKey(pos))!.open[OPPOSITE[dir]] = true;
    visited.add(cellKey(pos));
    stack.push(pos);
  }

  return { cells, portalsFound: new Set(), themeZone };
}

export function cellAt(maze: DungeonMaze, pos: GridPos): DungeonCell {
  const cell = maze.cells.get(cellKey(pos));
  if (!cell) throw new Error(`No cell at ${cellKey(pos)}`);
  return cell;
}

export function randomStartPosition(): GridPos {
  const candidates: GridPos[] = [];
  for (let x = -1; x <= 1; x++) {
    for (let y = -1; y <= 1; y++) {
      candidates.push({ x, y });
    }
  }
  return candidates[Math.floor(Math.random() * candidates.length)];
}

export interface DungeonMove {
  direction: Direction;
  label: string;
  next: GridPos;
}

export function availableMoves(maze: DungeonMaze, pos: GridPos): DungeonMove[] {
  const cell = cellAt(maze, pos);
  return DIRECTIONS.filter((dir) => cell.open[dir]).map((dir) => ({
    direction: dir,
    label: `${DIRECTION_LABEL[dir]}으로 이동`,
    next: { x: pos.x + DIRECTION_DELTA[dir].x, y: pos.y + DIRECTION_DELTA[dir].y },
  }));
}

export function portalZoneFor(direction: Direction): ArmZone {
  return DIRECTION_TO_ZONE[direction];
}

const BATTLE_CHANCE_ON_MOVE = 0.55;

export function rollBattleOnMove(): boolean {
  return Math.random() < BATTLE_CHANCE_ON_MOVE;
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
