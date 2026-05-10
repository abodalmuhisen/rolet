import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { COLORS, MAX_DICE, MIN_DICE, clampDice } from '../theme';

export default function GameEditor({
  mode,
  name,
  onNameChange,
  dice,
  onDiceChange,
  onCancel,
  onSave,
  onDelete,
  canDelete,
  disabled,
}) {
  return (
    <View style={styles.editor}>
      <Text style={styles.editorTitle}>
        {mode === 'new' ? 'New game' : 'Edit game'}
      </Text>
      <TextInput
        value={name}
        onChangeText={onNameChange}
        editable={!disabled}
        placeholder="Game name"
        placeholderTextColor={COLORS.textDim}
        style={styles.editorInput}
        maxLength={28}
        selectTextOnFocus
      />
      <View style={styles.stepperRow}>
        <Text style={styles.stepperLabel}>Dice</Text>
        <View style={styles.stepper}>
          <Pressable
            onPress={() => onDiceChange(clampDice(dice - 1))}
            disabled={disabled || dice <= MIN_DICE}
            style={({ pressed }) => [
              styles.stepperBtn,
              (disabled || dice <= MIN_DICE) && styles.stepperBtnDisabled,
              pressed &&
                !(disabled || dice <= MIN_DICE) &&
                styles.stepperBtnPressed,
            ]}
          >
            <Text style={styles.stepperBtnText}>−</Text>
          </Pressable>
          <Text style={styles.stepperValue}>{dice}</Text>
          <Pressable
            onPress={() => onDiceChange(clampDice(dice + 1))}
            disabled={disabled || dice >= MAX_DICE}
            style={({ pressed }) => [
              styles.stepperBtn,
              (disabled || dice >= MAX_DICE) && styles.stepperBtnDisabled,
              pressed &&
                !(disabled || dice >= MAX_DICE) &&
                styles.stepperBtnPressed,
            ]}
          >
            <Text style={styles.stepperBtnText}>+</Text>
          </Pressable>
        </View>
        <Text style={styles.stepperHint}>
          {MIN_DICE}–{MAX_DICE}
        </Text>
      </View>
      <View style={styles.editorActions}>
        <Pressable
          onPress={onCancel}
          disabled={disabled}
          style={({ pressed }) => [
            styles.editorBtn,
            styles.editorBtnGhost,
            pressed && !disabled && styles.editorBtnPressed,
          ]}
        >
          <Text style={styles.editorBtnGhostText}>Cancel</Text>
        </Pressable>
        {mode === 'edit' && canDelete ? (
          <Pressable
            onPress={onDelete}
            disabled={disabled}
            style={({ pressed }) => [
              styles.editorBtn,
              styles.editorBtnDanger,
              pressed && !disabled && styles.editorBtnPressed,
            ]}
          >
            <Text style={styles.editorBtnDangerText}>Delete</Text>
          </Pressable>
        ) : null}
        <Pressable
          onPress={onSave}
          disabled={disabled}
          style={({ pressed }) => [
            styles.editorBtn,
            styles.editorBtnPrimary,
            pressed && !disabled && styles.editorBtnPressed,
          ]}
        >
          <Text style={styles.editorBtnPrimaryText}>Save</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  editor: {
    backgroundColor: COLORS.bgAlt,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.cardEdge,
    gap: 10,
  },
  editorTitle: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  editorInput: {
    backgroundColor: COLORS.card,
    color: COLORS.text,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    fontWeight: '600',
    borderWidth: 1,
    borderColor: COLORS.cardEdge,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stepperLabel: {
    color: COLORS.textDim,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.cardEdge,
    overflow: 'hidden',
  },
  stepperBtn: {
    width: 38,
    height: 36,
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
    fontSize: 18,
    fontWeight: '900',
  },
  stepperValue: {
    minWidth: 38,
    textAlign: 'center',
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '800',
  },
  stepperHint: {
    color: COLORS.textDim,
    fontSize: 11,
  },
  editorActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
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
  editorBtnDanger: {
    backgroundColor: COLORS.danger,
  },
  editorBtnDangerText: {
    color: '#fff',
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
