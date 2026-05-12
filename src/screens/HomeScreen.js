import { useCallback, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import GameEditor from '../components/GameEditor';
import { useGames } from '../context/GamesContext';
import { COLORS, clampDice } from '../theme';

export default function HomeScreen({ navigation }) {
  const { games, addGame, editGame, deleteGame } = useGames();

  const [editorState, setEditorState] = useState(null);
  const [editorName, setEditorName] = useState('');
  const [editorDice, setEditorDice] = useState(2);

  const openNew = useCallback(() => {
    setEditorState({ mode: 'new' });
    setEditorName('');
    setEditorDice(2);
  }, []);

  const openEdit = useCallback(
    (game) => {
      setEditorState({ mode: 'edit', gameId: game.id });
      setEditorName(game.name);
      setEditorDice(clampDice(game.diceCount));
    },
    []
  );

  const closeEditor = useCallback(() => setEditorState(null), []);

  const saveEditor = useCallback(() => {
    if (!editorState) return;
    if (editorState.mode === 'new') {
      addGame(editorName, editorDice);
    } else {
      editGame(editorState.gameId, {
        name: editorName,
        diceCount: editorDice,
      });
    }
    setEditorState(null);
  }, [editorState, editorName, editorDice, addGame, editGame]);

  const deleteEditor = useCallback(() => {
    if (!editorState || editorState.mode !== 'edit') return;
    deleteGame(editorState.gameId);
    setEditorState(null);
  }, [editorState, deleteGame]);

  const goToSetup = useCallback(
    (gameId) => navigation.navigate('PlayerSetup', { gameId }),
    [navigation]
  );

  const editorTargetCanDelete =
    editorState && editorState.mode === 'edit'
      ? !!games.find((g) => g.id === editorState.gameId && !g.locked)
      : false;

  return (
    <SafeAreaView
      style={styles.safe}
      edges={['top', 'left', 'right', 'bottom']}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Rolet</Text>
          <Text style={styles.subtitle}>Choose a game to start</Text>
        </View>

        {editorState ? (
          <GameEditor
            mode={editorState.mode}
            name={editorName}
            onNameChange={setEditorName}
            dice={editorDice}
            onDiceChange={setEditorDice}
            onCancel={closeEditor}
            onSave={saveEditor}
            onDelete={deleteEditor}
            canDelete={editorTargetCanDelete}
          />
        ) : null}

        <ScrollView
          style={styles.list}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        >
          {games.map((g) => (
            <Pressable
              key={g.id}
              onPress={() => goToSetup(g.id)}
              style={({ pressed }) => [
                styles.card,
                pressed && styles.cardPressed,
              ]}
            >
              <View style={styles.cardLeft}>
                <View style={styles.cardTitleRow}>
                  <Text style={styles.cardName}>{g.name}</Text>
                  {g.locked ? (
                    <View style={styles.lockChip}>
                      <Text style={styles.lockChipText}>LOCKED</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={styles.cardSub}>
                  {g.diceCount} {g.diceCount === 1 ? 'die' : 'dice'}
                </Text>
              </View>

              <View style={styles.cardRight}>
                {g.locked ? null : (
                  <Pressable
                    onPress={() => openEdit(g)}
                    hitSlop={8}
                    style={({ pressed }) => [
                      styles.editIcon,
                      pressed && styles.editIconPressed,
                    ]}
                  >
                    <Text style={styles.editIconText}>✎</Text>
                  </Pressable>
                )}
                <Text style={styles.chevron}>›</Text>
              </View>
            </Pressable>
          ))}
        </ScrollView>

        <Pressable
          onPress={openNew}
          style={({ pressed }) => [
            styles.addBtn,
            pressed && styles.addBtnPressed,
          ]}
        >
          <Text style={styles.addBtnText}>+ Add a game</Text>
        </Pressable>
      </View>
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
    paddingTop: 12,
    paddingBottom: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 18,
  },
  title: {
    color: COLORS.text,
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  subtitle: {
    color: COLORS.textDim,
    fontSize: 13,
    marginTop: 4,
  },
  list: {
    flex: 1,
  },
  listContent: {
    gap: 10,
    paddingBottom: 8,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgAlt,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: COLORS.cardEdge,
  },
  cardPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.99 }],
  },
  cardLeft: {
    flex: 1,
    minWidth: 0,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardName: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '800',
  },
  cardSub: {
    color: COLORS.textDim,
    fontSize: 13,
    marginTop: 4,
    fontWeight: '600',
  },
  cardRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  lockChip: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: COLORS.card,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.lock,
  },
  lockChipText: {
    color: COLORS.lock,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
  },
  editIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: COLORS.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editIconPressed: {
    opacity: 0.7,
  },
  editIconText: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '900',
  },
  chevron: {
    color: COLORS.textDim,
    fontSize: 28,
    fontWeight: '300',
    marginLeft: 4,
  },
  addBtn: {
    marginTop: 12,
    backgroundColor: COLORS.accent,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: COLORS.accent,
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
  addBtnPressed: {
    backgroundColor: COLORS.accentPressed,
    transform: [{ scale: 0.98 }],
  },
  addBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 1,
  },
});
