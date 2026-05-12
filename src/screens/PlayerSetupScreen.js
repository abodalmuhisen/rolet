import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useGames } from '../context/GamesContext';
import { COLORS, MAX_PLAYERS, MIN_PLAYERS, clampPlayers } from '../theme';

const defaultName = (i) => `Player ${i + 1}`;

export default function PlayerSetupScreen({ navigation, route }) {
  const { gameId } = route.params || {};
  const { getGame, getGameSession, clearGameSession } = useGames();
  const game = getGame(gameId);
  const savedSession = getGameSession(gameId);
  const hasSavedSession = !!savedSession?.players?.length;

  const [count, setCount] = useState(2);
  const [names, setNames] = useState(() => [defaultName(0), defaultName(1)]);

  useEffect(() => {
    setNames((prev) => {
      if (prev.length === count) return prev;
      if (prev.length > count) return prev.slice(0, count);
      const extra = Array.from({ length: count - prev.length }, (_, i) =>
        defaultName(prev.length + i)
      );
      return [...prev, ...extra];
    });
  }, [count]);

  useEffect(() => {
    if (!game) {
      navigation.replace('Home');
    }
  }, [game, navigation]);

  useFocusEffect(
    useCallback(() => {
      const session = getGameSession(gameId);
      if (session?.players?.length) {
        setCount(session.players.length);
        setNames(session.players.map((p) => p.name));
      }
    }, [gameId, getGameSession])
  );

  const adjustCount = useCallback(
    (delta) => setCount((c) => clampPlayers(c + delta)),
    []
  );

  const setName = useCallback((i, value) => {
    setNames((prev) => {
      const next = prev.slice();
      next[i] = value;
      return next;
    });
  }, []);

  const resetNames = useCallback(() => {
    setNames(Array.from({ length: count }, (_, i) => defaultName(i)));
  }, [count]);

  const finalNames = useMemo(
    () => names.map((n, i) => (n.trim() ? n.trim() : defaultName(i))),
    [names]
  );

  const continueGame = useCallback(() => {
    if (!game) return;
    const session = getGameSession(game.id);
    if (!session?.players?.length) return;
    const playersClone = session.players.map((p) => ({
      ...p,
      lastRoll: p.lastRoll ? [...p.lastRoll] : null,
      history: (p.history || []).map((e) => ({
        ...e,
        dice: [...e.dice],
      })),
    }));
    navigation.navigate('Game', {
      gameId: game.id,
      playerNames: playersClone.map((p) => p.name),
      sessionId: session.sessionId,
      restoreSession: {
        sessionId: session.sessionId,
        players: playersClone,
        currentPlayerId: session.currentPlayerId,
        dice: Array.isArray(session.dice) ? [...session.dice] : session.dice,
      },
    });
  }, [navigation, game, getGameSession]);

  const restartGame = useCallback(() => {
    clearGameSession(gameId);
    setCount(2);
    setNames([defaultName(0), defaultName(1)]);
  }, [clearGameSession, gameId]);

  const startGame = useCallback(() => {
    if (!game) return;
    clearGameSession(game.id);
    navigation.navigate('Game', {
      gameId: game.id,
      playerNames: finalNames,
      sessionId: `s-${Date.now()}`,
    });
  }, [navigation, game, finalNames, clearGameSession]);

  if (!game) return null;

  return (
    <SafeAreaView
      style={styles.safe}
      edges={['top', 'left', 'right', 'bottom']}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.eyebrow}>{game.name}</Text>
            <Text style={styles.title}>Player setup</Text>
            <Text style={styles.subtitle}>
              {game.diceCount} {game.diceCount === 1 ? 'die' : 'dice'} per roll
            </Text>
          </View>

          {hasSavedSession ? (
            <View style={styles.savedCard}>
              <Text style={styles.savedTitle}>Game in progress</Text>
              <Text style={styles.savedSub}>
                Continue where you left off, or restart with a new session.
              </Text>
              <View style={styles.savedActions}>
                <Pressable
                  onPress={continueGame}
                  style={({ pressed }) => [
                    styles.continueBtn,
                    pressed && styles.continueBtnPressed,
                  ]}
                >
                  <Text style={styles.continueBtnText}>Continue game</Text>
                </Pressable>
                <Pressable
                  onPress={restartGame}
                  style={({ pressed }) => [
                    styles.restartBtn,
                    pressed && styles.restartBtnPressed,
                  ]}
                >
                  <Text style={styles.restartBtnText}>Restart</Text>
                </Pressable>
              </View>
            </View>
          ) : null}

          <View style={styles.countRow}>
            <View>
              <Text style={styles.countLabel}>HOW MANY PLAYERS?</Text>
              <Text style={styles.countHint}>
                {MIN_PLAYERS}–{MAX_PLAYERS}
              </Text>
            </View>
            <View style={styles.stepper}>
              <Pressable
                onPress={() => adjustCount(-1)}
                disabled={count <= MIN_PLAYERS}
                style={({ pressed }) => [
                  styles.stepperBtn,
                  count <= MIN_PLAYERS && styles.stepperBtnDisabled,
                  pressed && count > MIN_PLAYERS && styles.stepperBtnPressed,
                ]}
              >
                <Text style={styles.stepperBtnText}>−</Text>
              </Pressable>
              <Text style={styles.stepperValue}>{count}</Text>
              <Pressable
                onPress={() => adjustCount(1)}
                disabled={count >= MAX_PLAYERS}
                style={({ pressed }) => [
                  styles.stepperBtn,
                  count >= MAX_PLAYERS && styles.stepperBtnDisabled,
                  pressed && count < MAX_PLAYERS && styles.stepperBtnPressed,
                ]}
              >
                <Text style={styles.stepperBtnText}>+</Text>
              </Pressable>
            </View>
          </View>

          <ScrollView
            style={styles.list}
            contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="handled"
          >
            {names.map((n, i) => (
              <View key={i} style={styles.nameRow}>
                <View style={styles.nameBadge}>
                  <Text style={styles.nameBadgeText}>{i + 1}</Text>
                </View>
                <TextInput
                  value={n}
                  onChangeText={(value) => setName(i, value)}
                  placeholder={defaultName(i)}
                  placeholderTextColor={COLORS.textDim}
                  style={styles.nameInput}
                  maxLength={24}
                  selectTextOnFocus
                  returnKeyType={i === names.length - 1 ? 'done' : 'next'}
                />
              </View>
            ))}
          </ScrollView>

          <View style={styles.footer}>
            <Pressable
              onPress={resetNames}
              style={({ pressed }) => [
                styles.resetBtn,
                pressed && styles.resetBtnPressed,
              ]}
            >
              <Text style={styles.resetBtnText}>Reset names</Text>
            </Pressable>
            <Pressable
              onPress={startGame}
              style={({ pressed }) => [
                styles.startBtn,
                pressed && styles.startBtnPressed,
              ]}
            >
              <Text style={styles.startBtnText}>
                {hasSavedSession ? 'Start new game' : 'START GAME'}
              </Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  container: {
    flex: 1,
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 18,
  },
  header: {
    alignItems: 'center',
    marginBottom: 18,
  },
  eyebrow: {
    color: COLORS.accent,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  title: {
    color: COLORS.text,
    fontSize: 26,
    fontWeight: '800',
    marginTop: 4,
  },
  subtitle: {
    color: COLORS.textDim,
    fontSize: 12,
    marginTop: 4,
  },
  savedCard: {
    backgroundColor: COLORS.bgAlt,
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: COLORS.accent,
  },
  savedTitle: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '800',
  },
  savedSub: {
    color: COLORS.textDim,
    fontSize: 12,
    marginTop: 4,
    lineHeight: 17,
  },
  savedActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  continueBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
  },
  continueBtnPressed: {
    backgroundColor: COLORS.accentPressed,
    opacity: 0.95,
  },
  continueBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  restartBtn: {
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 12,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.cardEdge,
    alignItems: 'center',
    justifyContent: 'center',
  },
  restartBtnPressed: {
    opacity: 0.75,
  },
  restartBtnText: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '800',
  },
  countRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.bgAlt,
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: COLORS.cardEdge,
  },
  countLabel: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1,
  },
  countHint: {
    color: COLORS.textDim,
    fontSize: 11,
    marginTop: 3,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.cardEdge,
  },
  stepperBtn: {
    width: 44,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.rowBtn,
  },
  stepperBtnDisabled: {
    opacity: 0.4,
  },
  stepperBtnPressed: {
    opacity: 0.7,
  },
  stepperBtnText: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: '900',
  },
  stepperValue: {
    minWidth: 44,
    textAlign: 'center',
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '900',
  },
  list: {
    flex: 1,
  },
  listContent: {
    gap: 8,
    paddingBottom: 8,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgAlt,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: COLORS.cardEdge,
    gap: 10,
  },
  nameBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.accentSoft,
    borderWidth: 1,
    borderColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nameBadgeText: {
    color: COLORS.accent,
    fontSize: 13,
    fontWeight: '800',
  },
  nameInput: {
    flex: 1,
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '600',
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 10,
  },
  resetBtn: {
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 12,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.cardEdge,
  },
  resetBtnPressed: {
    opacity: 0.75,
  },
  resetBtnText: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '700',
  },
  startBtn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    shadowColor: COLORS.accent,
    shadowOpacity: 0.35,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  startBtnPressed: {
    backgroundColor: COLORS.accentPressed,
    transform: [{ scale: 0.98 }],
  },
  startBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 2,
  },
});
