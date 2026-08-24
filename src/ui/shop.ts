export interface ShopHandlers {
  onBack: () => void;
}

export function renderShop(root: HTMLElement, handlers: ShopHandlers) {
  root.innerHTML = `
    <div class="char-select">
      <h2 class="screen-title">상점</h2>
      <p class="menu-subtitle">아직 물건을 팔고 있지 않다. 곧 문을 열 예정이다.</p>
      <button class="menu-return" id="back-btn">뒤로</button>
    </div>
  `;

  document.getElementById('back-btn')?.addEventListener('click', handlers.onBack);
}
