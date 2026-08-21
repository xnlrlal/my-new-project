export type Zone = 'center' | 'north' | 'east' | 'south' | 'west';
export type ArmZone = 'north' | 'east' | 'south' | 'west';

export const ARMS: ArmZone[] = ['north', 'east', 'south', 'west'];

export interface DungeonPosition {
  zone: Zone;
  distance: number;
}

export interface DungeonMap {
  armLengths: Record<ArmZone, number>;
  portalBonusGranted: boolean;
}

const MIN_ARM_LENGTH = 3;
const MAX_ARM_LENGTH = 6;
const BATTLE_CHANCE_ON_MOVE = 0.55;

function randomArmLength(): number {
  return MIN_ARM_LENGTH + Math.floor(Math.random() * (MAX_ARM_LENGTH - MIN_ARM_LENGTH + 1));
}

export function generateDungeonMap(): DungeonMap {
  const armLengths = {} as Record<ArmZone, number>;
  for (const arm of ARMS) armLengths[arm] = randomArmLength();
  return { armLengths, portalBonusGranted: false };
}

export function randomStartPosition(): DungeonPosition {
  if (Math.random() < 0.5) return { zone: 'center', distance: 0 };
  const arm = ARMS[Math.floor(Math.random() * ARMS.length)];
  return { zone: arm, distance: 1 };
}

export function isAtPortal(map: DungeonMap, pos: DungeonPosition): boolean {
  return pos.zone !== 'center' && pos.distance >= map.armLengths[pos.zone];
}

export interface DungeonMove {
  label: string;
  next: DungeonPosition;
}

export function availableMoves(pos: DungeonPosition, map: DungeonMap): DungeonMove[] {
  if (pos.zone === 'center') {
    return ARMS.map((arm) => ({ label: `${zoneLabel(arm)}으로`, next: { zone: arm, distance: 1 } }));
  }

  const moves: DungeonMove[] = [
    {
      label: pos.distance === 1 ? '중심부로 돌아가기' : '한 걸음 물러나기',
      next: pos.distance === 1 ? { zone: 'center', distance: 0 } : { zone: pos.zone, distance: pos.distance - 1 },
    },
  ];

  if (pos.distance < map.armLengths[pos.zone]) {
    moves.push({ label: '더 깊이 들어가기', next: { zone: pos.zone, distance: pos.distance + 1 } });
  }

  return moves;
}

export function rollBattleOnMove(): boolean {
  return Math.random() < BATTLE_CHANCE_ON_MOVE;
}

export function zoneLabel(zone: Zone): string {
  switch (zone) {
    case 'center':
      return '중심부';
    case 'north':
      return '북쪽 구역';
    case 'east':
      return '동쪽 구역';
    case 'south':
      return '남쪽 구역';
    case 'west':
      return '서쪽 구역';
  }
}

export function zoneFlavor(zone: Zone): string {
  switch (zone) {
    case 'center':
      return '미궁의 중심부. 사방에서 몰려온 것들의 기척이 뒤섞여 있다.';
    case 'north':
      return '서늘한 냉기가 감도는 언데드의 영역.';
    case 'east':
      return '야생 짐승들의 서식지.';
    case 'south':
      return '도적과 몬스터들이 숨어있는 소굴.';
    case 'west':
      return '뜨거운 열기가 느껴지는 위험한 지역.';
  }
}
