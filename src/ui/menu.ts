export interface MenuHandlers {
  onStart: () => void;
  onOpenInventory: () => void;
}

export function renderMenu(root: HTMLElement, handlers: MenuHandlers) {
  root.innerHTML = `
    <div class="menu">
      <h1 class="menu-title">my-new-project</h1>
      <p class="menu-subtitle">카드 전략 배틀</p>
      <div class="menu-rules">
        <p>마나를 사용해 카드를 내고, 적의 체력을 먼저 0으로 만들면 승리합니다.</p>
        <p>모든 전투 과정은 하단 로그에 기록됩니다.</p>
      </div>
      <button class="menu-start" id="start-btn">게임 시작</button>
      <button class="menu-return" id="inventory-btn">인벤토리</button>
    </div>
  `;

  document.getElementById('start-btn')?.addEventListener('click', handlers.onStart);
  document.getElementById('inventory-btn')?.addEventListener('click', handlers.onOpenInventory);
}
