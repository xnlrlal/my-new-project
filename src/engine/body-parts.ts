import type { Actor, BodyPart } from './types';

// 부위 손상(designnotes.md 3-3번, 마스터 설정으로 확정된 일반 전투 메커닉):
// "공격을 받으면 신체의 특정 부위가 손상될 수 있다. 부상은 실제 신체 기능
// 저하로 이어진다." HP·상태이상(독/출혈/기절)과 완전히 독립된 세 번째 축이라
// 이 파일도 status-effects.ts와 마찬가지로 별도 모듈로 둔다.
//
// 구체 판정식(어떤 공격이 어떤 확률로 어느 부위를, 손상 정도는 어느 수준까지)은
// 마스터 설정에서도 명시적으로 미확정 — 아래는 1차 구현 초안이다:
//   - 명중한 공격마다 고정 확률로 방어자의 무작위 부위 하나가 손상된다
//     (치명타 여부와 무관 — 크리티컬 로직과는 별개 축).
//   - 부위마다 손상 시 실제 전투 스탯이 즉시, 이번 전투가 끝날 때까지
//     깎인다(제자리에서 스탯을 낮추는 방식 — 값이 얼마나 깎였는지, 어떻게
//     회복/치료하는지는 미확정이라 지금은 "이번 전투 한정"으로 스코프를
//     좁혔다. 관찰된 두 사례(고블린 덫→오른발 손상이 이후로도 이어지는
//     듯한 서술, 수면 중 피격→왼팔 손상이 그 뒤로도 지속)는 전투를 넘어선
//     영구 부상을 시사하지만, 정확한 지속 기간·치료 수단이 확정되기 전엔
//     세이브에 영구 반영하는 게 오히려 위험하다고 판단했다 — 나중에 실제
//     설계가 확정되면 이 배열을 PlayerProfile로 승격하고 치료 아이템/시간
//     경과 등을 연결하면 된다).
//   - 같은 부위는 이번 전투 동안 두 번 손상되지 않는다(중복 손상의 정도
//     차등도 미확정이라 1차 구현에서는 "손상됨/안됨" 이진 상태로 단순화).
//   - 머리는 대상에서 제외된다 — 머리 손상은 engine.ts의 기존 즉사(헤드샷)
//     판정이 이미 다루고 있다(designnotes.md 3-2번: "헤드샷 즉사는 부위
//     손상의 극단적 사례로 재해석").

const BODY_PART_DAMAGE_CHANCE = 8; // 명중한 공격 1회당 부위 손상 확률(%) — 1차 추정치

const BODY_PARTS: BodyPart[] = ['torso', 'leftArm', 'rightArm', 'leftLeg', 'rightLeg'];

export const BODY_PART_LABELS: Record<BodyPart, string> = {
  torso: '몸통',
  leftArm: '왼팔',
  rightArm: '오른팔',
  leftLeg: '왼다리',
  rightLeg: '오른다리',
};

// 부위마다 어떤 세부스탯이 얼마나 깎이는지 — 팔은 무기를 다루는 부위라
// 명중률, 다리는 몸을 지탱/회피하는 부위라 유연성, 몸통은 전신 회복력과
// 이어진다고 보아 인내심(자연재생력)을 깎는다. -3은 종족 기본값이 대개
// 0인 세부스탯 기준(races.ts 참고) 체감 가능한 페널티가 되도록 잡은
// 1차 추정치.
const STAT_PENALTY = 3;

function applyPartPenalty(actor: Actor, part: BodyPart): Actor {
  switch (part) {
    case 'leftArm':
    case 'rightArm':
      return { ...actor, accuracy: actor.accuracy - STAT_PENALTY };
    case 'leftLeg':
    case 'rightLeg':
      return { ...actor, flexibility: actor.flexibility - STAT_PENALTY };
    case 'torso':
      return { ...actor, willpower: actor.willpower - STAT_PENALTY };
  }
}

const PART_EFFECT_LABELS: Record<BodyPart, string> = {
  torso: '인내심 저하',
  leftArm: '명중률 저하',
  rightArm: '명중률 저하',
  leftLeg: '유연성 저하',
  rightLeg: '유연성 저하',
};

export interface BodyPartDamageResult {
  actor: Actor;
  message: string | null;
}

// applyCard(engine.ts)가 명중한 데미지 카드마다 방어자를 대상으로 호출한다.
// 확률에 실패하거나, 이미 모든 부위가 손상된 상태면 아무 일도 일어나지
// 않는다(message: null — 로그에 아무것도 덧붙이지 않음).
export function maybeDamageBodyPart(target: Actor, targetLabel: string): BodyPartDamageResult {
  if (Math.random() * 100 >= BODY_PART_DAMAGE_CHANCE) return { actor: target, message: null };

  const candidates = BODY_PARTS.filter((part) => !target.damagedParts.includes(part));
  if (candidates.length === 0) return { actor: target, message: null };

  const part = candidates[Math.floor(Math.random() * candidates.length)];
  const damaged = applyPartPenalty(
    { ...target, damagedParts: [...target.damagedParts, part] },
    part
  );
  const message = `${targetLabel}의 ${BODY_PART_LABELS[part]}이(가) 손상되었다! (${PART_EFFECT_LABELS[part]})`;
  return { actor: damaged, message };
}

// 순수 표시용 포맷터 — statusEffectsText(status-effects.ts)와 같은 역할을
// battle.ts에서 맡는다.
export function damagedPartsText(actor: Actor): string {
  if (actor.damagedParts.length === 0) return '';
  return `부상: ${actor.damagedParts.map((part) => BODY_PART_LABELS[part]).join(' · ')}`;
}
