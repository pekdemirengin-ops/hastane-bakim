import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: "#667eea" },
        headerTintColor: "#fff",
        headerTitleStyle: { fontWeight: "bold" },
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="ana" options={{ title: "Ana Sayfa" }} />
      <Stack.Screen name="yeni-bildirim" options={{ title: "Yeni Bildirim" }} />
      <Stack.Screen name="bildirim-onay" options={{ title: "Onay" }} />
      <Stack.Screen name="bildirimlerim" options={{ title: "Bildirimlerim" }} />
      <Stack.Screen name="bildirim/[id]" options={{ title: "Bildirim Detay" }} />
      <Stack.Screen name="rapor" options={{ title: "Rapor" }} />
      <Stack.Screen name="kullanicilar" options={{ title: "Kullanicilar" }} />
    </Stack>
  );
}
