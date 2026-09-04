import type { DungeonMaze, CellId } from '../engine/dungeon';

// 미궁 지도(designnotes.md 4-1번 갱신, "현재 위치를 대략적으로 파악") — 실제
// 좌표/타일 기반 렌더러(designnotes.md 13번, 2D 전환)가 들어서기 전까지,
// DungeonCell.pos(추상 좌표)를 그대로 SVG에 얹어 "링 구조 자체는 보여주되
// 아직 안 가본 칸은 무엇이 있는지 감춘다"는 최소한의 지도만 제공한다.
//
// "대략적으로 파악"의 구체적 해석(1차 결정치, 마스터 설정에 근거 없음):
// - 링/슬롯의 존재 자체(중심부+링별 8방위)는 항상 보여준다 — 이건 매번
//   같은 고정 구조라 미리 알아도 스포일러가 아니다(틱택토 판 모양을 아는
//   것과 같은 수준).
// - 실제로 밟아본 칸(maze.visited)만 구역/포탈 여부가 드러나고, 안 가본
//   칸은 무엇인지 알 수 없는 "?"로만 표시된다 — 함정 위치나 미로가 어느
//   쪽으로 막혀있는지는 여전히 직접 가봐야 안다.
// - 두 칸을 실제로 오간 적이 있을 때만(둘 다 visited이고 서로 open) 그
//   사이에 선을 그어 "이미 뚫어본 통로"를 보여준다.
export function renderMinimapSvg(maze: DungeonMaze, pos: CellId): string {
  const SCALE = 42;
  const PADDING = 24;
  const half = maze.ringCount * SCALE + PADDING;
  const size = half * 2;
  const cx = half;
  const cy = half;

  const toPx = (x: number, y: number) => ({ px: cx + x * SCALE, py: cy - y * SCALE });

  const cells = [...maze.cells.values()];

  // 방문한 두 칸이 서로 오간 적 있는 통로만 선으로 표시. 같은 쌍이 두 번
  // 그려지지 않도록 id 문자열 비교로 한쪽 방향만 채택.
  const edgeLines: string[] = [];
  for (const cell of cells) {
    if (!maze.visited.has(cell.id)) continue;
    for (const neighborId of cell.open) {
      if (neighborId <= cell.id) continue;
      if (!maze.visited.has(neighborId)) continue;
      const neighbor = maze.cells.get(neighborId);
      if (!neighbor) continue;
      const a = toPx(cell.pos.x, cell.pos.y);
      const b = toPx(neighbor.pos.x, neighbor.pos.y);
      edgeLines.push(`<line x1="${a.px}" y1="${a.py}" x2="${b.px}" y2="${b.py}" class="minimap-edge" />`);
    }
  }

  const nodes: string[] = [];
  for (const cell of cells) {
    const { px, py } = toPx(cell.pos.x, cell.pos.y);
    const visited = maze.visited.has(cell.id);
    const isCurrent = cell.id === pos;
    const isPortal = visited && cell.portal !== null;

    let cls = 'minimap-node';
    if (isCurrent) cls += ' minimap-node-current';
    else if (isPortal) cls += ' minimap-node-portal';
    else if (visited) cls += ' minimap-node-visited';
    else cls += ' minimap-node-unknown';

    const radius = isCurrent ? 8 : 6;
    const label = visited ? (cell.id === 'center' ? '●' : isPortal ? '★' : '') : '';

    nodes.push(
      `<g class="${cls}"><circle cx="${px}" cy="${py}" r="${radius}" />${
        label ? `<text x="${px}" y="${py}" text-anchor="middle" dominant-baseline="central">${label}</text>` : ''
      }</g>`
    );
  }

  return `
    <svg class="dungeon-minimap" viewBox="0 0 ${size} ${size}" role="img" aria-label="미궁 지도(대략적인 현재 위치)">
      ${edgeLines.join('')}
      ${nodes.join('')}
    </svg>
  `;
}
