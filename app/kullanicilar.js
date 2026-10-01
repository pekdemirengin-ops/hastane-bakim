import { useState, useEffect } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  ActivityIndicator, Alert, Modal,
} from "react-native";
import { useRouter } from "expo-router";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, updateDoc, collection, getDocs } from "firebase/firestore";
import { auth, db } from "../lib/firebase";

const ROLLER = [
  { id: "personel", ad: "Personel" },
  { id: "sorumlu", ad: "Birim Sorumlusu" },
  { id: "teknisyen", ad: "Teknisyen" },
  { id: "yonetici", ad: "Yonetici" },
];

export default function KullanicilarEkrani() {
  const router = useRouter();
  const [kullanici, setKullanici] = useState(null);
  const [kullanicilar, setKullanicilar] = useState([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [seciliUid, setSeciliUid] = useState(null);
  const [rolModal, setRolModal] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) { router.replace("/"); return; }
      const uDoc = await getDoc(doc(db, "kullanicilar", user.uid));
      if (!uDoc.exists()) { router.replace("/ana"); return; }
      const k = { uid: user.uid, ...uDoc.data() };
      if (k.rol !== "bas_yonetici") {
        alert("Bu sayfaya erisim yetkiniz yok");
        router.replace("/ana");
        return;
      }
      setKullanici(k);
      await yukle();
    });
    return unsub;
  }, []);

  async function yukle() {
    try {
      const snap = await getDocs(collection(db, "kullanicilar"));
      setKullanicilar(snap.docs.map((d) => ({ uid: d.id, ...d.data() })));
    } catch (e) {
      console.log("Yukleme hatasi:", e.message);
    } finally {
      setYukleniyor(false);
    }
  }

  function rolDegistirAc(uid) {
    setSeciliUid(uid);
    setRolModal(true);
  }

  async function rolDegistir(yeniRol) {
    if (!seciliUid) return;
    try {
      await updateDoc(doc(db, "kullanicilar", seciliUid), { rol: yeniRol });
      await yukle();
      setRolModal(false);
      Alert.alert("Basarili", "Rol guncellendi");
    } catch (e) {
      Alert.alert("Hata", e.message);
    }
  }

  function rolAd(r) {
    const found = ROLLER.find((x) => x.id === r) || { ad: r };
    return r === "bas_yonetici" ? "Bas Yonetici" : found.ad;
  }

  if (yukleniyor) {
    return (
      <View style={styles.yukleniyor}>
        <ActivityIndicator size="large" color="#667eea" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.liste}>
        {kullanicilar.map((k) => (
          <TouchableOpacity key={k.uid} style={styles.kart} onPress={() => rolDegistirAc(k.uid)}>
            <View style={styles.kartSol}>
              <Text style={styles.ad}>{k.ad || "-"}</Text>
              <Text style={styles.email}>{k.email || "-"}</Text>
              {k.birim ? <Text style={styles.birim}>🏢 {k.birim}</Text> : null}
              {k.tc ? <Text style={styles.tc}>T.C. {k.tc}</Text> : null}
            </View>
            <View style={styles.rolRozet}>
              <Text style={styles.rolYazi}>{rolAd(k.rol)}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {rolModal ? (
        <Modal visible transparent animationType="slide" onRequestClose={() => setRolModal(false)}>
          <View style={styles.modalArka}>
            <View style={styles.modalKart}>
              <Text style={styles.modalBaslik}>Rol Sec</Text>
              {ROLLER.map((r) => (
                <TouchableOpacity key={r.id} style={styles.modalButon} onPress={() => rolDegistir(r.id)}>
                  <Text style={styles.modalButonYazi}>{r.ad}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity style={styles.modalKapat} onPress={() => setRolModal(false)}>
                <Text style={styles.modalKapatYazi}>Kapat</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f1f5f9" },
  yukleniyor: { flex: 1, justifyContent: "center", alignItems: "center" },
  liste: { padding: 16, paddingBottom: 40 },
  kart: { backgroundColor: "#fff", borderRadius: 12, padding: 14, marginBottom: 10, elevation: 2, flexDirection: "row", alignItems: "center" },
  kartSol: { flex: 1 },
  ad: { fontSize: 15, fontWeight: "bold", color: "#1e293b" },
  email: { fontSize: 12, color: "#94a3b8", marginTop: 2 },
  birim: { fontSize: 12, color: "#667eea", marginTop: 4 },
  tc: { fontSize: 11, color: "#94a3b8", marginTop: 2 },
  rolRozet: { backgroundColor: "#ede9fe", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  rolYazi: { color: "#7c3aed", fontSize: 11, fontWeight: "bold" },
  modalArka: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalKart: { backgroundColor: "#fff", borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
  modalBaslik: { fontSize: 18, fontWeight: "bold", color: "#1e293b", marginBottom: 12 },
  modalButon: { backgroundColor: "#f1f5f9", padding: 14, borderRadius: 8, marginBottom: 6 },
  modalButonYazi: { fontSize: 15, fontWeight: "600", color: "#1e293b" },
  modalKapat: { padding: 14, alignItems: "center", marginTop: 6 },
  modalKapatYazi: { color: "#64748b", fontWeight: "600" },
});
