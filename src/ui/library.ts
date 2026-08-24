export interface LibraryHandlers {
  onBack: () => void;
}

export function renderLibrary(root: HTMLElement, handlers: LibraryHandlers) {
  root.innerHTML = `
    <div class="char-select">
      <h2 class="screen-title">도서관</h2>
      <p class="menu-subtitle">서가가 텅 비어있다. 아직 채워지지 않은 듯하다.</p>
      <button class="menu-return" id="back-btn">뒤로</button>
    </div>
  `;

  document.getElementById('back-btn')?.addEventListener('click', handlers.onBack);
}
