export interface VillageHandlers {
  onContinue: () => void;
  onBack: () => void;
  onOpenInventory: () => void;
  onOpenEquipment: () => void;
  onOpenShop: () => void;
  onOpenLibrary: () => void;
}

// hasCharacter=true means race selection is already final (raceId saved) —
// the "뒤로" button that would let a player reselect their race must not
// render then, since character creation is a one-time, irreversible choice
// until death resets the whole save.
export function renderVillage(root: HTMLElement, hasCharacter: boolean, handlers: VillageHandlers) {
  const backButton = hasCharacter ? '' : '<button class="menu-return" id="back-btn">뒤로</button>';

  root.innerHTML = `
    <div class="char-select">
      <h2 class="screen-title">마을</h2>
      <p class="menu-subtitle">모험을 떠나기 전, 잠시 마을에 들렀다.</p>
      <button class="menu-start" id="continue-btn">미궁으로 출발</button>
      <div class="nav-row">
        <button class="menu-return small" id="inventory-btn">인벤토리</button>
        <button class="menu-return small" id="equipment-btn">장비창</button>
      </div>
      <div class="nav-row">
        <button class="menu-return small" id="shop-btn">상점</button>
        <button class="menu-return small" id="library-btn">도서관</button>
      </div>
      ${backButton}
    </div>
  `;

  document.getElementById('continue-btn')?.addEventListener('click', handlers.onContinue);
  document.getElementById('back-btn')?.addEventListener('click', handlers.onBack);
  document.getElementById('inventory-btn')?.addEventListener('click', handlers.onOpenInventory);
  document.getElementById('equipment-btn')?.addEventListener('click', handlers.onOpenEquipment);
  document.getElementById('shop-btn')?.addEventListener('click', handlers.onOpenShop);
  document.getElementById('library-btn')?.addEventListener('click', handlers.onOpenLibrary);
}
