import { useState, useEffect } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../lib/firebase";
import { tcDogrula, tcToEmail } from "../lib/tc";

export default function GirisEkrani() {
  const router = useRouter();
  const [tc, setTc] = useState("");
  const [sifre, setSifre] = useState("");
  const [ad, setAd] = useState("");
  const [birim, setBirim] = useState("");
  const [mod, setMod] = useState("giris");
  const [yukleniyor, setYukleniyor] = useState(false);
  const [kontrol, setKontrol] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const uDoc = await getDoc(doc(db, "kullanicilar", user.uid));
        if (uDoc.exists()) {
          router.replace("/ana");
          return;
        }
      }
      setKontrol(false);
    });
    return unsub;
  }, []);

  async function girisYap() {
    if (!tcDogrula(tc)) { Alert.alert("Hata", "Gecersiz T.C. Kimlik No"); return; }
    if (sifre.length < 6) { Alert.alert("Hata", "Sifre en az 6 karakter olmali"); return; }
    setYukleniyor(true);
    try {
      await signInWithEmailAndPassword(auth, tcToEmail(tc), sifre);
      router.replace("/ana");
    } catch (e) {
      let mesaj = "Giris basarisiz";
      if (e.code === "auth/user-not-found") mesaj = "Bu T.C. ile kayitli kullanici yok";
      else if (e.code === "auth/wrong-password") mesaj = "Sifre hatali";
      else if (e.code === "auth/invalid-credential") mesaj = "T.C. veya sifre hatali";
      Alert.alert("Hata", mesaj);
    } finally {
      setYukleniyor(false);
    }
  }

  async function kayitOl() {
    if (!tcDogrula(tc)) { Alert.alert("Hata", "Gecersiz T.C. Kimlik No"); return; }
    if (sifre.length < 6) { Alert.alert("Hata", "Sifre en az 6 karakter olmali"); return; }
    if (!ad.trim()) { Alert.alert("Hata", "Ad Soyad gerekli"); return; }
    if (!birim.trim()) { Alert.alert("Hata", "Birim gerekli"); return; }
    setYukleniyor(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, tcToEmail(tc), sifre);
      await setDoc(doc(db, "kullanicilar", cred.user.uid), {
        tc: tc,
        ad: ad.trim(),
        birim: birim.trim(),
        rol: "personel",
        email: tcToEmail(tc),
        olusturma: serverTimestamp(),
      });
      Alert.alert("Basarili", "Kayit tamamlandi");
      router.replace("/ana");
    } catch (e) {
      let mesaj = "Kayit basarisiz";
      if (e.code === "auth/email-already-in-use") mesaj = "Bu T.C. zaten kayitli";
      Alert.alert("Hata", mesaj);
    } finally {
      setYukleniyor(false);
    }
  }
  if (kontrol) {
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
        <View style={styles.ustAlan}>
          <Text style={styles.logo}>🏥</Text>
          <Text style={styles.baslik}>SDH Hastane Bildirim</Text>
          <Text style={styles.altBaslik}>Seyhan Devlet Hastanesi</Text>
        </View>

        <View style={styles.kart}>
          <View style={styles.modSatir}>
            <TouchableOpacity
              style={[styles.modButon, mod === "giris" && styles.modAktif]}
              onPress={() => setMod("giris")}
            >
              <Text style={[styles.modYazi, mod === "giris" && styles.modYaziAktif]}>Giris</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modButon, mod === "kayit" && styles.modAktif]}
              onPress={() => setMod("kayit")}
            >
              <Text style={[styles.modYazi, mod === "kayit" && styles.modYaziAktif]}>Kayit</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.etiket}>T.C. Kimlik No</Text>
          <TextInput
            style={styles.input}
            value={tc}
            onChangeText={(t) => setTc(t.replace(/\D/g, "").slice(0, 11))}
            placeholder="11 haneli T.C."
            placeholderTextColor="#94a3b8"
            keyboardType="number-pad"
            maxLength={11}
          />

          <Text style={styles.etiket}>Sifre</Text>
          <TextInput
            style={styles.input}
            value={sifre}
            onChangeText={setSifre}
            placeholder="En az 6 karakter"
            placeholderTextColor="#94a3b8"
            secureTextEntry
          />

          {mod === "kayit" && (
            <>
              <Text style={styles.etiket}>Ad Soyad</Text>
              <TextInput
                style={styles.input}
                value={ad}
                onChangeText={setAd}
                placeholder="Ornek: Engin PEKDEMIR"
                placeholderTextColor="#94a3b8"
              />

              <Text style={styles.etiket}>Birim</Text>
              <TextInput
                style={styles.input}
                value={birim}
                onChangeText={setBirim}
                placeholder="Ornek: Basin Iletisim Birimi"
                placeholderTextColor="#94a3b8"
              />
            </>
          )}

          <TouchableOpacity
            style={[styles.buton, yukleniyor && styles.butonPasif]}
            onPress={mod === "giris" ? girisYap : kayitOl}
            disabled={yukleniyor}
          >
            {yukleniyor ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.butonYazi}>
                {mod === "giris" ? "Giris Yap" : "Kayit Ol"}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#667eea" },
  scroll: { flexGrow: 1, justifyContent: "center", padding: 20 },
  yukleniyor: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#667eea" },
  ustAlan: { alignItems: "center", marginBottom: 30 },
  logo: { fontSize: 60, marginBottom: 10 },
  baslik: { fontSize: 26, fontWeight: "bold", color: "#fff", marginBottom: 5 },
  altBaslik: { fontSize: 14, color: "#e0e7ff" },
  kart: { backgroundColor: "#fff", borderRadius: 20, padding: 20, elevation: 5 },
  modSatir: { flexDirection: "row", marginBottom: 20, backgroundColor: "#f1f5f9", borderRadius: 10, padding: 4 },
  modButon: { flex: 1, padding: 10, borderRadius: 8, alignItems: "center" },
  modAktif: { backgroundColor: "#667eea" },
  modYazi: { color: "#64748b", fontWeight: "600" },
  modYaziAktif: { color: "#fff" },
  etiket: { fontSize: 13, color: "#64748b", marginBottom: 5, marginTop: 10 },
  input: { backgroundColor: "#f8fafc", borderRadius: 10, padding: 12, fontSize: 15, color: "#1e293b", borderWidth: 1, borderColor: "#e2e8f0" },
  buton: { backgroundColor: "#667eea", padding: 16, borderRadius: 10, alignItems: "center", marginTop: 20 },
  butonPasif: { backgroundColor: "#94a3b8" },
  butonYazi: { color: "#fff", fontSize: 16, fontWeight: "bold" },
});
