import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { COLORS } from '../theme';

function formatRollTime(ts) {
  try {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  } catch (e) {
    return '';
  }
}

export default function HistoryModal({ player, onClose, onClear }) {
  const visible = !!player;
  const history = player && player.history ? player.history : [];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalBackdrop}>
        <Pressable
          style={styles.modalBackdropHit}
          onPress={onClose}
          accessibilityLabel="Dismiss"
        />
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.modalTitle}>{player ? player.name : ''}</Text>
              <Text style={styles.modalSubtitle}>
                {history.length} {history.length === 1 ? 'roll' : 'rolls'}
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              style={({ pressed }) => [
                styles.modalCloseBtn,
                pressed && styles.modalCloseBtnPressed,
              ]}
            >
              <Text style={styles.modalCloseBtnText}>×</Text>
            </Pressable>
          </View>

          {history.length === 0 ? (
            <Text style={styles.modalEmpty}>
              No rolls yet for this player.
            </Text>
          ) : (
            <ScrollView
              key={player.id}
              style={styles.historyList}
              contentContainerStyle={styles.historyListContent}
              nestedScrollEnabled
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator
            >
              {history.map((entry, i) => {
                const total = entry.dice.reduce((a, b) => a + b, 0);
                return (
                  <View key={i} style={styles.historyEntry}>
                    <View style={styles.historyEntryLeft}>
                      <Text style={styles.historyEntryRollNo}>
                        #{history.length - i}
                      </Text>
                      <Text style={styles.historyEntryTime}>
                        {formatRollTime(entry.ts)}
                      </Text>
                      {entry.game ? (
                        <Text style={styles.historyEntryGame} numberOfLines={1}>
                          {entry.game}
                        </Text>
                      ) : null}
                    </View>
                    <View style={styles.historyEntryRight}>
                      <Text style={styles.historyEntryDice}>
                        {entry.dice.join(' + ')}
                      </Text>
                      <Text style={styles.historyEntryTotal}>= {total}</Text>
                      {entry.outcome === 'jail' ? (
                        <Text style={styles.historyOutcomeJail}>Jail</Text>
                      ) : entry.outcome === 'doubles' ? (
                        <Text style={styles.historyOutcomeDoubles}>Double</Text>
                      ) : null}
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          )}

          <View style={styles.modalActions}>
            <Pressable
              onPress={onClear}
              disabled={history.length === 0}
              style={({ pressed }) => [
                styles.editorBtn,
                styles.editorBtnGhost,
                history.length === 0 && styles.btnDisabled,
                pressed && history.length > 0 && styles.editorBtnPressed,
              ]}
            >
              <Text style={styles.editorBtnGhostText}>Clear</Text>
            </Pressable>
            <Pressable
              onPress={onClose}
              style={({ pressed }) => [
                styles.editorBtn,
                styles.editorBtnPrimary,
                pressed && styles.editorBtnPressed,
              ]}
            >
              <Text style={styles.editorBtnPrimaryText}>Done</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  modalBackdropHit: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  modalCard: {
    width: '100%',
    maxWidth: 460,
    maxHeight: '78%',
    backgroundColor: COLORS.bgAlt,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.cardEdge,
    padding: 16,
    zIndex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '800',
  },
  modalSubtitle: {
    color: COLORS.textDim,
    fontSize: 12,
    marginTop: 2,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: COLORS.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseBtnPressed: {
    opacity: 0.75,
  },
  modalCloseBtnText: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '900',
    lineHeight: 20,
  },
  modalEmpty: {
    color: COLORS.textDim,
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 28,
  },
  historyList: {
    flexGrow: 0,
    flexShrink: 1,
    maxHeight: 380,
  },
  historyListContent: {
    gap: 6,
    paddingBottom: 4,
  },
  historyEntry: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: COLORS.cardEdge,
  },
  historyEntryLeft: {
    flex: 1,
    minWidth: 0,
  },
  historyEntryRollNo: {
    color: COLORS.accent,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  historyEntryTime: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 1,
  },
  historyEntryGame: {
    color: COLORS.textDim,
    fontSize: 11,
    marginTop: 1,
  },
  historyEntryRight: {
    alignItems: 'flex-end',
    marginLeft: 10,
  },
  historyEntryDice: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '700',
  },
  historyEntryTotal: {
    color: COLORS.textDim,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 1,
  },
  historyOutcomeJail: {
    marginTop: 3,
    color: '#fff',
    backgroundColor: COLORS.jail,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
    overflow: 'hidden',
  },
  historyOutcomeDoubles: {
    marginTop: 3,
    color: COLORS.accent,
    backgroundColor: COLORS.accentSoft,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
    overflow: 'hidden',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 12,
  },
  editorBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editorBtnPressed: {
    opacity: 0.8,
  },
  btnDisabled: {
    opacity: 0.4,
  },
  editorBtnGhost: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.cardEdge,
  },
  editorBtnGhostText: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '700',
  },
  editorBtnPrimary: {
    backgroundColor: COLORS.accent,
  },
  editorBtnPrimaryText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
  },
});
