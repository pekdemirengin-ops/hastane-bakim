import { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Alert } from "react-native";
import { useRouter } from "expo-router";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../lib/firebase";

export default function AnaEkrani() {
  const router = useRouter();
  const [kullanici, setKullanici] = useState(null);
  const [yukleniyor, setYukleniyor] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.replace("/");
        return;
      }
      const uDoc = await getDoc(doc(db, "kullanicilar", user.uid));
      if (uDoc.exists()) {
        setKullanici({ uid: user.uid, ...uDoc.data() });
      } else {
        setKullanici({ uid: user.uid, ad: user.email, rol: "personel" });
      }
      setYukleniyor(false);
    });
    return unsub;
  }, []);

  async function cikisYap() {
    Alert.alert("Cikis", "Cikmak istediginize emin misiniz?", [
      { text: "Iptal", style: "cancel" },
      { text: "Cikis Yap", style: "destructive", onPress: async () => {
        await signOut(auth);
        router.replace("/");
      }},
    ]);
  }

  if (yukleniyor || !kullanici) {
    return (
      <View style={styles.yukleniyor}>
        <ActivityIndicator size="large" color="#667eea" />
      </View>
    );
  }

  const rol = kullanici.rol || "personel";
  const TUM_GOREN = ["yonetici", "bas_yonetici"];

  const rolAdi = {
    personel: "Personel",
    sorumlu: "Birim Sorumlusu",
    teknisyen: "Teknisyen",
    yonetici: "Yonetici",
    bas_yonetici: "Bas Yonetici",
  }[rol] || "Personel";
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scroll}>
      <View style={styles.ustKart}>
        <Text style={styles.hosgeldin}>Hos geldin,</Text>
        <Text style={styles.ad}>{kullanici.ad || kullanici.email}</Text>
        <View style={styles.rolSatir}>
          <Text style={styles.rolIkon}>🎖️</Text>
          <Text style={styles.rolYazi}>{rolAdi}</Text>
        </View>
        {kullanici.birim ? (
          <Text style={styles.birimYazi}>{kullanici.birim}</Text>
        ) : null}
      </View>

      <TouchableOpacity
        style={styles.buyukButon}
        onPress={() => router.push("/yeni-bildirim")}
      >
        <View style={styles.ikonDaire}>
          <Text style={styles.ikon}>🎤</Text>
        </View>
        <Text style={styles.buyukButonBaslik}>Bildirim Olustur</Text>
        <Text style={styles.buyukButonAlt}>Konusun veya dokunun</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.kucukButon}
        onPress={() => router.push("/bildirimlerim")}
      >
        <Text style={styles.kucukIkon}>📋</Text>
        <Text style={styles.kucukYazi}>Bildirimlerim</Text>
      </TouchableOpacity>

      {TUM_GOREN.includes(rol) ? (
        <TouchableOpacity
          style={styles.kucukButon}
          onPress={() => router.push("/rapor")}
        >
          <Text style={styles.kucukIkon}>📊</Text>
          <Text style={styles.kucukYazi}>Rapor</Text>
        </TouchableOpacity>
      ) : null}

      {rol === "bas_yonetici" ? (
        <TouchableOpacity
          style={styles.kucukButon}
          onPress={() => router.push("/kullanicilar")}
        >
          <Text style={styles.kucukIkon}>👥</Text>
          <Text style={styles.kucukYazi}>Kullanicilar</Text>
        </TouchableOpacity>
      ) : null}

      <TouchableOpacity style={styles.cikisButon} onPress={cikisYap}>
        <Text style={styles.cikisYazi}>🚪 Cikis Yap</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f1f5f9" },
  scroll: { padding: 16, paddingBottom: 40 },
  yukleniyor: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#f1f5f9" },
  ustKart: { backgroundColor: "#fff", borderRadius: 16, padding: 20, alignItems: "center", marginBottom: 20, elevation: 2 },
  hosgeldin: { fontSize: 14, color: "#64748b", marginBottom: 4 },
  ad: { fontSize: 22, fontWeight: "bold", color: "#1e293b", marginBottom: 8, textAlign: "center" },
  rolSatir: { flexDirection: "row", alignItems: "center", marginBottom: 4 },
  rolIkon: { fontSize: 16, marginRight: 4 },
  rolYazi: { fontSize: 14, color: "#667eea", fontWeight: "600" },
  birimYazi: { fontSize: 13, color: "#94a3b8", marginTop: 4 },
  buyukButon: { backgroundColor: "#667eea", borderRadius: 20, padding: 30, alignItems: "center", marginBottom: 16, elevation: 4 },
  ikonDaire: { width: 80, height: 80, borderRadius: 40, backgroundColor: "rgba(255,255,255,0.2)", justifyContent: "center", alignItems: "center", marginBottom: 12 },
  ikon: { fontSize: 40 },
  buyukButonBaslik: { fontSize: 20, fontWeight: "bold", color: "#fff", marginBottom: 4 },
  buyukButonAlt: { fontSize: 13, color: "rgba(255,255,255,0.8)" },
  kucukButon: { backgroundColor: "#fff", borderRadius: 12, padding: 16, flexDirection: "row", alignItems: "center", marginBottom: 10, elevation: 2 },
  kucukIkon: { fontSize: 22, marginRight: 12 },
  kucukYazi: { fontSize: 16, fontWeight: "600", color: "#1e293b" },
  cikisButon: { backgroundColor: "#fee2e2", borderRadius: 12, padding: 16, alignItems: "center", marginTop: 10 },
  cikisYazi: { color: "#dc2626", fontSize: 16, fontWeight: "600" },
});
