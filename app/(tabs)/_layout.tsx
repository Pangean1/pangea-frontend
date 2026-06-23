import { Stack } from 'expo-router';

export default function TabsLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="donor" />
      <Stack.Screen name="all-donations" />
      <Stack.Screen name="all-impact-updates" />
      <Stack.Screen name="all-campaigns" />
    </Stack>
  );
}
