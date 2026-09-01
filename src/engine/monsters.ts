import type { Card } from './types';
import type { StatBonus } from './stat-bonus';
import type { ArmZone, Zone } from './dungeon';
import type { GearTemplate } from './gear';

export type EssenceStatBonus = StatBonus;

export interface EssenceTemplate {
  statBonus: EssenceStatBonus;
  skill: Omit<Card, 'id'>;
}

// 1 = 최강(가장 강함), 9 = 최약(가장 약함) — 숫자가 작을수록 강한 등급제.
export type MonsterGrade = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

const STRONGEST_GRADE: MonsterGrade = 1;
const WEAKEST_GRADE: MonsterGrade = 9;

export interface MonsterDef {
  id: string;
  name: string;
  grade: MonsterGrade;
  // 체력 풀 통일(전 몬스터 100) 이후, 등급에 따른 강함 차이는 전부 아래 세
  // 필드로 표현된다 — combatStatsForGrade()가 이 셋을 등급 하나로부터
  // 도출한다. 명중/치명타 관련 세부스탯(accuracy/flexibility/perceptionJam/
  // obsession/poisonResist)은 여전히 미부여라 engine.ts에서 0 고정.
  strength: number; // 공격력 — engine.ts의 STRENGTH_ATTACK_COEF로 카드 피해 %가산
  dexterity: number; // 방어력 — 상시 피해 감소 %(engine.ts)
  willpower: number; // 자연재생력 — 라운드당 최대체력 회복 %(engine.ts)
  maxHp: number;
  maxMana: number;
  // 이 몬스터가 등장하는 층. 디자인 노트(designnotes.md 4-1/4-3번)가 1층과
  // 2층에 완전히 다른 로스터를 배정하고 있어서 도입한 필드 — zone만으로는
  // "1층 북쪽의 노움"과 "2층 북쪽(고블린 숲)의 고블린 검사/궁수"를 구분할
  // 수 없다(둘 다 zone: 'north'). pickMonsterForFloorAndZone이 zone과 함께
  // 이 필드로도 걸러내 층별 로스터가 섞이지 않게 한다. 3층 이상이 아직
  // 없어 1|2로만 좁혀뒀다 — 나중에 층이 늘어나면 그때 확장.
  floor: 1 | 2;
  zone: ArmZone;
  essence: EssenceTemplate;
  gearDrop: GearTemplate;
}

// 체력을 전부 100으로 통일하면서, "몬스터가 세다"는 감각을 체력 풀 크기
// 대신 공격력/방어력/재생력 세 스탯의 등급별 선형 증가로 재구성한 1차
// 초안 — 정확한 체감은 플레이테스트로 다시 맞출 필요가 있다(설계 논의
// 참고). tier=0(9등급, 최약)~8(1등급, 최강)을 기준으로:
//   - 공격력(strength): tier당 +1 — engine.ts에서 카드 피해에 10%p씩 가산
//   - 방어력(dexterity): tier당 +2 — 상시 피해 감소 %p(최대 48%, 60% 캡 안쪽)
//   - 재생력(willpower): 5등급 이하(더 강한 절반)에만 부여 — 최상위 몬스터일수록
//     장기전에서 더 버티는 쪽을 재생력으로 표현
function combatStatsForGrade(grade: MonsterGrade): { strength: number; dexterity: number; willpower: number } {
  const tier = WEAKEST_GRADE - grade;
  return {
    strength: tier,
    dexterity: tier * 2,
    willpower: grade <= 5 ? (6 - grade) * 2 : 0,
  };
}

// 디자인 노트(designnotes.md)의 몬스터 로스터를 그대로 따른다 — 이전의
// 24종은 코드 작성 시점에 임의로 지어낸 것이라 디자인 노트와 무관했다.
// 디자인 노트는 이름/등급/구역만 정하고 있고 실제 전투 수치(마나/스킬 값/
// 정수·장비 보너스)는 전혀 언급하지 않으므로, 그 부분은 전부 이 파일에서
// 새로 임의 작성한 1차 초안이다 — 요청하면 언제든 값만 바꾸면 된다.
export const MONSTERS: MonsterDef[] = [
  // ── 1층: 수정동굴 (designnotes.md 4-3번) — 전부 9등급, 구역당 1종뿐 ──
  {
    id: 'goblin',
    name: '고블린',
    grade: 9,
    ...combatStatsForGrade(9),
    maxHp: 100,
    maxMana: 2,
    floor: 1,
    zone: 'south',
    essence: {
      statBonus: { strength: 1 },
      skill: { name: '기습', cost: 1, effect: 'damage', value: 12, description: '적에게 12의 피해를 준다.' },
    },
    gearDrop: {
      name: '고블린의 녹슨 검',
      slot: 'weapon',
      statBonus: { strength: 1 },
      description: '고블린이 사용하던 녹슨 검. 공격력이 오른다.',
    },
  },
  {
    id: 'ghoul',
    name: '구울',
    grade: 9,
    ...combatStatsForGrade(9),
    maxHp: 100,
    maxMana: 2,
    floor: 1,
    zone: 'west',
    essence: {
      statBonus: { strength: 1 },
      skill: { name: '날카로운 손톱', cost: 1, effect: 'damage', value: 13, description: '적에게 13의 피해를 준다.' },
    },
    gearDrop: {
      name: '구울의 손톱',
      slot: 'weapon',
      statBonus: { strength: 1 },
      description: '구울의 날카로운 손톱을 다듬어 만든 무기. 공격력이 오른다.',
    },
  },
  {
    id: 'blade-wolf',
    name: '칼날늑대',
    grade: 9,
    ...combatStatsForGrade(9),
    maxHp: 100,
    maxMana: 3,
    floor: 1,
    zone: 'east',
    essence: {
      statBonus: { strength: 1 },
      skill: { name: '베어물기', cost: 1, effect: 'damage', value: 13, description: '적에게 13의 피해를 준다.' },
    },
    gearDrop: {
      name: '칼날늑대의 이빨',
      slot: 'accessory',
      statBonus: { strength: 1 },
      description: '칼날처럼 예리한 늑대의 이빨. 공격력이 오른다.',
    },
  },
  {
    id: 'gnome',
    name: '노움',
    grade: 9,
    ...combatStatsForGrade(9),
    maxHp: 100,
    maxMana: 2,
    floor: 1,
    zone: 'north',
    essence: {
      statBonus: { dexterity: 1 },
      skill: { name: '망치질', cost: 1, effect: 'damage', value: 11, description: '적에게 11의 피해를 준다.' },
    },
    gearDrop: {
      name: '노움의 작은 망치',
      slot: 'weapon',
      statBonus: { dexterity: 1 },
      description: '노움이 쓰던 작업용 망치. 방어력이 오른다.',
    },
  },

  // ── 2층: 고블린 숲(북) (designnotes.md 4-3/4-3-2번) ──
  {
    id: 'goblin-swordsman',
    name: '고블린 검사',
    grade: 8,
    ...combatStatsForGrade(8),
    maxHp: 100,
    maxMana: 3,
    floor: 2,
    zone: 'north',
    essence: {
      statBonus: { strength: 2 },
      skill: { name: '베기 연타', cost: 2, effect: 'damage', value: 20, description: '적에게 20의 피해를 준다.' },
    },
    gearDrop: {
      name: '고블린 검사의 장검',
      slot: 'weapon',
      statBonus: { strength: 2 },
      description: '고블린 검사가 쓰던 장검. 일반 고블린의 것보다 훨씬 무겁고 단단하다.',
    },
  },
  {
    id: 'goblin-archer',
    name: '고블린 궁수',
    grade: 8,
    ...combatStatsForGrade(8),
    maxHp: 100,
    maxMana: 3,
    floor: 2,
    zone: 'north',
    essence: {
      statBonus: { accuracy: 2 },
      skill: {
        name: '맹독 화살',
        cost: 2,
        effect: 'damage',
        value: 14,
        description: '적에게 14의 피해를 주고, 명중 시 독을 부여한다.',
        appliesStatusEffect: { type: 'poison', duration: 3 },
      },
    },
    gearDrop: {
      name: '고블린 궁수의 단궁',
      slot: 'weapon',
      statBonus: { accuracy: 2 },
      description: '고블린 궁수가 쓰던 하프 모양의 작은 단궁. 명중률이 오른다.',
    },
  },

  // ── 2층: 망자의 땅(서) — 구울 계열 ──
  {
    id: 'elder-ghoul',
    name: '엘더구울',
    grade: 7,
    ...combatStatsForGrade(7),
    maxHp: 100,
    maxMana: 3,
    floor: 2,
    zone: 'west',
    essence: {
      statBonus: { strength: 2, maxHp: 3 },
      skill: { name: '썩은 발톱', cost: 2, effect: 'damage', value: 18, description: '적에게 18의 피해를 준다.' },
    },
    gearDrop: {
      name: '엘더구울의 발톱',
      slot: 'weapon',
      statBonus: { strength: 2 },
      description: '엘더구울의 억센 발톱. 공격력이 크게 오른다.',
    },
  },
  {
    id: 'skeleton-warrior',
    name: '스켈레톤 전사',
    grade: 8,
    ...combatStatsForGrade(8),
    maxHp: 100,
    maxMana: 3,
    floor: 2,
    zone: 'west',
    essence: {
      statBonus: { dexterity: 2 },
      skill: { name: '뼈 방패', cost: 1, effect: 'shield', value: 14, description: '방어막 14를 얻는다.' },
    },
    gearDrop: {
      name: '스켈레톤의 낡은 검',
      slot: 'weapon',
      statBonus: { strength: 1 },
      description: '스켈레톤 전사가 휘두르던 검. 공격력이 오른다.',
    },
  },
  {
    id: 'skeleton-archer',
    name: '스켈레톤 궁수',
    grade: 8,
    ...combatStatsForGrade(8),
    maxHp: 100,
    maxMana: 3,
    floor: 2,
    zone: 'west',
    essence: {
      statBonus: { accuracy: 2 },
      skill: { name: '뼈 화살', cost: 1, effect: 'damage', value: 13, description: '적에게 13의 피해를 준다.' },
    },
    gearDrop: {
      name: '스켈레톤의 활',
      slot: 'weapon',
      statBonus: { accuracy: 1 },
      description: '스켈레톤 궁수가 쓰던 활. 명중률이 오른다.',
    },
  },
  {
    id: 'skeleton-mage',
    name: '스켈레톤 마법사',
    grade: 7,
    ...combatStatsForGrade(7),
    maxHp: 100,
    maxMana: 4,
    floor: 2,
    zone: 'west',
    essence: {
      statBonus: { maxMana: 1 },
      skill: { name: '냉기 마법', cost: 2, effect: 'damage', value: 19, description: '적에게 냉기 피해 19를 준다.' },
    },
    gearDrop: {
      name: '스켈레톤 마법사의 지팡이',
      slot: 'weapon',
      statBonus: { maxMana: 1 },
      description: '스켈레톤 마법사가 쓰던 지팡이. 마나가 오른다.',
    },
  },
  {
    id: 'banshee',
    name: '벤시',
    grade: 6,
    ...combatStatsForGrade(6),
    maxHp: 100,
    maxMana: 5,
    floor: 2,
    zone: 'west',
    essence: {
      statBonus: { maxMana: 2 },
      skill: { name: '절규', cost: 2, effect: 'damage', value: 22, description: '적에게 22의 피해를 준다.' },
    },
    gearDrop: {
      name: '벤시의 찢어진 베일',
      slot: 'armor',
      statBonus: { maxMana: 1, dexterity: 1 },
      description: '벤시가 두르던 베일. 마나와 방어력이 오른다.',
    },
  },
  {
    id: 'death-fiend',
    name: '데스핀드',
    grade: 6,
    ...combatStatsForGrade(6),
    maxHp: 100,
    maxMana: 4,
    floor: 2,
    zone: 'west',
    essence: {
      statBonus: { strength: 2, dexterity: 1 },
      skill: { name: '죽음의 손아귀', cost: 2, effect: 'damage', value: 22, description: '적에게 22의 피해를 준다.' },
    },
    gearDrop: {
      name: '데스핀드의 사슬',
      slot: 'accessory',
      statBonus: { strength: 1, dexterity: 1 },
      description: '데스핀드가 두르던 사슬. 공격력과 방어력이 오른다.',
    },
  },

  // ── 2층: 검은 바위산(남) — designnotes.md의 "2F 바위사막" 메모에서
  // 이름을 빌려와 노움/코볼트/스톤골렘을 더 구체적인 변종으로 구체화함 ──
  {
    id: 'corrupted-gnome',
    name: '타락한 노움',
    grade: 8,
    ...combatStatsForGrade(8),
    maxHp: 100,
    maxMana: 3,
    floor: 2,
    zone: 'south',
    essence: {
      statBonus: { dexterity: 2 },
      skill: { name: '타락한 망치질', cost: 2, effect: 'damage', value: 16, description: '적에게 16의 피해를 준다.' },
    },
    gearDrop: {
      name: '타락한 노움의 망치',
      slot: 'weapon',
      statBonus: { strength: 1, dexterity: 1 },
      description: '타락한 노움이 휘두르던 망치. 공격력과 방어력이 오른다.',
    },
  },
  {
    id: 'kobold-shieldbearer',
    name: '코볼트 방패병',
    grade: 8,
    ...combatStatsForGrade(8),
    maxHp: 100,
    maxMana: 3,
    floor: 2,
    zone: 'south',
    essence: {
      statBonus: { dexterity: 3 },
      skill: { name: '방패 밀치기', cost: 1, effect: 'shield', value: 16, description: '방어막 16을 얻는다.' },
    },
    gearDrop: {
      name: '코볼트의 큰 방패',
      slot: 'armor',
      statBonus: { dexterity: 2 },
      description: '코볼트 방패병이 들던 큰 방패. 방어력이 크게 오른다.',
    },
  },
  {
    id: 'stone-golem',
    name: '스톤골렘',
    grade: 7,
    ...combatStatsForGrade(7),
    maxHp: 100,
    maxMana: 2,
    floor: 2,
    zone: 'south',
    essence: {
      statBonus: { maxHp: 6, dexterity: 1 },
      skill: { name: '바위 주먹', cost: 2, effect: 'damage', value: 19, description: '적에게 19의 피해를 준다.' },
    },
    gearDrop: {
      name: '스톤골렘의 파편',
      slot: 'armor',
      statBonus: { dexterity: 2, maxHp: 2 },
      description: '스톤골렘의 몸에서 떨어진 돌 파편으로 만든 갑옷. 방어력과 체력이 오른다.',
    },
  },

  // ── 2층: 짐승의 소굴(동) — 늑대·곰·호랑이 계열 ──
  {
    id: 'wolf',
    name: '늑대',
    grade: 8,
    ...combatStatsForGrade(8),
    maxHp: 100,
    maxMana: 3,
    floor: 2,
    zone: 'east',
    essence: {
      statBonus: { strength: 1 },
      skill: { name: '물어뜯기', cost: 2, effect: 'damage', value: 17, description: '적에게 17의 피해를 준다.' },
    },
    gearDrop: {
      name: '늑대 이빨 목걸이',
      slot: 'accessory',
      statBonus: { strength: 1 },
      description: '늑대의 이빨로 만든 목걸이. 공격력이 오른다.',
    },
  },
  {
    id: 'bear',
    name: '곰',
    grade: 7,
    ...combatStatsForGrade(7),
    maxHp: 100,
    maxMana: 3,
    floor: 2,
    zone: 'east',
    essence: {
      statBonus: { maxHp: 4, strength: 1 },
      skill: { name: '앞발 강타', cost: 2, effect: 'damage', value: 19, description: '적에게 19의 피해를 준다.' },
    },
    gearDrop: {
      name: '곰가죽 갑옷',
      slot: 'armor',
      statBonus: { maxHp: 3 },
      description: '곰의 두꺼운 가죽으로 만든 갑옷. 체력이 오른다.',
    },
  },
  {
    id: 'tiger',
    name: '호랑이',
    grade: 6,
    ...combatStatsForGrade(6),
    maxHp: 100,
    maxMana: 4,
    floor: 2,
    zone: 'east',
    essence: {
      statBonus: { strength: 2, dexterity: 1 },
      skill: { name: '맹수의 도약', cost: 2, effect: 'damage', value: 22, description: '적에게 22의 피해를 준다.' },
    },
    gearDrop: {
      name: '호랑이 가죽',
      slot: 'armor',
      statBonus: { strength: 1, dexterity: 1 },
      description: '호랑이의 무늬 가죽으로 만든 갑옷. 공격력과 방어력이 오른다.',
    },
  },
];

// Grade 1 (strongest) is worth the most exp, grade 9 (weakest) the least —
// the inverse of the raw grade number, since grade itself now runs the
// opposite direction (1 = strongest).
export function expForGrade(grade: number): number {
  return WEAKEST_GRADE + 1 - grade;
}

// 마석 환전소 등급별 환전율(마석 1개당 스톤). 9등급 = 20스톤을 기준선으로,
// 등급이 오를수록 배율이 매 단계 완만해지는 곡선(×4.00 → ×2.50 → ×2.00 →
// ×1.70 → ×1.47 → ×1.36 → ×1.235 → ×1.19)은 유지한 채 절대값만 재조정됨.
// 이전 설계(9등급=500)는 "5층까지 탐험하는 플레이어" 가정으로 시뮬레이션해
// 정했으나, 실제로는 1~2층까지만 구현되어 있어 저층 플레이어 기준으로
// 재검증함: rollTargetGrade(1)={9:40%,8:40%,7:20%}, rollTargetGrade(2)=
// {8:40%,7:40%,6:20%} 실측 분포와 현재 미궁 시계 스케일(하루 60초) 기준
// 연간 최대 기대 수입(~14.6만 스톤)은 연간 세금 70만/혼령각인 80만에는
// 크게 못 미침 — 두 지출 모두 아직 미구현인 3층 이상을 전제로 한 목표이므로,
// TAX_SYSTEM_ENABLED는 그 시점까지 계속 OFF로 유지하기로 함(별도 결정).
const STONE_VALUE_BY_GRADE: Record<MonsterGrade, number> = {
  9: 20,
  8: 80,
  7: 200,
  6: 400,
  5: 680,
  4: 1000,
  3: 1360,
  2: 1680,
  1: 2000,
};

export function stoneValueForGrade(grade: MonsterGrade): number {
  return STONE_VALUE_BY_GRADE[grade];
}

const OCCASIONAL_GRADE_CHANCE = 0.2;

function clampGrade(g: number): MonsterGrade {
  return Math.min(WEAKEST_GRADE, Math.max(STRONGEST_GRADE, g)) as MonsterGrade;
}

// Deeper floors should trend toward stronger (numerically lower) monsters —
// mirrors the pre-inversion "grade = floor, capped at the top" progression,
// just expressed toward STRONGEST_GRADE instead of away from grade 1.
function rollTargetGrade(floor: number): number {
  const primaryGrades = [clampGrade(WEAKEST_GRADE - floor + 1), clampGrade(WEAKEST_GRADE - floor)];
  const occasionalGrade = clampGrade(WEAKEST_GRADE - floor - 1);
  const useOccasional = Math.random() < OCCASIONAL_GRADE_CHANCE;
  return useOccasional ? occasionalGrade : primaryGrades[Math.floor(Math.random() * primaryGrades.length)];
}

export function getMonsterById(id: string): MonsterDef {
  const monster = MONSTERS.find((m) => m.id === id);
  if (!monster) throw new Error(`Unknown monster: ${id}`);
  return monster;
}

export function pickMonsterForFloorAndZone(floor: number, zone: Zone): MonsterDef {
  const targetGrade = rollTargetGrade(floor);
  // floor로 먼저 좁힌다 — zone 값(north/east/south/west)이 1층과 2층 사이에
  // 재사용되기 때문에(디자인 노트가 층마다 완전히 다른 로스터를 배정,
  // MonsterDef.floor 필드 doc 참고), floor 필터가 없으면 1층 노움 자리에
  // 2층 고블린 검사가 섞여 나올 수 있다.
  const floorPool = MONSTERS.filter((m) => m.floor === floor);
  const pool = zone === 'center' ? floorPool : floorPool.filter((m) => m.zone === zone);

  const exact = pool.filter((m) => m.grade === targetGrade);
  if (exact.length > 0) return exact[Math.floor(Math.random() * exact.length)];

  let closest: MonsterDef[] = [];
  let bestDiff = Infinity;
  for (const m of pool) {
    const diff = Math.abs(m.grade - targetGrade);
    if (diff < bestDiff) {
      bestDiff = diff;
      closest = [m];
    } else if (diff === bestDiff) {
      closest.push(m);
    }
  }
  return closest[Math.floor(Math.random() * closest.length)];
}

const ESSENCE_DROP_CHANCE = 0.001;
const MANA_STONE_DROP_CHANCE = 0.9;

export function rollEssenceDrop(): boolean {
  return Math.random() < ESSENCE_DROP_CHANCE;
}

export function rollManaStoneDrop(): boolean {
  return Math.random() < MANA_STONE_DROP_CHANCE;
}
