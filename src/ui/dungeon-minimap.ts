import type { DungeonMaze, CellId, DungeonCell } from '../engine/dungeon';
import { ringId } from '../engine/dungeon';

// 미궁 지도(designnotes.md 4-1번 갱신, "현재 위치를 대략적으로 파악") — 실제
// 좌표/타일 기반 렌더러(designnotes.md 13번, 2D 전환)가 들어서기 전까지,
// DungeonCell.pos(추상 좌표)를 그대로 SVG에 얹어 "링 구조 자체는 보여주되
// 아직 안 가본 칸은 무엇이 있는지 감춘다"는 최소한의 지도만 제공한다.
//
// "대략적으로 파악"의 구체적 해석(1차 결정치, 마스터 설정에 근거 없음):
// - 링/슬롯의 존재 자체(중심부+링별 8방위)는 항상 보여준다 — 이건 매번
//   같은 고정 구조라 미리 알아도 스포일러가 아니다(틱택토 판 모양을 아는
//   것과 같은 수준). 안 가본 슬롯은 흐린 점으로만 표시된다.
// - 실제로 밟아본 칸(maze.visited)은 "그 칸에 서 있으면 보이는 벽"까지
//   그대로 그린다(2026-09-04 갱신, 사용자 요청 — "미로처럼 보이게") — 그
//   칸의 4방향(원주 양옆·반지름 안쪽/바깥쪽) 중 실제로 뚫려있지 않은 쪽은
//   벽(선/호)으로, 뚫려있는 쪽은 그냥 비워서 통로처럼 보이게 한다. 이웃
//   칸이 아직 방문 전이어도 "이 칸에 문이 있는지 없는지"는 이 칸에 서
//   있으면 보이는 정보이므로 벽 유무 자체는 이웃의 방문 여부와 무관하게
//   결정된다 — 문 너머(이웃 칸 내부)가 무엇인지만 계속 가려진다.
export function renderMinimapSvg(maze: DungeonMaze, pos: CellId): string {
  const SCALE = 34;
  const PADDING = 24;
  const half = maze.ringCount * SCALE + SCALE / 2 + PADDING;
  const size = half * 2;
  const cx = half;
  const cy = half;

  // index i의 칸은 나침반 방향(90 - i*45도)을 중심으로 ±22.5도 폭의
  // 부채꼴(annular sector)을 차지한다 — ringPos()가 그 중심점만 찍는 것과
  // 같은 각도 규칙을 그대로 부채꼴 경계로 확장한 것.
  const polarToPx = (radiusPx: number, angleDeg: number) => {
    const rad = (angleDeg * Math.PI) / 180;
    return { x: cx + radiusPx * Math.cos(rad), y: cy - radiusPx * Math.sin(rad) };
  };

  // 45도 미만(항상 그러함, 슬롯 하나 폭)인 짧은 호 하나를 그리는 SVG arc
  // 커맨드. large-arc-flag=0, sweep-flag=0(반시계 방향)으로 고정 — 각도가
  // 커지는 방향(aLo->aHi)이 화면(y가 아래로 갈수록 커지는 SVG 좌표계에서
  // polarToPx가 y를 뒤집어 그리는 방식) 기준 반시계 방향이기 때문.
  const arcPath = (radiusPx: number, aLo: number, aHi: number) => {
    const p1 = polarToPx(radiusPx, aLo);
    const p2 = polarToPx(radiusPx, aHi);
    return `M ${p1.x} ${p1.y} A ${radiusPx} ${radiusPx} 0 0 0 ${p2.x} ${p2.y}`;
  };

  const nodePx = (cell: DungeonCell) => ({ px: cx + cell.pos.x * SCALE, py: cy - cell.pos.y * SCALE });

  const lines: string[] = [];
  const walls: string[] = [];
  const nodes: string[] = [];

  const cells = [...maze.cells.values()];

  for (const cell of cells) {
    if (cell.id === 'center') continue;
    const r = cell.ring;
    const i = cell.index;
    const rInner = (r - 0.5) * SCALE;
    const rOuter = (r + 0.5) * SCALE;
    const aLo = 90 - i * 45 - 22.5;
    const aHi = 90 - i * 45 + 22.5;

    if (maze.visited.has(cell.id)) {
      // 반지름 방향(안쪽) 벽 — r=1이면 안쪽 이웃은 중심부.
      const innerNeighborId = r === 1 ? 'center' : ringId(r - 1, i);
      if (!cell.open.has(innerNeighborId)) walls.push(`<path d="${arcPath(rInner, aLo, aHi)}" class="minimap-wall" />`);

      // 반지름 방향(바깥쪽) 벽 — 가장자리 고리(r=ringCount)는 지도의
      // 물리적 경계라 이웃 칸 자체가 없으므로 항상 벽.
      const outerNeighborId = r < maze.ringCount ? ringId(r + 1, i) : null;
      if (!outerNeighborId || !cell.open.has(outerNeighborId)) {
        walls.push(`<path d="${arcPath(rOuter, aLo, aHi)}" class="minimap-wall" />`);
      }

      // 원주 방향 양옆 벽 — 같은 링의 이웃 슬롯(i-1, i+1)과 연결 안 돼
      // 있으면 그 경계를 막힌 벽으로 그린다.
      const prevId = ringId(r, i - 1);
      if (!cell.open.has(prevId)) {
        const a = polarToPx(rInner, aLo);
        const b = polarToPx(rOuter, aLo);
        walls.push(`<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" class="minimap-wall" />`);
      }
      const nextId = ringId(r, i + 1);
      if (!cell.open.has(nextId)) {
        const a = polarToPx(rInner, aHi);
        const b = polarToPx(rOuter, aHi);
        walls.push(`<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" class="minimap-wall" />`);
      }
    }
  }

  // 방문한 두 칸이 서로 오간 적 있는 통로만 중심선으로 한 번 더 표시 —
  // 벽만으로는 "어느 쪽이 실제로 걸어본 길인지"까지는 드러나지 않으므로,
  // 걸어본 경로 자체를 강조하는 용도로 유지한다.
  for (const cell of cells) {
    if (!maze.visited.has(cell.id)) continue;
    for (const neighborId of cell.open) {
      if (neighborId <= cell.id) continue;
      if (!maze.visited.has(neighborId)) continue;
      const neighbor = maze.cells.get(neighborId);
      if (!neighbor) continue;
      const a = nodePx(cell);
      const b = nodePx(neighbor);
      lines.push(`<line x1="${a.px}" y1="${a.py}" x2="${b.px}" y2="${b.py}" class="minimap-path" />`);
    }
  }

  for (const cell of cells) {
    const { px, py } = nodePx(cell);
    const visited = maze.visited.has(cell.id);
    const isCurrent = cell.id === pos;
    const isPortal = visited && cell.portal !== null;

    // 안 가본 슬롯은 여전히 흐린 점 하나로만 존재를 알려준다(스포일러가
    // 되지 않는 "판 모양" 정보). 가본 칸은 벽이 방을 다 보여주므로 굳이
    // 큰 점을 또 찍지 않고, 중심부/현재 위치/포탈만 표식을 남긴다.
    if (!visited) {
      nodes.push(`<g class="minimap-node minimap-node-unknown"><circle cx="${px}" cy="${py}" r="3" /></g>`);
      continue;
    }

    // 평범한 방문 칸(중심부도 포탈도 현재 위치도 아님)은 벽이 방을 다
    // 보여주므로 굳이 점을 또 찍지 않는다.
    if (!isCurrent && !isPortal && cell.id !== 'center') continue;

    let cls = 'minimap-node';
    if (isCurrent) cls += ' minimap-node-current';
    else if (isPortal) cls += ' minimap-node-portal';
    else cls += ' minimap-node-center';

    const radius = isCurrent ? 8 : cell.id === 'center' ? 7 : 6;
    const label = cell.id === 'center' ? '●' : isPortal ? '★' : '';

    nodes.push(
      `<g class="${cls}"><circle cx="${px}" cy="${py}" r="${radius}" />${
        label ? `<text x="${px}" y="${py}" text-anchor="middle" dominant-baseline="central">${label}</text>` : ''
      }</g>`
    );
  }

  return `
    <svg class="dungeon-minimap" viewBox="0 0 ${size} ${size}" role="img" aria-label="미궁 지도(대략적인 현재 위치)">
      ${lines.join('')}
      ${walls.join('')}
      ${nodes.join('')}
    </svg>
  `;
}
