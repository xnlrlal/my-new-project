export interface GameLogHandlers {
  onBack: () => void;
}

// 캐릭터 생성 이후 모든 화면에서 열 수 있는 게임 전체 이벤트 로그 화면 —
// 전투 중에만 보이던 battle.ts의 인라인 로그와 달리, 마을/상점/미궁 이동
// 등 전투 밖 이벤트까지 하나로 모아 세션이 끝날 때까지 계속 보여준다
// (main.ts의 gameLog, 세이브에는 저장되지 않음 — 새로고침 시 초기화).
export function renderGameLog(root: HTMLElement, entries: string[], handlers: GameLogHandlers) {
  root.innerHTML = `
    <div class="inventory-screen">
      <h2 class="screen-title">게임 로그</h2>
      <p class="inventory-note">캐릭터 생성 이후 일어난 모든 일을 기록합니다. 새로고침하면 초기화됩니다.</p>
      <div class="log" id="log">
        ${
          entries.length > 0
            ? entries.map((message) => `<div class="log-entry">${message}</div>`).join('')
            : '<div class="stat-line">아직 기록된 로그가 없습니다.</div>'
        }
      </div>
      <button class="menu-return" id="back-btn">뒤로</button>
    </div>
  `;

  const logEl = document.getElementById('log');
  if (logEl) logEl.scrollTop = logEl.scrollHeight;

  document.getElementById('back-btn')?.addEventListener('click', handlers.onBack);
}
