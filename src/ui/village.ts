export interface VillageHandlers {
  onContinue: () => void;
  onBack: () => void;
}

export function renderVillage(root: HTMLElement, handlers: VillageHandlers) {
  root.innerHTML = `
    <div class="char-select">
      <h2 class="screen-title">마을</h2>
      <p class="menu-subtitle">모험을 떠나기 전, 잠시 마을에 들렀다.</p>
      <button class="menu-start" id="continue-btn">미궁으로 출발</button>
      <button class="menu-return" id="back-btn">뒤로</button>
    </div>
  `;

  document.getElementById('continue-btn')?.addEventListener('click', handlers.onContinue);
  document.getElementById('back-btn')?.addEventListener('click', handlers.onBack);
}
