import { Animated, StyleSheet, View } from 'react-native';
import { COLORS, FACE_PIPS } from '../theme';

export default function Die({ value, animatedStyle, size }) {
  const pips = FACE_PIPS[value] || FACE_PIPS[1];
  const pipSize = Math.round(size * 0.18);
  return (
    <Animated.View
      style={[
        styles.die,
        { width: size, height: size, borderRadius: size * 0.22 },
        animatedStyle,
      ]}
    >
      <View style={styles.dieGrid}>
        {pips.map((on, i) => (
          <View key={i} style={styles.dieCell}>
            {on ? (
              <View
                style={{
                  width: pipSize,
                  height: pipSize,
                  borderRadius: pipSize / 2,
                  backgroundColor: COLORS.diePip,
                }}
              />
            ) : null}
          </View>
        ))}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  die: {
    backgroundColor: COLORS.die,
    borderWidth: 1,
    borderColor: COLORS.dieEdge,
    padding: 10,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  dieGrid: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dieCell: {
    width: '33.3333%',
    height: '33.3333%',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
