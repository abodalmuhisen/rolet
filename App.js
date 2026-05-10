import 'react-native-gesture-handler';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GamesProvider } from './src/context/GamesContext';
import GameScreen from './src/screens/GameScreen';
import HomeScreen from './src/screens/HomeScreen';
import PlayerSetupScreen from './src/screens/PlayerSetupScreen';
import { COLORS } from './src/theme';

const Stack = createNativeStackNavigator();

const navTheme = {
  ...DefaultTheme,
  dark: true,
  colors: {
    ...DefaultTheme.colors,
    background: COLORS.bg,
    card: COLORS.bg,
    text: COLORS.text,
    border: COLORS.cardEdge,
    primary: COLORS.accent,
    notification: COLORS.accent,
  },
};

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <SafeAreaProvider>
        <GamesProvider>
          <StatusBar style="light" />
          <NavigationContainer theme={navTheme}>
            <Stack.Navigator
              screenOptions={{ headerShown: false, contentStyle: { backgroundColor: COLORS.bg } }}
              initialRouteName="Home"
            >
              <Stack.Screen name="Home" component={HomeScreen} />
              <Stack.Screen name="PlayerSetup" component={PlayerSetupScreen} />
              <Stack.Screen name="Game" component={GameScreen} />
            </Stack.Navigator>
          </NavigationContainer>
        </GamesProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
