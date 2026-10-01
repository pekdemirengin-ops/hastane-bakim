import { useState, useEffect } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../lib/firebase";
import { KATEGORILER } from "../lib/kategoriler";

function metniAnalizEt(metin) {
  const kucuk = metin.toLowerCase();
  let enIyiKategori = KATEGORILER[0];
  let enIyiAltKategori = KATEGORILER[0].altKategoriler[0];
  let enYuksekPuan = 0;

  for (const kat of KATEGORILER) {
    for (const alt of kat.altKategoriler) {
      let puan = 0;
      for (const kelime of alt.anahtar) {
        if (kucuk.includes(kelime)) puan += 1;
      }
      if (puan > enYuksekPuan) {
        enYuksekPuan = puan;
        enIyiKategori = kat;
        enIyiAltKategori = alt;
      }
    }
  }

  let oncelik = "normal";
  const acilKelimeler = ["acil", "hemen", "tehlikeli", "yangin", "kacak", "elektrik", "kritik"];
  const onemliKelimeler = ["onemli", "bozuk", "calismiyor", "açilmiyor", "acilmiyor"];
  if (acilKelimeler.some((k) => kucuk.includes(k))) oncelik = "acil";
  else if (onemliKelimeler.some((k) => kucuk.includes(k))) oncelik = "onemli";

  return {
    metin,
    enIyi: { kategori: enIyiKategori, altKategori: enIyiAltKategori },
    oncelik,
  };
}

export default function YeniBildirimEkrani() {
  const router = useRouter();
  const [kullanici, setKullanici] = useState(null);
  const [metin, setMetin] = useState("");
  const [analiz, setAnaliz] = useState(null);
  const [manuelKategori, setManuelKategori] = useState("");

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) { router.replace("/"); return; }
      setKullanici({ uid: user.uid, email: user.email });
    });
    return unsub;
  }, []);

  function analizEt() {
    if (!metin.trim()) { Alert.alert("Hata", "Lutfen bir metin girin"); return; }
    const sonuc = metniAnalizEt(metin);
    setAnaliz(sonuc);
    setManuelKategori(sonuc.enIyi.kategori.id);
  }

  function devamEt() {
    if (!analiz) { Alert.alert("Hata", "Once analiz edin"); return; }
    router.push({
      pathname: "/bildirim-onay",
      params: {
        metin: analiz.metin,
        kategoriId: manuelKategori,
        altKategori: analiz.enIyi.altKategori.ad,
        oncelik: analiz.oncelik,
      },
    });
  }

  if (!kullanici) {
    return (
      <View style={styles.yukleniyor}>
        <ActivityIndicator size="large" color="#667eea" />
      </View>
    );
  }
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.bolum}>
          <Text style={styles.bolumBaslik}>Bildirim Metni</Text>
          <TextInput
            style={styles.metinInput}
            value={metin}
            onChangeText={setMetin}
            placeholder="Ornek: 3. kattaki lamba yanmiyor..."
            placeholderTextColor="#94a3b8"
            multiline
            numberOfLines={5}
            textAlignVertical="top"
          />
        </View>

        <TouchableOpacity style={styles.analizButon} onPress={analizEt}>
          <Text style={styles.analizButonYazi}>🔍 Analiz Et</Text>
        </TouchableOpacity>

        {analiz ? (
          <View style={styles.sonucKart}>
            <Text style={styles.sonucBaslik}>Analiz Sonucu</Text>

            <Text style={styles.sonucEtiket}>Kategori:</Text>
            <View style={styles.kategoriSatir}>
              {KATEGORILER.map((kat) => (
                <TouchableOpacity
                  key={kat.id}
                  style={[styles.kategoriButon, manuelKategori === kat.id && styles.kategoriAktif]}
                  onPress={() => setManuelKategori(kat.id)}
                >
                  <Text style={[styles.kategoriYazi, manuelKategori === kat.id && styles.kategoriYaziAktif]}>
                    {kat.ikon} {kat.ad}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.sonucEtiket}>Alt Kategori:</Text>
            <Text style={styles.sonucDeger}>{analiz.enIyi.altKategori.ad}</Text>

            <Text style={styles.sonucEtiket}>Oncelik:</Text>
            <Text style={[styles.sonucDeger, {
              color: analiz.oncelik === "acil" ? "#dc2626" :
                     analiz.oncelik === "onemli" ? "#f59e0b" : "#10b981"
            }]}>
              {analiz.oncelik.toUpperCase()}
            </Text>

            <TouchableOpacity style={styles.devamButon} onPress={devamEt}>
              <Text style={styles.devamYazi}>Devam Et →</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f1f5f9" },
  scroll: { padding: 16, paddingBottom: 40 },
  yukleniyor: { flex: 1, justifyContent: "center", alignItems: "center" },
  bolum: { backgroundColor: "#fff", borderRadius: 12, padding: 16, marginBottom: 12, elevation: 2 },
  bolumBaslik: { fontSize: 15, fontWeight: "bold", color: "#1e293b", marginBottom: 10 },
  metinInput: { backgroundColor: "#f8fafc", borderRadius: 10, padding: 12, fontSize: 15, color: "#1e293b", borderWidth: 1, borderColor: "#e2e8f0", minHeight: 120 },
  analizButon: { backgroundColor: "#667eea", padding: 16, borderRadius: 12, alignItems: "center", marginBottom: 12 },
  analizButonYazi: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  sonucKart: { backgroundColor: "#fff", borderRadius: 12, padding: 16, elevation: 2 },
  sonucBaslik: { fontSize: 16, fontWeight: "bold", color: "#1e293b", marginBottom: 12 },
  sonucEtiket: { fontSize: 13, color: "#64748b", marginTop: 10, marginBottom: 6 },
  sonucDeger: { fontSize: 15, color: "#1e293b", fontWeight: "600" },
  kategoriSatir: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  kategoriButon: { backgroundColor: "#f1f5f9", padding: 8, borderRadius: 8, borderWidth: 1, borderColor: "#e2e8f0" },
  kategoriAktif: { backgroundColor: "#667eea", borderColor: "#667eea" },
  kategoriYazi: { color: "#64748b", fontSize: 13 },
  kategoriYaziAktif: { color: "#fff", fontWeight: "bold" },
  devamButon: { backgroundColor: "#10b981", padding: 14, borderRadius: 10, alignItems: "center", marginTop: 16 },
  devamYazi: { color: "#fff", fontWeight: "bold", fontSize: 15 },
});
