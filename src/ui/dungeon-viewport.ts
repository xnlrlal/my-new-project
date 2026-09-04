import type { DungeonCell, DungeonMaze, CellId } from '../engine/dungeon';
import { cellAt, isDarkZoneCell } from '../engine/dungeon';

// 1층 동굴(그리드) 전용 렌더러 — 폴라(2층, 구세이브 1층)가 쓰는
// ui/dungeon-minimap.ts는 여기서 전혀 참조하지 않는다(그쪽은 완전히 그대로
// 둠). 두 함수 모두 정방형 좌표계라 폴라 미니맵의 극좌표/호 계산 없이
// 축에 나란한 직선만으로 벽을 그린다.
//
// designnotes.md 20번: "탐험한 만큼만 미로 벽으로 표시"(폴라 미니맵의
// 원칙)를 그리드에도 이어받되, 안 가본 칸의 취급이 결정적으로 다르다 —
// 폴라의 링/8방위 스켈레톤은 매 판 항상 같은 고정 모양이라 미리 보여줘도
// 스포일러가 아니었지만, 셀룰러 오토마타 동굴은 시드마다(사실상 이 게임은
// 고정 시드 하나뿐이지만) 모양 자체가 절차적으로 정해지므로 "칸이
// 존재한다"는 사실 자체가 스포일러다. 그래서 전체맵(renderGridFullMapSvg)은
// 안 가본 칸을 흐린 점조차 없이 완전히 아무것도 그리지 않는다.

const SCALE = 34;
const PADDING = 24;

function buildIndex(maze: DungeonMaze): Map<string, DungeonCell> {
  const index = new Map<string, DungeonCell>();
  for (const cell of maze.cells.values()) index.set(`${cell.row},${cell.col}`, cell);
  return index;
}

// 한 칸의 4변 중 열린 방향(neighbor)을 제외한 나머지에 벽 선을 긋는다.
// existsAndOpen(dr,dc)가 false면(칸이 아예 없거나, 있어도 안 열려 있으면)
// 그 방향은 벽.
function wallLines(
  cx: number,
  cy: number,
  half: number,
  isOpen: (dr: -1 | 1 | 0, dc: -1 | 1 | 0) => boolean
): string {
  const lines: string[] = [];
  // 북(위)
  if (!isOpen(-1, 0)) lines.push(`<line x1="${cx - half}" y1="${cy - half}" x2="${cx + half}" y2="${cy - half}" class="viewport-wall" />`);
  // 남(아래)
  if (!isOpen(1, 0)) lines.push(`<line x1="${cx - half}" y1="${cy + half}" x2="${cx + half}" y2="${cy + half}" class="viewport-wall" />`);
  // 서(왼쪽)
  if (!isOpen(0, -1)) lines.push(`<line x1="${cx - half}" y1="${cy - half}" x2="${cx - half}" y2="${cy + half}" class="viewport-wall" />`);
  // 동(오른쪽)
  if (!isOpen(0, 1)) lines.push(`<line x1="${cx + half}" y1="${cy - half}" x2="${cx + half}" y2="${cy + half}" class="viewport-wall" />`);
  return lines.join('');
}

// 캐릭터 중심 로컬 뷰 — 기본 화면. 반경은 암흑지역(isDarkZoneCell)이면 0
// (자기 칸만), 아니면 1(3×3). 프레임 자체는 항상 3×3 고정 크기로 그려서
// 암흑지역에 들어서도 지도 박스 크기가 안 튀게 하고, 반경 밖 슬롯은 "안
// 보임" 칠로 채운다. maze.visited와 무관하게 지금 서 있는 자리에서
// 실제로 보이는 대로 그린다(탐험 기록이 아니라 "지금 여기서 뭐가
// 보이는가").
export function renderLocalViewportSvg(maze: DungeonMaze, pos: CellId): string {
  const size = 3 * SCALE + PADDING * 2;
  const half = SCALE / 2 - 3;
  const cx0 = PADDING + SCALE / 2;
  const cy0 = PADDING + SCALE / 2;

  const index = buildIndex(maze);
  const current = cellAt(maze, pos);
  const radius = isDarkZoneCell(current, maze) ? 0 : 1;

  const parts: string[] = [];
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      const cx = cx0 + (dc + 1) * SCALE;
      const cy = cy0 + (dr + 1) * SCALE;
      const inRadius = Math.max(Math.abs(dr), Math.abs(dc)) <= radius;
      const cell = inRadius ? index.get(`${current.row + dr},${current.col + dc}`) : undefined;

      if (!cell) {
        parts.push(`<rect x="${cx - SCALE / 2}" y="${cy - SCALE / 2}" width="${SCALE}" height="${SCALE}" class="viewport-unseen" />`);
        continue;
      }

      const isOpen = (ddr: -1 | 1 | 0, ddc: -1 | 1 | 0) => cell.open.has(`grid${cell.row + ddr}-${cell.col + ddc}`);
      parts.push(`<rect x="${cx - SCALE / 2}" y="${cy - SCALE / 2}" width="${SCALE}" height="${SCALE}" class="viewport-floor" />`);
      parts.push(wallLines(cx, cy, half, isOpen));

      if (cell.id === current.id) {
        parts.push(`<circle cx="${cx}" cy="${cy}" r="7" class="viewport-current" />`);
      } else if (cell.portal) {
        parts.push(`<text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="central" class="viewport-portal-mark">★</text>`);
      }
    }
  }

  return `
    <svg class="dungeon-viewport" viewBox="0 0 ${size} ${size}" role="img" aria-label="현재 위치 주변">
      ${parts.join('')}
    </svg>
  `;
}

// 전체맵 — "전체맵" 버튼을 눌렀을 때만 보임. 캔버스 자체는 항상 1층
// 격자 전체 크기(maze.gridSize × gridSize)로 그려서 "지금까지 탐험한
// 부분이 전체 맵 중 어디쯤인지"가 한눈에 보이게 한다(2026-09-04 갱신 —
// 처음엔 방문한 칸의 바운딩 박스만큼만 잘라서 보여줬으나, 그러면 탐험
// 초반엔 좁은 구석 하나가 "전체맵"인 것처럼 보이는 문제가 있어 "전체맵은
// 맵 전체를 띄워줘야지"라는 피드백에 따라 고정 전체 크기로 바꿈).
// 실제로 밟아본(maze.visited) 칸만 그리고, 그 칸 기준으로 벽 유무를
// 판단(이웃 칸 자체의 방문 여부와는 무관 — "이 칸에 서면 보이는 벽은
// 항상 보인다"는 폴라 미니맵과 같은 원칙). 안 가본 칸은 폴라 미니맵과
// 달리 흐린 점조차 없이 아무것도 그리지 않는다(위 파일 상단 설명 참고) —
// 이 부분은 그대로 유지: "전체 맵 크기"를 보여주는 것과 "안 가본 곳의
// 내용을 미리 보여주는 것"은 서로 다른 얘기다.
export function renderGridFullMapSvg(maze: DungeonMaze, pos: CellId): string {
  const size = maze.gridSize;
  const width = size * SCALE + PADDING * 2;
  const height = size * SCALE + PADDING * 2;
  const half = SCALE / 2 - 3;
  const toPx = (row: number, col: number) => ({
    cx: PADDING + col * SCALE + SCALE / 2,
    cy: PADDING + row * SCALE + SCALE / 2,
  });

  const parts: string[] = [`<rect x="${PADDING}" y="${PADDING}" width="${size * SCALE}" height="${size * SCALE}" class="viewport-full-bounds" />`];
  for (const cell of maze.cells.values()) {
    if (!maze.visited.has(cell.id)) continue;
    const { cx, cy } = toPx(cell.row, cell.col);
    const isOpen = (ddr: -1 | 1 | 0, ddc: -1 | 1 | 0) => cell.open.has(`grid${cell.row + ddr}-${cell.col + ddc}`);
    const isCurrent = cell.id === pos;
    const cls = isCurrent ? 'viewport-floor viewport-floor-current' : 'viewport-floor';
    parts.push(`<rect x="${cx - SCALE / 2}" y="${cy - SCALE / 2}" width="${SCALE}" height="${SCALE}" class="${cls}" />`);
    parts.push(wallLines(cx, cy, half, isOpen));
    if (isCurrent) parts.push(`<circle cx="${cx}" cy="${cy}" r="7" class="viewport-current" />`);
    else if (cell.portal) parts.push(`<text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="central" class="viewport-portal-mark">★</text>`);
  }

  return `
    <svg class="dungeon-viewport dungeon-viewport-full" viewBox="0 0 ${width} ${height}" role="img" aria-label="전체맵(가본 곳만 표시)">
      ${parts.join('')}
    </svg>
  `;
}
