export const COLORS = {
  bg: '#0E1117',
  bgAlt: '#161B22',
  card: '#1F2630',
  cardEdge: '#2A3340',
  text: '#F2F4F8',
  textDim: '#8B95A5',
  accent: '#F25F4C',
  accentSoft: 'rgba(242,95,76,0.18)',
  accentPressed: '#D94B3A',
  toggleOn: '#F25F4C',
  toggleOff: '#1F2630',
  die: '#FAFAFA',
  diePip: '#0E1117',
  dieEdge: '#E2E5EA',
  rowBtn: '#2A3340',
  danger: '#7A2A2A',
  jail: '#E11D48',
  jailSoft: 'rgba(225,29,72,0.15)',
  lock: '#5A6478',
};

export const MIN_DICE = 1;
export const MAX_DICE = 10;
export const MIN_PLAYERS = 1;
export const MAX_PLAYERS = 8;

export const ROLL_DURATION_MS = 720;
export const CYCLE_INTERVAL_MS = 45;
export const SHAKE_LEG_MS = 70;

export const clampDice = (n) =>
  Math.max(MIN_DICE, Math.min(MAX_DICE, Math.round(n) || MIN_DICE));

export const clampPlayers = (n) =>
  Math.max(MIN_PLAYERS, Math.min(MAX_PLAYERS, Math.round(n) || MIN_PLAYERS));

export const FACE_PIPS = {
  1: [false, false, false, false, true, false, false, false, false],
  2: [true, false, false, false, false, false, false, false, true],
  3: [true, false, false, false, true, false, false, false, true],
  4: [true, false, true, false, false, false, true, false, true],
  5: [true, false, true, false, true, false, true, false, true],
  6: [true, false, true, true, false, true, true, false, true],
};

export const randomFace = () => 1 + Math.floor(Math.random() * 6);
export const makeDice = (n) => Array.from({ length: n }, randomFace);

export const dieSizeForCount = (n) => {
  if (n <= 1) return 116;
  if (n <= 2) return 96;
  if (n <= 4) return 76;
  if (n <= 6) return 60;
  return 50;
};
