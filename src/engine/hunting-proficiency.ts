import type { StatBonus } from './stat-bonus';

// 사냥 숙련도(designnotes.md 3-1번 "채택 방향") — 몬스터 종류별 누적 처치
// 횟수에 따라 그 몬스터 상대 전투가 실제로 쉬워지는 시스템. "익숙해질수록
// 안전해진다"는 서술을 밸런스 결함으로 억제하는 대신, 몬스터별로 분리된
// 성장 축으로 정식 채택한다 — 특정 몬스터를 오래 파밍해 그 상대가 안전해져도
// 완전히 다른 상위 등급/변이종에는 전혀 적용되지 않으므로, 미궁 전체가
// 안전해지는 게 아니라 그 몬스터 하나에 대한 숙련일 뿐이다.
const KILLS_PER_TIER = 4;
const MAX_TIER = 5;

// 1티어당 부여치. 명중률(공격 성공률)·유연성(회피·치명타율)·손재주(상시
// 피해 감소, engine.ts DEXTERITY_DEFENSE_COEF)에 고르게 나눠, "그 몬스터를
// 상대로만" 때리기도 피하기도 더 쉬워지는 감각을 준다. 최대 티어(5)에서도
// 손재주 +5(=+25%p 피해 감소)는 60% 캡 안쪽이라 무적화되지 않는다.
const TIER_ACCURACY_BONUS = 1;
const TIER_FLEXIBILITY_BONUS = 1;
const TIER_DEXTERITY_BONUS = 1;

export function huntingProficiencyTier(killCount: number): number {
  return Math.min(MAX_TIER, Math.floor(killCount / KILLS_PER_TIER));
}

// killCount번째 처치 이후 적용되는 스탯 보너스. computeTotalStats()가 다루는
// 범용 보너스(장비/정수/업적)와 달리 이 몬스터를 상대할 때만 한 겹 더
// 얹는 용도라, PlayerProfile에 영구 저장하지 않고 전투 시작 시점에 매번
// 다시 계산한다(main.ts의 startZoneBattle 참고).
export function huntingProficiencyBonus(killCount: number): StatBonus {
  const tier = huntingProficiencyTier(killCount);
  if (tier <= 0) return {};
  return {
    accuracy: tier * TIER_ACCURACY_BONUS,
    flexibility: tier * TIER_FLEXIBILITY_BONUS,
    dexterity: tier * TIER_DEXTERITY_BONUS,
  };
}

// UI(전투 화면 등)에서 "숙련도 Lv.N" 배지를 띄울 때 쓴다. 아직 1티어도
// 안 됐으면(처치 4회 미만) 표시할 게 없으니 null.
export function huntingProficiencyLabel(killCount: number): string | null {
  const tier = huntingProficiencyTier(killCount);
  return tier > 0 ? `숙련도 Lv.${tier}` : null;
}
