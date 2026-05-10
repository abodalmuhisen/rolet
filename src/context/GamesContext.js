import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import { clampDice } from '../theme';

const GamesContext = createContext(null);

const LOCKED_GAMES = [
  {
    id: 'monopoly',
    name: 'Monopoly',
    diceCount: 2,
    locked: true,
  },
  {
    id: 'snakes',
    name: 'Snakes & Ladders',
    diceCount: 1,
    locked: true,
  },
];

let nextGameId = 1;
const newCustomGameId = () => `custom-${Date.now()}-${nextGameId++}`;

export function GamesProvider({ children }) {
  const [games, setGames] = useState(() => LOCKED_GAMES.map((g) => ({ ...g })));

  const addGame = useCallback((name, diceCount) => {
    const trimmed = (name || '').trim() || 'Untitled';
    const count = clampDice(diceCount);
    const id = newCustomGameId();
    setGames((prev) => [...prev, { id, name: trimmed, diceCount: count, locked: false }]);
    return id;
  }, []);

  const editGame = useCallback((id, updates) => {
    setGames((prev) =>
      prev.map((g) => {
        if (g.id !== id) return g;
        const next = { ...g };
        if (updates.name !== undefined) {
          const trimmed = updates.name.trim() || g.name;
          next.name = trimmed;
        }
        if (updates.diceCount !== undefined) {
          next.diceCount = clampDice(updates.diceCount);
        }
        return next;
      })
    );
  }, []);

  const deleteGame = useCallback((id) => {
    setGames((prev) => {
      const target = prev.find((g) => g.id === id);
      if (!target || target.locked) return prev;
      return prev.filter((g) => g.id !== id);
    });
  }, []);

  const getGame = useCallback(
    (id) => games.find((g) => g.id === id) || null,
    [games]
  );

  /** In-memory saved table session per game (survives leaving Game screen). */
  const [savedSessions, setSavedSessions] = useState({});

  const saveGameSession = useCallback((gameId, snapshot) => {
    if (!gameId || !snapshot) return;
    setSavedSessions((prev) => ({
      ...prev,
      [gameId]: { ...snapshot, savedAt: Date.now() },
    }));
  }, []);

  const getGameSession = useCallback(
    (id) => savedSessions[id] || null,
    [savedSessions]
  );

  const clearGameSession = useCallback((gameId) => {
    if (!gameId) return;
    setSavedSessions((prev) => {
      if (!(gameId in prev)) return prev;
      const next = { ...prev };
      delete next[gameId];
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({
      games,
      addGame,
      editGame,
      deleteGame,
      getGame,
      saveGameSession,
      getGameSession,
      clearGameSession,
    }),
    [
      games,
      addGame,
      editGame,
      deleteGame,
      getGame,
      saveGameSession,
      getGameSession,
      clearGameSession,
    ]
  );

  return (
    <GamesContext.Provider value={value}>{children}</GamesContext.Provider>
  );
}

export function useGames() {
  const ctx = useContext(GamesContext);
  if (!ctx) throw new Error('useGames must be used inside GamesProvider');
  return ctx;
}
