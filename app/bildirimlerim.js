import { useState, useEffect } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  TextInput, ActivityIndicator, RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { onAuthStateChanged } from "firebase/auth";
import {
  doc, getDoc, collection, query, where, orderBy, getDocs,
} from "firebase/firestore";
import { auth, db } from "../lib/firebase";

const FILTRELER = [
  { id: "tumu", ad: "Tumu" },
  { id: "acik", ad: "Acik" },
  { id: "islemde", ad: "Islemde" },
  { id: "onay_bekliyor", ad: "Onay Bekliyor" },
  { id: "kapandi", ad: "Kapandi" },
  { id: "reddedildi", ad: "Reddedildi" },
];

export default function BildirimlerimEkrani() {
  const router = useRouter();
  const [kullanici, setKullanici] = useState(null);
  const [bildirimler, setBildirimler] = useState([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [yenileniyor, setYenileniyor] = useState(false);
  const [filtre, setFiltre] = useState("tumu");
  const [arama, setArama] = useState("");

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) { router.replace("/"); return; }
      const uDoc = await getDoc(doc(db, "kullanicilar", user.uid));
      setKullanici(uDoc.exists() ? { uid: user.uid, ...uDoc.data() } : { uid: user.uid, ad: user.email, rol: "personel" });
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (kullanici) yukle();
  }, [kullanici]);

  async function yukle() {
    if (!kullanici) return;
    try {
      let q;
      const TUM_GOREN = ["yonetici", "bas_yonetici"];
      if (TUM_GOREN.includes(kullanici.rol)) {
        q = query(
          collection(db, "bildirimler"),
          orderBy("olusturma", "desc")
        );
      } else if (kullanici.rol === "sorumlu") {
        q = query(
          collection(db, "bildirimler"),
          where("kategori_id", "==", "ariza"),
          where("alt_kategori", "==", "Teknik Servis"),
          orderBy("olusturma", "desc")
        );
      } else if (kullanici.rol === "teknisyen") {
        q = query(
          collection(db, "bildirimler"),
          where("atanan_uid", "==", kullanici.uid),
          orderBy("olusturma", "desc")
        );
      } else {
        q = query(
          collection(db, "bildirimler"),
          where("bildiren_uid", "==", kullanici.uid),
          orderBy("olusturma", "desc")
        );
      }
      const snap = await getDocs(q);
      setBildirimler(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.log("Yukleme hatasi:", e.message);
    } finally {
      setYukleniyor(false);
      setYenileniyor(false);
    }
  }

  function yenile() {
    setYenileniyor(true);
    yukle();
  }
  function filtreUygula(liste) {
    let sonuc = liste;
    if (filtre !== "tumu") {
      sonuc = sonuc.filter((b) => b.durum === filtre);
    }
    if (arama.trim()) {
      const q = arama.toLowerCase();
      sonuc = sonuc.filter(
        (b) =>
          (b.bildirim_no || "").toLowerCase().includes(q) ||
          (b.aciklama || "").toLowerCase().includes(q) ||
          (b.kategori_ad || "").toLowerCase().includes(q) ||
          (b.alt_kategori || "").toLowerCase().includes(q)
      );
    }
    return sonuc;
  }

  function tarihGoster(ts) {
    if (!ts) return "-";
    try {
      const d = ts.toDate ? ts.toDate() : new Date(ts);
      return d.toLocaleString("tr-TR");
    } catch (e) { return "-"; }
  }

  function durumRenk(d) {
    const map = {
      acik: "#fbbf24", islemde: "#3b82f6", atandi: "#f97316",
      yapildi_bekliyor: "#a855f7", onay_bekliyor: "#a855f7",
      kapandi: "#10b981", reddedildi: "#ef4444",
    };
    return map[d] || "#94a3b8";
  }

  function durumAd(d) {
    const map = {
      acik: "Acik", islemde: "Islemde", atandi: "Atandi",
      yapildi_bekliyor: "Onay Bekliyor", onay_bekliyor: "Onay Bekliyor",
      kapandi: "Kapandi", reddedildi: "Reddedildi",
    };
    return map[d] || d;
  }

  function oncelikRenk(p) {
    return p === "acil" ? "#dc2626" : p === "onemli" ? "#f59e0b" : "#10b981";
  }

  const listelenen = filtreUygula(bildirimler);
  if (yukleniyor) {
    return (
      <View style={styles.yukleniyor}>
        <ActivityIndicator size="large" color="#667eea" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.ustAlan}>
        <TextInput
          style={styles.aramaInput}
          value={arama}
          onChangeText={setArama}
          placeholder="Ara: no, aciklama, kategori..."
          placeholderTextColor="#94a3b8"
        />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtreSatir}>
          {FILTRELER.map((f) => (
            <TouchableOpacity
              key={f.id}
              style={[styles.filtreButon, filtre === f.id && styles.filtreAktif]}
              onPress={() => setFiltre(f.id)}
            >
              <Text style={[styles.filtreYazi, filtre === f.id && styles.filtreYaziAktif]}>
                {f.ad}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView
        contentContainerStyle={styles.liste}
        refreshControl={
          <RefreshControl refreshing={yenileniyor} onRefresh={yenile} />
        }
      >
        {listelenen.length === 0 ? (
          <View style={styles.bosAlan}>
            <Text style={styles.bosIkon}>📭</Text>
            <Text style={styles.bosBaslik}>Bildirim yok</Text>
            <Text style={styles.bosYazi}>Ana ekrandan yeni bildirim olusturabilirsiniz</Text>
          </View>
        ) : (
          listelenen.map((b) => (
            <TouchableOpacity
              key={b.id}
              style={styles.kart}
              onPress={() => router.push("/bildirim/" + b.id)}
            >
              <View style={styles.kartUst}>
                <Text style={styles.bildirimNo}>{b.bildirim_no || "-"}</Text>
                <View style={[styles.durumRozet, { backgroundColor: durumRenk(b.durum) }]}>
                  <Text style={styles.durumYazi}>{durumAd(b.durum)}</Text>
                </View>
              </View>
              <Text style={styles.kartAciklama} numberOfLines={2}>{b.aciklama}</Text>
              <View style={styles.kartAlt}>
                <Text style={styles.kartKategori}>
                  {b.kategori_ikon || "📌"} {b.kategori_ad || "-"}
                  {b.alt_kategori ? " › " + b.alt_kategori : ""}
                </Text>
                <View style={[styles.oncelikNokta, { backgroundColor: oncelikRenk(b.oncelik) }]} />
              </View>
              <Text style={styles.kartTarih}>{tarihGoster(b.olusturma)}</Text>
              {b.atanan_ad ? (
                <Text style={styles.kartAtanan}>👤 Atanan: {b.atanan_ad}</Text>
              ) : null}
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f1f5f9" },
  yukleniyor: { flex: 1, justifyContent: "center", alignItems: "center" },
  ustAlan: { backgroundColor: "#fff", paddingTop: 10, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: "#e2e8f0" },
  aramaInput: { backgroundColor: "#f8fafc", marginHorizontal: 12, padding: 10, borderRadius: 10, fontSize: 14, color: "#1e293b", borderWidth: 1, borderColor: "#e2e8f0" },
  filtreSatir: { paddingHorizontal: 12, paddingTop: 8 },
  filtreButon: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: "#f1f5f9", marginRight: 8, borderWidth: 1, borderColor: "#e2e8f0" },
  filtreAktif: { backgroundColor: "#667eea", borderColor: "#667eea" },
  filtreYazi: { color: "#64748b", fontSize: 13 },
  filtreYaziAktif: { color: "#fff", fontWeight: "bold" },
  liste: { padding: 12, paddingBottom: 40 },
  bosAlan: { alignItems: "center", paddingTop: 60 },
  bosIkon: { fontSize: 60, marginBottom: 12 },
  bosBaslik: { fontSize: 18, fontWeight: "bold", color: "#1e293b", marginBottom: 6 },
  bosYazi: { fontSize: 13, color: "#94a3b8", textAlign: "center", paddingHorizontal: 30 },
  kart: { backgroundColor: "#fff", borderRadius: 12, padding: 14, marginBottom: 10, elevation: 2 },
  kartUst: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  bildirimNo: { fontSize: 12, color: "#667eea", fontWeight: "bold" },
  durumRozet: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12 },
  durumYazi: { color: "#fff", fontSize: 11, fontWeight: "bold" },
  kartAciklama: { fontSize: 14, color: "#1e293b", marginBottom: 8, lineHeight: 20 },
  kartAlt: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  kartKategori: { fontSize: 12, color: "#64748b" },
  oncelikNokta: { width: 10, height: 10, borderRadius: 5 },
  kartTarih: { fontSize: 11, color: "#94a3b8" },
  kartAtanan: { fontSize: 12, color: "#667eea", marginTop: 4, fontWeight: "600" },
});
