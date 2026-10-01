import { useState, useEffect } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  ActivityIndicator, Alert, TextInput, Modal, Image,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { onAuthStateChanged } from "firebase/auth";
import {
  doc, getDoc, updateDoc, collection, getDocs,
  arrayUnion, serverTimestamp,
} from "firebase/firestore";
import { auth, db } from "../../lib/firebase";

export default function BildirimDetayEkrani() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const id = params.id;

  const [kullanici, setKullanici] = useState(null);
  const [bildirim, setBildirim] = useState(null);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [islemde, setIslemde] = useState(false);
  const [atamaModal, setAtamaModal] = useState(false);
  const [kullanicilar, setKullanicilar] = useState([]);
  const [cozumModal, setCozumModal] = useState(false);
  const [cozumNotu, setCozumNotu] = useState("");
  const [redModal, setRedModal] = useState(false);
  const [redSebep, setRedSebep] = useState("");

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) { router.replace("/"); return; }
      const uDoc = await getDoc(doc(db, "kullanicilar", user.uid));
      setKullanici(uDoc.exists() ? { uid: user.uid, ...uDoc.data() } : { uid: user.uid, ad: user.email, rol: "personel" });
      await bildirimiYukle();
    });
    return unsub;
  }, [id]);

  async function bildirimiYukle() {
    try {
      const d = await getDoc(doc(db, "bildirimler", id));
      if (d.exists()) setBildirim({ id: d.id, ...d.data() });
      else { Alert.alert("Hata", "Bildirim bulunamadi"); router.back(); }
    } catch (e) {
      console.log("Yukleme hatasi:", e.message);
    } finally {
      setYukleniyor(false);
    }
  }

  async function kullanicilariYukle() {
    try {
      const snap = await getDocs(collection(db, "kullanicilar"));
      setKullanicilar(snap.docs.map((d) => ({ uid: d.id, ...d.data() })));
    } catch (e) {
      console.log("Kullanici yukleme hatasi:", e.message);
    }
  }

  async function durumGuncelle(yeniDurum, ekAlan) {
    ekAlan = ekAlan || {};
    setIslemde(true);
    try {
      await updateDoc(doc(db, "bildirimler", id), {
        durum: yeniDurum,
        guncelleme: serverTimestamp(),
        gecmis: arrayUnion({
          tarih: new Date().toISOString(),
          islem: yeniDurum,
          yapan_uid: kullanici.uid,
          yapan_ad: kullanici.ad || kullanici.email,
        }),
        ...ekAlan,
      });
      await bildirimiYukle();
    } catch (e) {
      Alert.alert("Hata", e.message);
    } finally {
      setIslemde(false);
    }
  }

  async function bildirimAta(hedefKullanici) {
    setIslemde(true);
    try {
      await updateDoc(doc(db, "bildirimler", id), {
        durum: "islemde",
        sorumlu_uid: kullanici.uid,
        sorumlu_ad: kullanici.ad || kullanici.email,
        atanan_uid: hedefKullanici.uid,
        atanan_ad: hedefKullanici.ad || hedefKullanici.email,
        atama_tarihi: serverTimestamp(),
        guncelleme: serverTimestamp(),
        gecmis: arrayUnion({
          tarih: new Date().toISOString(),
          islem: "atandi",
          yapan_uid: kullanici.uid,
          yapan_ad: kullanici.ad || kullanici.email,
          hedef_uid: hedefKullanici.uid,
          hedef_ad: hedefKullanici.ad || hedefKullanici.email,
        }),
      });
      setAtamaModal(false);
      await bildirimiYukle();
      Alert.alert("Basarili", (hedefKullanici.ad || hedefKullanici.email) + " kisisine atandi!");
    } catch (e) {
      console.log("Atama hatasi:", e.message);
      Alert.alert("Hata", "Atama yapilamadi: " + e.message);
    } finally {
      setIslemde(false);
    }
  }

  async function isiAl() {
    await durumGuncelle("islemde", {
      atanan_uid: kullanici.uid,
      atanan_ad: kullanici.ad || kullanici.email,
      atama_tarihi: serverTimestamp(),
    });
  }

  async function yaptim() {
    if (!cozumNotu.trim()) { Alert.alert("Hata", "Cozum notu gerekli"); return; }
    await durumGuncelle("onay_bekliyor", {
      cozum_notu: cozumNotu.trim(),
      cozum_tarihi: serverTimestamp(),
    });
    setCozumNotu("");
    setCozumModal(false);
  }

  async function onayla() {
    await durumGuncelle("kapandi", { kapanma_tarihi: serverTimestamp() });
  }

  async function reddet() {
    if (!redSebep.trim()) { Alert.alert("Hata", "Red sebebi gerekli"); return; }
    await durumGuncelle("reddedildi", { red_sebebi: redSebep.trim() });
    setRedSebep("");
    setRedModal(false);
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
      acik: "#fbbf24", atandi: "#f97316", islemde: "#3b82f6",
      onay_bekliyor: "#a855f7", kapandi: "#10b981", reddedildi: "#ef4444",
    };
    return map[d] || "#94a3b8";
  }

  function durumAd(d) {
    const map = {
      acik: "Acik", atandi: "Atandi", islemde: "Islemde",
      onay_bekliyor: "Onay Bekliyor", kapandi: "Kapandi", reddedildi: "Reddedildi",
    };
    return map[d] || d;
  }

  if (yukleniyor || !bildirim || !kullanici) {
    return (
      <View style={styles.yukleniyor}>
        <ActivityIndicator size="large" color="#667eea" />
      </View>
    );
  }

  const benBildiren = kullanici.uid === bildirim.bildiren_uid;
  const benTeknisyen = kullanici.uid === bildirim.atanan_uid;
  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.ustKart}>
          <Text style={styles.bildirimNo}>{bildirim.bildirim_no}</Text>
          <View style={[styles.durumRozet, { backgroundColor: durumRenk(bildirim.durum) }]}>
            <Text style={styles.durumYazi}>{durumAd(bildirim.durum)}</Text>
          </View>
        </View>

        <View style={styles.kart}>
          <Text style={styles.kartBaslik}>Kategori</Text>
          <Text style={styles.kartDeger}>
            {bildirim.kategori_ikon || "📌"} {bildirim.kategori_ad}
            {bildirim.alt_kategori ? " › " + bildirim.alt_kategori : ""}
          </Text>
        </View>

        <View style={styles.kart}>
          <Text style={styles.kartBaslik}>Aciklama</Text>
          <Text style={styles.kartDeger}>{bildirim.aciklama}</Text>
        </View>

        {bildirim.cozum_notu ? (
          <View style={styles.kart}>
            <Text style={styles.kartBaslik}>Cozum Notu</Text>
            <Text style={styles.kartDeger}>{bildirim.cozum_notu}</Text>
          </View>
        ) : null}

        {bildirim.fotograflar && bildirim.fotograflar.length > 0 ? (
          <View style={styles.kart}>
            <Text style={styles.kartBaslik}>Fotograflar</Text>
            <ScrollView horizontal>
              {bildirim.fotograflar.map((f, i) => (
                <Image key={i} source={{ uri: f.url }} style={styles.foto} />
              ))}
            </ScrollView>
          </View>
        ) : null}

        <View style={styles.kart}>
          <Text style={styles.kartBaslik}>Bilgiler</Text>
          <View style={styles.bilgiSatir}>
            <Text style={styles.bilgiEtiket}>Bildiren:</Text>
            <Text style={styles.bilgiDeger}>{bildirim.bildiren_ad}</Text>
          </View>
          {bildirim.bildiren_birim ? (
            <View style={styles.bilgiSatir}>
              <Text style={styles.bilgiEtiket}>Birim:</Text>
              <Text style={styles.bilgiDeger}>{bildirim.bildiren_birim}</Text>
            </View>
          ) : null}
          <View style={styles.bilgiSatir}>
            <Text style={styles.bilgiEtiket}>Tarih:</Text>
            <Text style={styles.bilgiDeger}>{tarihGoster(bildirim.olusturma)}</Text>
          </View>
          {bildirim.atanan_ad ? (
            <View style={styles.bilgiSatir}>
              <Text style={styles.bilgiEtiket}>Atanan:</Text>
              <Text style={styles.bilgiDeger}>{bildirim.atanan_ad}</Text>
            </View>
          ) : null}
          {bildirim.konum && bildirim.konum.metin ? (
            <View style={styles.bilgiSatir}>
              <Text style={styles.bilgiEtiket}>Konum:</Text>
              <Text style={styles.bilgiDeger}>📍 {bildirim.konum.metin}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.aksiyonGrup}>
          {bildirim.durum === "acik" && kullanici.rol === "sorumlu" ? (
            <TouchableOpacity
              style={[styles.aksiyonButon, styles.ataButon]}
              onPress={() => { kullanicilariYukle(); setAtamaModal(true); }}
              disabled={islemde}
            >
              <Text style={styles.aksiyonYazi}>Atama Yap</Text>
            </TouchableOpacity>
          ) : null}

          {bildirim.durum === "acik" && kullanici.rol === "teknisyen" ? (
            <TouchableOpacity
              style={[styles.aksiyonButon, styles.maviButon]}
              onPress={isiAl}
              disabled={islemde}
            >
              <Text style={styles.aksiyonYazi}>Isi Al</Text>
            </TouchableOpacity>
          ) : null}

          {bildirim.durum === "islemde" && benTeknisyen ? (
            <TouchableOpacity
              style={[styles.aksiyonButon, styles.morButon]}
              onPress={() => setCozumModal(true)}
              disabled={islemde}
            >
              <Text style={styles.aksiyonYazi}>Yaptim</Text>
            </TouchableOpacity>
          ) : null}

          {bildirim.durum === "onay_bekliyor" && benBildiren ? (
            <>
              <TouchableOpacity
                style={[styles.aksiyonButon, styles.yesilButon]}
                onPress={onayla}
                disabled={islemde}
              >
                <Text style={styles.aksiyonYazi}>Onayla</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.aksiyonButon, styles.kirmiziButon]}
                onPress={() => setRedModal(true)}
                disabled={islemde}
              >
                <Text style={styles.aksiyonYazi}>Reddet</Text>
              </TouchableOpacity>
            </>
          ) : null}
        </View>

        {bildirim.gecmis && bildirim.gecmis.length > 0 ? (
          <View style={styles.kart}>
            <Text style={styles.kartBaslik}>Gecmis</Text>
            {bildirim.gecmis.map((g, i) => (
              <View key={i} style={styles.gecmisSatir}>
                <Text style={styles.gecmisIslem}>{g.islem}</Text>
                <Text style={styles.gecmisYapan}>{g.yapan_ad}</Text>
                <Text style={styles.gecmisTarih}>{new Date(g.tarih).toLocaleString("tr-TR")}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </ScrollView>

      {atamaModal ? (
        <Modal visible transparent animationType="slide" onRequestClose={() => setAtamaModal(false)}>
          <View style={styles.modalArka}>
            <View style={styles.modalKart}>
              <Text style={styles.modalBaslik}>Kime Atansin?</Text>
              <ScrollView style={{ maxHeight: 300 }}>
                {kullanicilar.filter((k) =>
                  (k.birim === bildirim.alt_kategori || k.birim === bildirim.bildiren_birim) &&
                  (k.rol === "personel" || k.rol === "teknisyen") &&
                  k.uid !== kullanici.uid
                ).map((k) => (
                  <TouchableOpacity
                    key={k.uid}
                    style={styles.modalKategori}
                    onPress={() => bildirimAta(k)}
                  >
                    <Text style={styles.modalKategoriYazi}>{k.ad || k.email}</Text>
                    <Text style={styles.modalAltYazi}>{k.rol} - {k.birim || "Birim yok"}</Text>
                  </TouchableOpacity>
                ))}
                {kullanicilar.filter((k) =>
                  (k.birim === bildirim.alt_kategori || k.birim === bildirim.bildiren_birim) &&
                  (k.rol === "personel" || k.rol === "teknisyen") &&
                  k.uid !== kullanici.uid
                ).length === 0 ? (
                  <Text style={styles.modalAltYazi}>Bu kategoride atanabilir personel/teknisyen bulunamadi.</Text>
                ) : null}
              </ScrollView>
              <TouchableOpacity style={styles.modalKapat} onPress={() => setAtamaModal(false)}>
                <Text style={styles.modalKapatYazi}>Kapat</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      ) : null}

      {cozumModal ? (
        <Modal visible transparent animationType="slide" onRequestClose={() => setCozumModal(false)}>
          <View style={styles.modalArka}>
            <View style={styles.modalKart}>
              <Text style={styles.modalBaslik}>Cozum Notu</Text>
              <TextInput
                style={styles.modalInput}
                value={cozumNotu}
                onChangeText={setCozumNotu}
                placeholder="Ne yaptiginizi yazin..."
                placeholderTextColor="#94a3b8"
                multiline
              />
              <TouchableOpacity style={styles.modalKaydet} onPress={yaptim}>
                <Text style={styles.modalKaydetYazi}>Kaydet</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalKapat} onPress={() => setCozumModal(false)}>
                <Text style={styles.modalKapatYazi}>Iptal</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      ) : null}

      {redModal ? (
        <Modal visible transparent animationType="slide" onRequestClose={() => setRedModal(false)}>
          <View style={styles.modalArka}>
            <View style={styles.modalKart}>
              <Text style={styles.modalBaslik}>Red Sebebi</Text>
              <TextInput
                style={styles.modalInput}
                value={redSebep}
                onChangeText={setRedSebep}
                placeholder="Neden reddediyorsunuz?"
                placeholderTextColor="#94a3b8"
                multiline
              />
              <TouchableOpacity style={[styles.modalKaydet, { backgroundColor: "#dc2626" }]} onPress={reddet}>
                <Text style={styles.modalKaydetYazi}>Reddet</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalKapat} onPress={() => setRedModal(false)}>
                <Text style={styles.modalKapatYazi}>Iptal</Text>
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
  scroll: { padding: 16, paddingBottom: 40 },
  yukleniyor: { flex: 1, justifyContent: "center", alignItems: "center" },
  ustKart: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  bildirimNo: { fontSize: 16, fontWeight: "bold", color: "#667eea" },
  durumRozet: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 12 },
  durumYazi: { color: "#fff", fontSize: 12, fontWeight: "bold" },
  kart: { backgroundColor: "#fff", borderRadius: 12, padding: 14, marginBottom: 10, elevation: 2 },
  kartBaslik: { fontSize: 12, color: "#64748b", marginBottom: 6, fontWeight: "600" },
  kartDeger: { fontSize: 15, color: "#1e293b", lineHeight: 22 },
  bilgiSatir: { flexDirection: "row", marginBottom: 6 },
  bilgiEtiket: { fontSize: 13, color: "#64748b", width: 90 },
  bilgiDeger: { fontSize: 13, color: "#1e293b", flex: 1, fontWeight: "500" },
  foto: { width: 120, height: 120, borderRadius: 8, marginRight: 8 },
  aksiyonGrup: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 },
  aksiyonButon: { flex: 1, minWidth: 140, padding: 16, borderRadius: 10, alignItems: "center" },
  ataButon: { backgroundColor: "#f97316" },
  maviButon: { backgroundColor: "#3b82f6" },
  morButon: { backgroundColor: "#a855f7" },
  yesilButon: { backgroundColor: "#10b981" },
  kirmiziButon: { backgroundColor: "#dc2626" },
  aksiyonYazi: { color: "#fff", fontWeight: "bold", fontSize: 15 },
  gecmisSatir: { paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: "#f1f5f9" },
  gecmisIslem: { fontSize: 13, fontWeight: "bold", color: "#667eea" },
  gecmisYapan: { fontSize: 12, color: "#64748b" },
  gecmisTarih: { fontSize: 11, color: "#94a3b8" },
  modalArka: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalKart: { backgroundColor: "#fff", borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
  modalBaslik: { fontSize: 18, fontWeight: "bold", color: "#1e293b", marginBottom: 12 },
  modalKategori: { padding: 14, backgroundColor: "#f1f5f9", borderRadius: 8, marginBottom: 6 },
  modalKategoriYazi: { fontSize: 15, fontWeight: "600", color: "#1e293b" },
  modalAltYazi: { fontSize: 12, color: "#64748b", marginTop: 2, padding: 8 },
  modalInput: { backgroundColor: "#f8fafc", borderRadius: 10, padding: 12, fontSize: 14, color: "#1e293b", minHeight: 80, borderWidth: 1, borderColor: "#e2e8f0" },
  modalKaydet: { backgroundColor: "#10b981", padding: 14, borderRadius: 10, alignItems: "center", marginTop: 12 },
  modalKaydetYazi: { color: "#fff", fontWeight: "bold", fontSize: 15 },
  modalKapat: { padding: 14, alignItems: "center", marginTop: 6 },
  modalKapatYazi: { color: "#64748b", fontWeight: "600" },
});
