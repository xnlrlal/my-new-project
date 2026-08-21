import type { DungeonMap, DungeonMove, DungeonPosition } from '../engine/dungeon';
import { availableMoves, isAtPortal, zoneFlavor, zoneLabel } from '../engine/dungeon';

export interface DungeonMapHandlers {
  onMove: (next: DungeonPosition) => void;
  onAdvanceFloor: () => void;
  onExitToMenu: () => void;
  onOpenInventory: () => void;
  onOpenEquipment: () => void;
  onOpenEssence: () => void;
}

export function renderDungeonMap(
  root: HTMLElement,
  floor: number,
  pos: DungeonPosition,
  map: DungeonMap,
  message: string | null,
  portalMessage: string | null,
  handlers: DungeonMapHandlers
) {
  const atPortal = isAtPortal(map, pos);
  const moves: DungeonMove[] = atPortal ? [] : availableMoves(pos, map);

  const locationLine =
    pos.zone === 'center' ? zoneLabel('center') : `${zoneLabel(pos.zone)} · ${pos.distance}걸음째`;

  const portalPanel = atPortal
    ? `
      <div class="essence-drop">
        <div class="essence-drop-title">포탈비석을 발견했습니다!</div>
        ${portalMessage ? `<div class="essence-drop-detail">${portalMessage}</div>` : ''}
        <div class="essence-drop-actions">
          <button class="menu-start" id="advance-floor">다음 층으로 이동</button>
        </div>
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
    <div class="dungeon-floor">미궁 ${floor}층</div>
    <div class="dungeon-screen">
      <div class="stats-card">
        <div class="stats-race">${locationLine}</div>
        <div class="stat-line">${zoneFlavor(pos.zone)}</div>
        ${message ? `<div class="stat-line dungeon-message">${message}</div>` : ''}
      </div>
      ${portalPanel}
      ${!atPortal ? `<div class="race-list">${movesHtml}</div>` : ''}
      <button class="menu-return small" id="exit-menu">메인 메뉴로</button>
    </div>
  `;

  root.querySelectorAll<HTMLButtonElement>('[data-move-index]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const index = Number(btn.dataset.moveIndex);
      handlers.onMove(moves[index].next);
    });
  });

  document.getElementById('advance-floor')?.addEventListener('click', handlers.onAdvanceFloor);
  document.getElementById('exit-menu')?.addEventListener('click', handlers.onExitToMenu);
  document.getElementById('open-inventory')?.addEventListener('click', handlers.onOpenInventory);
  document.getElementById('open-equipment')?.addEventListener('click', handlers.onOpenEquipment);
  document.getElementById('open-codex')?.addEventListener('click', handlers.onOpenEssence);
}
