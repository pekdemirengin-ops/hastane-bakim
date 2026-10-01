import { useState, useEffect } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  ActivityIndicator, Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, collection, query, orderBy, getDocs } from "firebase/firestore";
import { auth, db } from "../lib/firebase";

export default function RaporEkrani() {
  const router = useRouter();
  const [kullanici, setKullanici] = useState(null);
  const [bildirimler, setBildirimler] = useState([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [kategoriFiltre, setKategoriFiltre] = useState("tumu");

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) { router.replace("/"); return; }
      const uDoc = await getDoc(doc(db, "kullanicilar", user.uid));
      if (!uDoc.exists()) { router.replace("/ana"); return; }
      const k = { uid: user.uid, ...uDoc.data() };
      if (k.rol !== "yonetici" && k.rol !== "bas_yonetici") {
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
      const q = query(collection(db, "bildirimler"), orderBy("olusturma", "desc"));
      const snap = await getDocs(q);
      setBildirimler(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.log("Yukleme hatasi:", e.message);
    } finally {
      setYukleniyor(false);
    }
  }

  function filtreUygula(liste) {
    if (kategoriFiltre === "tumu") return liste;
    return liste.filter((b) => b.kategori_id === kategoriFiltre);
  }

  function csvIndir(liste) {
    if (Platform.OS !== "web") {
      alert("CSV indirme sadece web'de calisiyor");
      return;
    }
    const basliklar = ["Bildirim No", "Tarih", "Kategori", "Alt Kategori", "Oncelik", "Durum", "Bildiren", "Birim", "Atanan", "Aciklama"];
    const satirlar = liste.map((b) => [
      b.bildirim_no || "",
      b.olusturma?.toDate ? b.olusturma.toDate().toLocaleString("tr-TR") : "",
      b.kategori_ad || "",
      b.alt_kategori || "",
      b.oncelik || "",
      b.durum || "",
      b.bildiren_ad || "",
      b.bildiren_birim || "",
      b.atanan_ad || "",
      (b.aciklama || "").replace(/\n/g, " "),
    ]);
    const csv = [basliklar, ...satirlar].map((r) => r.map((c) => '"' + String(c).replace(/"/g, '""') + '"').join(";")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "bildirimler_" + new Date().toISOString().slice(0, 10) + ".csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  const listelenen = filtreUygula(bildirimler);
  const toplam = listelenen.length;
  const acik = listelenen.filter((b) => b.durum === "acik").length;
  const islemde = listelenen.filter((b) => b.durum === "islemde" || b.durum === "atandi").length;
  const kapandi = listelenen.filter((b) => b.durum === "kapandi").length;
  const reddedildi = listelenen.filter((b) => b.durum === "reddedildi").length;

  const kapananlar = listelenen.filter((b) => b.durum === "kapandi" && b.olusturma && b.kapanma_tarihi);
  let ortSure = 0;
  if (kapananlar.length > 0) {
    let toplamMs = 0;
    kapananlar.forEach((b) => {
      try {
        const bas = b.olusturma.toDate();
        const bit = b.kapanma_tarihi.toDate();
        toplamMs += bit - bas;
      } catch (e) {}
    });
    ortSure = Math.round(toplamMs / kapananlar.length / 1000 / 60);
  }

  if (yukleniyor) {
    return (
      <View style={styles.yukleniyor}>
        <ActivityIndicator size="large" color="#667eea" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scroll}>
      <View style={styles.kategoriSatir}>
        {[
          { id: "tumu", ad: "Tum Birimler" },
          { id: "ariza", ad: "Ariza" },
          { id: "guvenlik", ad: "Guvenlik" },
          { id: "temizlik", ad: "Temizlik" },
          { id: "yonlendirme", ad: "Yonlendirme" },
        ].map((kf) => (
          <TouchableOpacity
            key={kf.id}
            style={[styles.kategoriButon, kategoriFiltre === kf.id && styles.kategoriAktif]}
            onPress={() => setKategoriFiltre(kf.id)}
          >
            <Text style={[styles.kategoriYazi, kategoriFiltre === kf.id && styles.kategoriYaziAktif]}>
              {kf.ad}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.raporGrup}>
        <View style={styles.raporSatir}>
          <View style={[styles.raporKart, { backgroundColor: "#dbeafe" }]}>
            <Text style={styles.raporSayi}>{toplam}</Text>
            <Text style={styles.raporEtiket}>Toplam</Text>
          </View>
          <View style={[styles.raporKart, { backgroundColor: "#fef3c7" }]}>
            <Text style={styles.raporSayi}>{acik}</Text>
            <Text style={styles.raporEtiket}>Acik</Text>
          </View>
        </View>
        <View style={styles.raporSatir}>
          <View style={[styles.raporKart, { backgroundColor: "#dbeafe" }]}>
            <Text style={styles.raporSayi}>{islemde}</Text>
            <Text style={styles.raporEtiket}>Islemde</Text>
          </View>
          <View style={[styles.raporKart, { backgroundColor: "#d1fae5" }]}>
            <Text style={styles.raporSayi}>{kapandi}</Text>
            <Text style={styles.raporEtiket}>Kapandi</Text>
          </View>
        </View>
        <View style={styles.raporSatir}>
          <View style={[styles.raporKart, { backgroundColor: "#fee2e2" }]}>
            <Text style={styles.raporSayi}>{reddedildi}</Text>
            <Text style={styles.raporEtiket}>Reddedildi</Text>
          </View>
          <View style={[styles.raporKart, { backgroundColor: "#ede9fe" }]}>
            <Text style={styles.raporSayi}>{ortSure} dk</Text>
            <Text style={styles.raporEtiket}>Ort. Cozum</Text>
          </View>
        </View>
      </View>

      <TouchableOpacity style={styles.csvButon} onPress={() => csvIndir(listelenen)}>
        <Text style={styles.csvYazi}>📊 CSV Indir (Excel)</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f1f5f9" },
  scroll: { padding: 16, paddingBottom: 40 },
  yukleniyor: { flex: 1, justifyContent: "center", alignItems: "center" },
  kategoriSatir: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 16 },
  kategoriButon: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: "#fff", borderWidth: 1, borderColor: "#e2e8f0" },
  kategoriAktif: { backgroundColor: "#667eea", borderColor: "#667eea" },
  kategoriYazi: { color: "#64748b", fontSize: 13 },
  kategoriYaziAktif: { color: "#fff", fontWeight: "bold" },
  raporGrup: { gap: 12, marginBottom: 20 },
  raporSatir: { flexDirection: "row", gap: 12 },
  raporKart: { flex: 1, borderRadius: 12, padding: 20, alignItems: "center", elevation: 2 },
  raporSayi: { fontSize: 28, fontWeight: "bold", color: "#1e293b", marginBottom: 4 },
  raporEtiket: { fontSize: 13, color: "#64748b" },
  csvButon: { backgroundColor: "#10b981", padding: 16, borderRadius: 12, alignItems: "center" },
  csvYazi: { color: "#fff", fontWeight: "bold", fontSize: 16 },
});
