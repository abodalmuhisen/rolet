import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import DraggableFlatList, {
  ScaleDecorator,
} from 'react-native-draggable-flatlist';
import { SafeAreaView } from 'react-native-safe-area-context';
import Die from '../components/Die';
import HistoryModal from '../components/HistoryModal';
import { useGames } from '../context/GamesContext';
import {
  COLORS,
  CYCLE_INTERVAL_MS,
  ROLL_DURATION_MS,
  SHAKE_LEG_MS,
  dieSizeForCount,
  makeDice,
} from '../theme';

let nextPlayerId = 1;
const newPlayerId = () => `gp-${Date.now()}-${nextPlayerId++}`;

const buildPlayers = (names) =>
  names.map((name, i) => ({
    id: newPlayerId(),
    name: name || `Player ${i + 1}`,
    lastRoll: null,
    history: [],
    consecutiveDoubles: 0,
    lastOutcome: null,
  }));

/** Monopoly: two dice, doubles chain and 3rd double → jail. */
function monopolyDiceOutcome(finalDice, prevConsecutiveDoubles) {
  const prevConsec = prevConsecutiveDoubles || 0;
  const isDouble =
    finalDice.length === 2 && finalDice[0] === finalDice[1];
  let outcome = 'normal';
  let nextConsec = 0;
  if (isDouble) {
    const candidate = prevConsec + 1;
    if (candidate >= 3) {
      outcome = 'jail';
      nextConsec = 0;
    } else {
      outcome = 'doubles';
      nextConsec = candidate;
    }
  }
  return { outcome, nextConsec };
}

function clonePlayersForSave(players) {
  return players.map((p) => ({
    ...p,
    lastRoll: p.lastRoll ? [...p.lastRoll] : null,
    history: (p.history || []).map((e) => ({
      ...e,
      dice: [...e.dice],
    })),
  }));
}

function buildInitialGameState(params, diceCount) {
  const restore = params?.restoreSession;
  const names = params?.playerNames || ['Player 1', 'Player 2'];
  if (restore?.players?.length) {
    const players = restore.players.map((p) => ({
      ...p,
      lastRoll: p.lastRoll ? [...p.lastRoll] : null,
      history: Array.isArray(p.history)
        ? p.history.map((e) => ({
            ...e,
            dice: [...e.dice],
          }))
        : [],
    }));
    let currentPlayerId = restore.currentPlayerId;
    if (!players.some((p) => p.id === currentPlayerId)) {
      currentPlayerId = players[0]?.id ?? null;
    }
    const dice =
      Array.isArray(restore.dice) && restore.dice.length === diceCount
        ? [...restore.dice]
        : makeDice(diceCount);
    return { players, currentPlayerId, dice };
  }
  const players = buildPlayers(names);
  return {
    players,
    currentPlayerId: players[0]?.id ?? null,
    dice: makeDice(diceCount),
  };
}

function initialSessionIdFromParams(params) {
  return (
    params?.restoreSession?.sessionId ??
    params?.sessionId ??
    `s-${Date.now()}`
  );
}

export default function GameScreen({ navigation, route }) {
  const { gameId } = route.params || {};
  const { getGame, saveGameSession } = useGames();
  const game = getGame(gameId);
  const diceCount = game ? game.diceCount : 2;
  const dieSize = dieSizeForCount(diceCount);

  const initial = buildInitialGameState(route.params, diceCount);

  const [dice, setDice] = useState(() => initial.dice);
  const [isRolling, setIsRolling] = useState(false);
  const [players, setPlayers] = useState(() => initial.players);
  const [currentPlayerId, setCurrentPlayerId] = useState(
    () => initial.currentPlayerId
  );
  const [historyPlayerId, setHistoryPlayerId] = useState(null);

  const shake = useRef(new Animated.Value(0)).current;
  const bounce = useRef(new Animated.Value(1)).current;
  const masterTimer = useRef(new Animated.Value(0)).current;
  const cycleTimer = useRef(null);
  const shakeAnim = useRef(null);
  const masterAnim = useRef(null);
  const isRollingRef = useRef(false);

  const currentPlayerIdRef = useRef(currentPlayerId);
  useEffect(() => {
    currentPlayerIdRef.current = currentPlayerId;
  }, [currentPlayerId]);

  const playersRef = useRef(players);
  useEffect(() => {
    playersRef.current = players;
  }, [players]);

  const diceRef = useRef(dice);
  useEffect(() => {
    diceRef.current = dice;
  }, [dice]);

  const sessionIdRef = useRef(initialSessionIdFromParams(route.params));

  const currentGameNameRef = useRef('');
  useEffect(() => {
    currentGameNameRef.current = game ? game.name : '';
  }, [game]);

  useEffect(() => {
    if (!game) {
      navigation.replace('Home');
    }
  }, [game, navigation]);

  useEffect(() => {
    return navigation.addListener('beforeRemove', () => {
      if (!gameId || !getGame(gameId)) return;
      saveGameSession(gameId, {
        sessionId: sessionIdRef.current,
        players: clonePlayersForSave(playersRef.current),
        currentPlayerId: currentPlayerIdRef.current,
        dice: [...diceRef.current],
      });
    });
  }, [navigation, gameId, getGame, saveGameSession]);

  useEffect(() => {
    setDice((prev) => {
      if (prev.length === diceCount) return prev;
      if (prev.length > diceCount) return prev.slice(0, diceCount);
      return [...prev, ...makeDice(diceCount - prev.length)];
    });
  }, [diceCount]);

  const stopAllAnimations = useCallback(() => {
    if (cycleTimer.current) {
      clearInterval(cycleTimer.current);
      cycleTimer.current = null;
    }
    if (shakeAnim.current) {
      shakeAnim.current.stop();
      shakeAnim.current = null;
    }
    if (masterAnim.current) {
      masterAnim.current.stop();
      masterAnim.current = null;
    }
    shake.stopAnimation();
    bounce.stopAnimation();
  }, [shake, bounce]);

  useEffect(() => {
    return () => stopAllAnimations();
  }, [stopAllAnimations]);

  const translateX = shake.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: [-9, 0, 9],
  });
  const translateY = shake.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: [4, 0, -4],
  });
  const rotate = shake.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: ['-7deg', '0deg', '7deg'],
  });

  const dieAnimatedStyle = useMemo(
    () => ({
      transform: [
        { translateX },
        { translateY },
        { rotate },
        { scale: bounce },
      ],
    }),
    [translateX, translateY, rotate, bounce]
  );

  const recordRollForCurrentPlayer = useCallback((finalDice) => {
    setPlayers((curPlayers) => {
      if (curPlayers.length === 0) return curPlayers;
      return curPlayers.map((p) => {
        if (p.id !== currentPlayerIdRef.current) return p;
        const { outcome, nextConsec } = monopolyDiceOutcome(
          finalDice,
          p.consecutiveDoubles
        );
        const entry = {
          ts: Date.now(),
          dice: [...finalDice],
          game: currentGameNameRef.current,
          outcome,
          sessionId: sessionIdRef.current,
        };
        return {
          ...p,
          lastRoll: [...finalDice],
          consecutiveDoubles: nextConsec,
          lastOutcome: outcome,
          history: [entry, ...(p.history || [])],
        };
      });
    });
  }, []);

  const roll = useCallback(() => {
    if (isRollingRef.current) return;
    if (!currentPlayerIdRef.current || diceCount === 0) return;

    isRollingRef.current = true;
    setIsRolling(true);

    stopAllAnimations();
    masterTimer.setValue(0);

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shake, {
          toValue: 1,
          duration: SHAKE_LEG_MS,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.timing(shake, {
          toValue: -1,
          duration: SHAKE_LEG_MS,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      ])
    );
    shakeAnim.current = loop;
    loop.start();

    cycleTimer.current = setInterval(() => {
      setDice(makeDice(diceCount));
    }, CYCLE_INTERVAL_MS);

    const timing = Animated.timing(masterTimer, {
      toValue: 1,
      duration: ROLL_DURATION_MS,
      easing: Easing.linear,
      useNativeDriver: true,
    });
    masterAnim.current = timing;

    timing.start(() => {
      if (cycleTimer.current) {
        clearInterval(cycleTimer.current);
        cycleTimer.current = null;
      }
      if (shakeAnim.current) {
        shakeAnim.current.stop();
        shakeAnim.current = null;
      }
      masterAnim.current = null;

      const finalDice = makeDice(diceCount);
      setDice(finalDice);
      recordRollForCurrentPlayer(finalDice);

      let monopolyNextPlayerId = null;
      if (game?.id === 'monopoly') {
        const order = playersRef.current;
        const pid = currentPlayerIdRef.current;
        const cur = order.find((p) => p.id === pid);
        const { outcome } = monopolyDiceOutcome(
          finalDice,
          cur?.consecutiveDoubles
        );
        const passTurn = outcome === 'normal' || outcome === 'jail';
        if (passTurn && order.length > 0) {
          const idx = order.findIndex((p) => p.id === pid);
          if (idx >= 0) {
            monopolyNextPlayerId = order[(idx + 1) % order.length].id;
          }
        }
      }

      Animated.parallel([
        Animated.timing(shake, {
          toValue: 0,
          duration: 90,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.timing(bounce, {
            toValue: 1.12,
            duration: 90,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.spring(bounce, {
            toValue: 1,
            friction: 4,
            tension: 140,
            useNativeDriver: true,
          }),
        ]),
      ]).start(() => {
        isRollingRef.current = false;
        setIsRolling(false);
        if (monopolyNextPlayerId != null) {
          setTimeout(() => setCurrentPlayerId(monopolyNextPlayerId), 0);
        }
      });
    });
  }, [
    diceCount,
    shake,
    bounce,
    masterTimer,
    stopAllAnimations,
    recordRollForCurrentPlayer,
    game?.id,
  ]);

  const sum = dice.reduce((a, b) => a + b, 0);
  const currentPlayer =
    players.find((p) => p.id === currentPlayerId) || players[0] || null;

  const onDragEnd = useCallback(({ data }) => {
    setPlayers(data);
  }, []);

  const renderPlayerItem = useCallback(
    ({ item, drag, isActive }) => (
      <PlayerRow
        player={item}
        isCurrent={item.id === currentPlayerId}
        isActive={isActive}
        disabled={isRolling}
        onDrag={drag}
        onSetCurrent={() => setCurrentPlayerId(item.id)}
        onShowHistory={() => setHistoryPlayerId(item.id)}
      />
    ),
    [currentPlayerId, isRolling]
  );

  const clearPlayerHistory = useCallback((id) => {
    setPlayers((prev) =>
      prev.map((p) =>
        p.id === id
          ? {
              ...p,
              lastRoll: null,
              history: [],
              consecutiveDoubles: 0,
              lastOutcome: null,
            }
          : p
      )
    );
  }, []);

  if (!game) return null;

  return (
    <SafeAreaView
      style={styles.safe}
      edges={['top', 'left', 'right', 'bottom']}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable
            onPress={() => navigation.goBack()}
            hitSlop={10}
            style={({ pressed }) => [
              styles.backBtn,
              pressed && styles.backBtnPressed,
            ]}
          >
            <Text style={styles.backBtnText}>‹</Text>
          </Pressable>
          <View style={styles.headerCenter}>
            <Text style={styles.eyebrow}>{game.name}</Text>
            <Text style={styles.title}>
              {currentPlayer ? `${currentPlayer.name}'s turn` : 'No player'}
            </Text>
          </View>
          <View style={styles.backBtnSpacer} />
        </View>

        <View style={styles.mainRow}>
          <View style={styles.leftCol}>
            <View style={styles.diceWrap}>
              {dice.map((v, i) => (
                <Die
                  key={i}
                  value={v}
                  size={dieSize}
                  animatedStyle={dieAnimatedStyle}
                />
              ))}
            </View>

            <View style={styles.readout}>
              {diceCount === 1 ? (
                <>
                  <Text style={styles.readoutLabel}>You rolled</Text>
                  <Text style={styles.readoutValue}>{dice[0]}</Text>
                </>
              ) : (
                <>
                  <Text style={styles.readoutLabel}>Total</Text>
                  <Text style={styles.readoutValue}>{sum}</Text>
                  {!isRolling &&
                  currentPlayer &&
                  currentPlayer.lastOutcome === 'jail' ? (
                    <View style={styles.jailBanner}>
                      <Text style={styles.jailBannerTitle}>SPEEDING!</Text>
                      <Text style={styles.jailBannerSub}>Go to Jail</Text>
                    </View>
                  ) : !isRolling &&
                    currentPlayer &&
                    currentPlayer.lastOutcome === 'doubles' ? (
                    <View style={styles.doublesBanner}>
                      <Text style={styles.doublesBannerText}>
                        Doubles! Roll Again
                      </Text>
                      {currentPlayer.consecutiveDoubles >= 2 ? (
                        <Text style={styles.doublesBannerWarn}>
                          One more = Jail
                        </Text>
                      ) : null}
                    </View>
                  ) : !isRolling &&
                    dice.length >= 3 &&
                    dice.every((v) => v === dice[0]) ? (
                    <Text style={styles.doublesTag}>All match!</Text>
                  ) : null}
                </>
              )}
            </View>
          </View>

          <View style={styles.rightCol}>
            <View style={styles.playersHeader}>
              <Text style={styles.playersTitle}>Players</Text>
              <Text style={styles.playersCount}>{players.length}</Text>
            </View>

            <View style={styles.playersListWrap}>
              <DraggableFlatList
                data={players}
                onDragEnd={onDragEnd}
                keyExtractor={(item) => item.id}
                renderItem={renderPlayerItem}
                contentContainerStyle={styles.playersListContent}
                activationDistance={8}
              />
            </View>

            <Text style={styles.dragHint}>Long-press to reorder</Text>
          </View>
        </View>

        <Pressable
          onPress={roll}
          disabled={isRolling || players.length === 0}
          style={({ pressed }) => [
            styles.rollBtn,
            pressed && !isRolling && styles.rollBtnPressed,
            (isRolling || players.length === 0) && styles.rollBtnDisabled,
          ]}
        >
          <Text style={styles.rollBtnText}>
            {isRolling ? 'ROLLING…' : 'ROLL'}
          </Text>
        </Pressable>
      </View>

      <HistoryModal
        player={players.find((p) => p.id === historyPlayerId) || null}
        onClose={() => setHistoryPlayerId(null)}
        onClear={() => historyPlayerId && clearPlayerHistory(historyPlayerId)}
      />
    </SafeAreaView>
  );
}

function PlayerRow({
  player,
  isCurrent,
  isActive,
  disabled,
  onDrag,
  onSetCurrent,
  onShowHistory,
}) {
  const lastRoll = player.lastRoll;
  const lastRollText = !lastRoll
    ? '—'
    : lastRoll.length === 1
    ? `${lastRoll[0]}`
    : `${lastRoll.join('+')}=${lastRoll.reduce((a, b) => a + b, 0)}`;
  const historyCount = player.history ? player.history.length : 0;

  return (
    <ScaleDecorator>
      <Pressable
        onPress={onSetCurrent}
        onLongPress={onDrag}
        delayLongPress={180}
        disabled={disabled}
        style={[
          styles.playerRow,
          isCurrent && styles.playerRowActive,
          isActive && styles.playerRowDragging,
        ]}
      >
        <View style={styles.playerCenterCol}>
          <View style={styles.playerNameRow}>
            <View
              style={[
                styles.turnDot,
                isCurrent ? styles.turnDotActive : styles.turnDotInactive,
              ]}
            />
            <Text
              style={[
                styles.playerName,
                isCurrent && styles.playerNameActive,
              ]}
              numberOfLines={1}
            >
              {player.name}
            </Text>
          </View>
          <Text style={styles.playerLastRoll} numberOfLines={1}>
            Last: {lastRollText}
          </Text>
        </View>

        <Pressable
          onPress={onShowHistory}
          hitSlop={6}
          style={({ pressed }) => [
            styles.historyBtn,
            pressed && styles.historyBtnPressed,
          ]}
        >
          <Text style={styles.historyBtnText}>≡</Text>
          {historyCount > 0 ? (
            <View style={styles.historyBadge}>
              <Text style={styles.historyBadgeText}>
                {historyCount > 99 ? '99+' : historyCount}
              </Text>
            </View>
          ) : null}
        </Pressable>
      </Pressable>
    </ScaleDecorator>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  container: {
    flex: 1,
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: COLORS.bgAlt,
    borderWidth: 1,
    borderColor: COLORS.cardEdge,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnSpacer: {
    width: 38,
  },
  backBtnPressed: {
    opacity: 0.75,
  },
  backBtnText: {
    color: COLORS.text,
    fontSize: 22,
    fontWeight: '900',
    lineHeight: 24,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  eyebrow: {
    color: COLORS.accent,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  title: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '800',
    marginTop: 2,
  },

  mainRow: {
    flex: 1,
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  leftCol: {
    flex: 1.9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.bgAlt,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 8,
  },
  rightCol: {
    flex: 1,
    minWidth: 138,
    maxWidth: 200,
    backgroundColor: COLORS.bgAlt,
    borderRadius: 16,
    paddingHorizontal: 8,
    paddingTop: 10,
    paddingBottom: 8,
  },
  diceWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  readout: {
    marginTop: 18,
    alignItems: 'center',
    minHeight: 60,
  },
  readoutLabel: {
    color: COLORS.textDim,
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  readoutValue: {
    color: COLORS.text,
    fontSize: 38,
    fontWeight: '800',
    marginTop: 2,
  },
  doublesTag: {
    marginTop: 2,
    color: COLORS.accent,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
  },
  doublesBanner: {
    marginTop: 10,
    backgroundColor: COLORS.accentSoft,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: COLORS.accent,
    alignItems: 'center',
  },
  doublesBannerText: {
    color: COLORS.accent,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  doublesBannerWarn: {
    color: COLORS.accent,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
    opacity: 0.85,
  },
  jailBanner: {
    marginTop: 10,
    backgroundColor: COLORS.jail,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 18,
    alignItems: 'center',
    shadowColor: COLORS.jail,
    shadowOpacity: 0.5,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  jailBannerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 2.5,
  },
  jailBannerSub: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginTop: 2,
  },

  playersHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  playersTitle: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  playersCount: {
    color: COLORS.textDim,
    fontSize: 12,
    fontWeight: '700',
  },
  playersListWrap: {
    flex: 1,
  },
  playersListContent: {
    gap: 6,
    paddingBottom: 4,
  },
  dragHint: {
    color: COLORS.textDim,
    fontSize: 10,
    textAlign: 'center',
    marginTop: 4,
    fontStyle: 'italic',
  },

  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  playerRowActive: {
    backgroundColor: COLORS.accentSoft,
    borderColor: COLORS.accent,
  },
  playerRowDragging: {
    opacity: 0.85,
    borderColor: COLORS.accent,
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  playerCenterCol: {
    flex: 1,
    minWidth: 0,
  },
  playerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  turnDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 1.5,
  },
  turnDotActive: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  turnDotInactive: {
    backgroundColor: 'transparent',
    borderColor: COLORS.textDim,
  },
  playerName: {
    flex: 1,
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '700',
  },
  playerNameActive: {
    color: '#fff',
  },
  playerLastRoll: {
    color: COLORS.textDim,
    fontSize: 10,
    marginTop: 3,
  },
  historyBtn: {
    width: 26,
    height: 26,
    borderRadius: 7,
    backgroundColor: COLORS.rowBtn,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
    position: 'relative',
  },
  historyBtnPressed: {
    opacity: 0.7,
  },
  historyBtnText: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '900',
    lineHeight: 15,
  },
  historyBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 14,
    height: 14,
    paddingHorizontal: 3,
    borderRadius: 7,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyBadgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '800',
    lineHeight: 11,
  },

  rollBtn: {
    backgroundColor: COLORS.accent,
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 4,
    shadowColor: COLORS.accent,
    shadowOpacity: 0.35,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  rollBtnPressed: {
    backgroundColor: COLORS.accentPressed,
    transform: [{ scale: 0.98 }],
  },
  rollBtnDisabled: {
    opacity: 0.55,
  },
  rollBtnText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 2,
  },
});
