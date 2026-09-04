import type { ArmZone, CellId, DungeonCell, DungeonMaze, DungeonMove } from '../engine/dungeon';
import { zoneFlavor, zoneLabel } from '../engine/dungeon';
import { POTION } from '../engine/consumables';
import { renderMinimapSvg } from './dungeon-minimap';
import { renderLocalViewportSvg, renderGridFullMapSvg } from './dungeon-viewport';

export interface DungeonMapHandlers {
  onMove: (move: DungeonMove) => void;
  onEnterPortal: (zone: ArmZone) => void;
  onRevertToFloor1: () => void;
  onOpenInventory: () => void;
  onOpenEquipment: () => void;
  onOpenEssence: () => void;
  onUsePotion: () => void;
  // 1층 동굴(그리드)에서만 쓰인다 — 폴라(2층, 구세이브 1층)는 로컬 뷰/전체맵
  // 개념 자체가 없어 토글 버튼도 안 뜨고 이 두 핸들러도 호출되지 않는다.
  // 단일 토글(onToggleFullMap) 대신 명시적 두 핸들러로 나눈 이유: "이미 그
  // 상태인데 또 토글"되는 모호함을 없애기 위함.
  onShowLocalView: () => void;
  onShowFullMap: () => void;
}

export function renderDungeonMap(
  root: HTMLElement,
  floorLabel: string,
  floor: number,
  maze: DungeonMaze,
  pos: CellId,
  cell: DungeonCell,
  moves: DungeonMove[],
  message: string | null,
  portalMessage: string | null,
  floor1RevertLocked: boolean,
  dungeonClockLabel: string | null,
  hp: number,
  maxHp: number,
  potionCount: number,
  // 1층 동굴(그리드)에서만 의미 있음 — 폴라 미궁에서는 무시된다(아래 분기).
  showFullMap: boolean,
  handlers: DungeonMapHandlers
) {
  const clockHtml = dungeonClockLabel
    ? `<div class="stat-line dungeon-clock" style="text-align:center;font-weight:600">${dungeonClockLabel}</div>`
    : '';

  const hpPct = Math.round((hp / maxHp) * 100);
  // 포션(designnotes.md 2번 섹션)은 전투 화면(ui/battle.ts)이 아니라 여기,
  // 미궁 이동 화면에서만 사용 가능 — "전투 중 포션 사용 금지" 결정을 별도
  // 플래그 없이 화면 배치만으로 자연스럽게 지킨다.
  const canUsePotion = potionCount > 0 && hp < maxHp;
  const potionHtml =
    potionCount > 0
      ? `<button class="menu-return small" id="use-potion" ${canUsePotion ? '' : 'disabled'}>${POTION.name} 사용 (보유 ${potionCount}개)</button>`
      : '';

  const portalPanel = cell.portal
    ? floor === 1
      ? `
        <div class="essence-drop">
          <div class="essence-drop-title">${zoneLabel(cell.portal)} 포탈비석을 발견했습니다!</div>
          ${portalMessage ? `<div class="essence-drop-detail">${portalMessage}</div>` : ''}
          <div class="essence-drop-actions">
            <button class="menu-start" id="enter-portal">이 포탈로 2층 입장</button>
          </div>
        </div>
      `
      : `
        <div class="essence-drop">
          <div class="essence-drop-title">포탈비석을 발견했습니다!</div>
          ${portalMessage ? `<div class="essence-drop-detail">${portalMessage}</div>` : ''}
          ${
            floor1RevertLocked
              ? '<div class="essence-drop-detail">이 포탈은 더 이상 1층으로 연결되지 않습니다.</div>'
              : `
                <div class="essence-drop-actions">
                  <button class="menu-return" id="revert-floor1">1층으로 귀환</button>
                </div>
              `
          }
          <div class="essence-drop-detail">다음 구간은 아직 준비 중입니다. 이어서 업데이트될 예정입니다.</div>
        </div>
      `
    : '';

  const movesHtml = moves
    .map((move, index) => `<button class="race-card" data-move-index="${index}">${move.label}</button>`)
    .join('');

  // 폴라(2층, 구세이브 1층)는 기존 풀 미니맵을 그대로 쓰고 토글 버튼 자체가
  // 없다 — 1층 동굴(그리드)만 로컬 뷰(기본)/전체맵 두 버튼을 갖는다.
  const mapHtml =
    maze.topology === 'polar'
      ? `<div class="dungeon-minimap-wrap">${renderMinimapSvg(maze, pos)}</div>`
      : `
        <div class="dungeon-minimap-wrap">${showFullMap ? renderGridFullMapSvg(maze, pos) : renderLocalViewportSvg(maze, pos)}</div>
        <div class="nav-row">
          <button class="menu-return small${showFullMap ? '' : ' active'}" id="show-local-view">로컬 뷰</button>
          <button class="menu-return small${showFullMap ? ' active' : ''}" id="show-full-map">전체맵</button>
        </div>
      `;

  root.innerHTML = `
    <div class="battle-nav">
      <button class="nav-link" id="open-inventory">인벤토리</button>
      <button class="nav-link" id="open-equipment">장비창</button>
      <button class="nav-link" id="open-codex">정수창</button>
    </div>
    <div class="dungeon-floor">${floorLabel}</div>
    ${clockHtml}
    ${mapHtml}
    <div class="dungeon-screen">
      <div class="stats-card">
        <div class="stats-race">${zoneLabel(cell.zone)}</div>
        <div class="bar"><div class="bar-fill" style="width:${hpPct}%"></div></div>
        <div class="stat-line">HP ${hpPct}%</div>
        ${potionHtml}
        <div class="stat-line">${zoneFlavor(cell.zone)}</div>
        ${message ? `<div class="stat-line dungeon-message">${message}</div>` : ''}
      </div>
      ${portalPanel}
      <div class="race-list">${movesHtml}</div>
    </div>
  `;

  root.querySelectorAll<HTMLButtonElement>('[data-move-index]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const index = Number(btn.dataset.moveIndex);
      handlers.onMove(moves[index]);
    });
  });

  document.getElementById('enter-portal')?.addEventListener('click', () => {
    if (cell.portal) handlers.onEnterPortal(cell.portal);
  });
  document.getElementById('revert-floor1')?.addEventListener('click', handlers.onRevertToFloor1);
  document.getElementById('open-inventory')?.addEventListener('click', handlers.onOpenInventory);
  document.getElementById('open-equipment')?.addEventListener('click', handlers.onOpenEquipment);
  document.getElementById('open-codex')?.addEventListener('click', handlers.onOpenEssence);
  document.getElementById('use-potion')?.addEventListener('click', handlers.onUsePotion);
  document.getElementById('show-local-view')?.addEventListener('click', handlers.onShowLocalView);
  document.getElementById('show-full-map')?.addEventListener('click', handlers.onShowFullMap);
}
