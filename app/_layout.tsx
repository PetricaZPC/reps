import { Tabs } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import "./globals.css";

export default function TabLayout() {
  return (
    <SafeAreaProvider>
      <Tabs>
        <Tabs.Screen 
          name="workout"
          options={{
            title: 'Workout',
            headerShown: false,
          }}
        />
        <Tabs.Screen 
          name="assistant"
          options={{
            title: 'Assistant',
            headerShown: false,
          }}
        />
        <Tabs.Screen 
          name="index"
          options={{
            title: 'Profile',
            headerShown: false,
          }}
        />
        <Tabs.Screen 
          name="settings"
          options={{
            title: 'Settings',
            headerShown: false,
          }}
        />
      </Tabs>
    </SafeAreaProvider>
  );
}
