import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '../lib/queryClient';
import { Colors } from '../constants/colors';
export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style="light" backgroundColor={Colors.bg} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: Colors.bg },
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="recipient" />
        <Stack.Screen name="recipient-all-campaigns" />
        <Stack.Screen name="recipient-all-donations" />
        <Stack.Screen name="recipient-create-campaign" />
        <Stack.Screen name="campaign/[id]" />
      </Stack>
    </QueryClientProvider>
  );
}
