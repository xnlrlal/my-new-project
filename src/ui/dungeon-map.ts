import type { ArmZone, DungeonCell, DungeonMove } from '../engine/dungeon';
import { zoneFlavor, zoneLabel } from '../engine/dungeon';

export interface DungeonMapHandlers {
  onMove: (move: DungeonMove) => void;
  onEnterPortal: (zone: ArmZone) => void;
  onRevertToFloor1: () => void;
  onOpenInventory: () => void;
  onOpenEquipment: () => void;
  onOpenEssence: () => void;
}

export function renderDungeonMap(
  root: HTMLElement,
  floorLabel: string,
  floor: number,
  cell: DungeonCell,
  moves: DungeonMove[],
  message: string | null,
  portalMessage: string | null,
  floor1RevertLocked: boolean,
  handlers: DungeonMapHandlers
) {
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

  root.innerHTML = `
    <div class="battle-nav">
      <button class="nav-link" id="open-inventory">인벤토리</button>
      <button class="nav-link" id="open-equipment">장비창</button>
      <button class="nav-link" id="open-codex">정수창</button>
    </div>
    <div class="dungeon-floor">${floorLabel}</div>
    <div class="dungeon-screen">
      <div class="stats-card">
        <div class="stats-race">${zoneLabel(cell.zone)}</div>
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
}
