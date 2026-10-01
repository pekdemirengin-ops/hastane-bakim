import { useState, useEffect } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, ScrollView, Platform, Image,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection, addDoc, doc, getDoc, updateDoc, setDoc, serverTimestamp,
} from "firebase/firestore";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { auth, db } from "../lib/firebase";
import { supabase, STORAGE_BUCKET } from "../lib/supabase";
import { KATEGORILER, kategoriBul } from "../lib/kategoriler";

export default function BildirimOnayEkrani() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [kullanici, setKullanici] = useState(null);
  const [fotograflar, setFotograflar] = useState([]);
  const [konum, setKonum] = useState(null);
  const [konumAdres, setKonumAdres] = useState("");
  const [not, setNot] = useState("");
  const [gonderiliyor, setGonderiliyor] = useState(false);

  const [seciliKategoriId, setSeciliKategoriId] = useState(params.kategoriId || "");
  const [seciliAltKategori, setSeciliAltKategori] = useState(params.altKategori || "");
  const [seciliOncelik, setSeciliOncelik] = useState(params.oncelik || "normal");

  const metin = params.metin || "";
  const kategori = kategoriBul(seciliKategoriId);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) { router.replace("/"); return; }
      const userDoc = await getDoc(doc(db, "kullanicilar", user.uid));
      if (userDoc.exists()) {
        setKullanici({ uid: user.uid, ...userDoc.data() });
      } else {
        setKullanici({ uid: user.uid, ad: user.email, rol: "personel" });
      }
    });
    return unsub;
  }, []);

  useEffect(() => { konumAl(); }, []);

  async function konumAl() {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setKonumAdres("Konum izni verilmedi - lutfen manuel girin");
        return;
      }
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const lat = loc.coords.latitude;
      const lng = loc.coords.longitude;
      setKonum({ lat, lng });

      if (Platform.OS === "web") {
        setKonumAdres(lat.toFixed(5) + ", " + lng.toFixed(5));
      } else {
        try {
          const adres = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
          if (adres && adres[0]) {
            const a = adres[0];
            const parcalar = [a.street, a.district, a.city].filter(Boolean);
            setKonumAdres(parcalar.join(", ") || lat.toFixed(5) + ", " + lng.toFixed(5));
          } else {
            setKonumAdres(lat.toFixed(5) + ", " + lng.toFixed(5));
          }
        } catch (e) {
          setKonumAdres(lat.toFixed(5) + ", " + lng.toFixed(5));
        }
      }
    } catch (e) {
      console.log("Konum hatasi:", e.message);
      setKonumAdres("Konum alinamadi - lutfen manuel girin");
    }
  }

  async function fotografCek() {
    try {
      const izin = await ImagePicker.requestCameraPermissionsAsync();
      if (!izin.granted) { Alert.alert("Izin gerekli", "Kamera izni vermelisiniz"); return; }
      const sonuc = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.7,
      });
      if (!sonuc.canceled && sonuc.assets && sonuc.assets[0]) {
        setFotograflar([...fotograflar, sonuc.assets[0].uri]);
      }
    } catch (e) { console.log("Kamera hatasi:", e.message); }
  }

  async function fotografSec() {
    try {
      const izin = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!izin.granted) { Alert.alert("Izin gerekli", "Galeri izni vermelisiniz"); return; }
      const sonuc = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.7,
      });
      if (!sonuc.canceled && sonuc.assets && sonuc.assets[0]) {
        setFotograflar([...fotograflar, sonuc.assets[0].uri]);
      }
    } catch (e) { console.log("Galeri hatasi:", e.message); }
  }

  async function fotografYukle(uri, bildirimId) {
    const response = await fetch(uri);
    const blob = await response.blob();
    const arrayBuffer = await new Response(blob).arrayBuffer();
    const dosyaAdi = bildirimId + "/" + Date.now() + ".jpg";
    const { error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(dosyaAdi, arrayBuffer, { contentType: "image/jpeg" });
    if (error) throw error;
    const { data: urlData } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(dosyaAdi);
    return urlData.publicUrl;
  }

  async function yeniBildirimNo() {
    const yil = new Date().getFullYear();
    const sayacRef = doc(db, "sayaclar", "bildirim_" + yil);
    const sayacSnap = await getDoc(sayacRef);
    let sira = 1;
    if (sayacSnap.exists()) sira = (sayacSnap.data().son_sira || 0) + 1;
    try { await updateDoc(sayacRef, { son_sira: sira }); }
    catch { await setDoc(sayacRef, { son_sira: sira, yil: yil }); }
    return yil + "-" + String(sira).padStart(5, "0");
  }
  async function gonder() {
    if (!kullanici) { Alert.alert("Hata", "Kullanici bilgisi yuklenmedi"); return; }
    if (!kategori) { Alert.alert("Hata", "Kategori secilmedi"); return; }
    setGonderiliyor(true);
    try {
      const bildirimNo = await yeniBildirimNo();
      const yeniDoc = await addDoc(collection(db, "bildirimler"), {
        bildirim_no: bildirimNo,
        yil: new Date().getFullYear(),
        aciklama: metin,
        orijinal_metin: metin,
        kategori_id: kategori.id,
        kategori_ad: kategori.ad,
        kategori_ikon: kategori.ikon,
        alt_kategori: seciliAltKategori,
        oncelik: seciliOncelik,
        durum: "acik",
        konum: {
          metin: konumAdres || "Konum alinamadi",
          lat: konum?.lat || null,
          lng: konum?.lng || null,
        },
        bildiren_uid: kullanici.uid,
        bildiren_ad: kullanici.ad || kullanici.email,
        bildiren_birim: kullanici.birim || "",
        fotograflar: [],
        not: not.trim(),
        olusturma: serverTimestamp(),
        guncelleme: serverTimestamp(),
        gecmis: [{
          tarih: new Date().toISOString(),
          islem: "olusturuldu",
          yapan_uid: kullanici.uid,
          yapan_ad: kullanici.ad || kullanici.email,
        }],
      });

      const fotoUrls = [];
      for (const uri of fotograflar) {
        try {
          const url = await fotografYukle(uri, yeniDoc.id);
          fotoUrls.push({ url: url, olusturma: new Date().toISOString() });
        } catch (e) { console.log("Foto yuklenemedi:", e.message); }
      }

      if (fotoUrls.length > 0) {
        await updateDoc(doc(db, "bildirimler", yeniDoc.id), { fotograflar: fotoUrls });
      }

      Alert.alert("Basarili", "Bildirim olusturuldu: " + bildirimNo);
      router.replace("/bildirimlerim");
    } catch (e) {
      console.log("Gonderme hatasi:", e.message);
      Alert.alert("Hata", "Bildirim olusturulamadi: " + e.message);
    } finally {
      setGonderiliyor(false);
    }
  }

  if (!kullanici || !kategori) {
    return (
      <View style={styles.yukleniyor}>
        <ActivityIndicator size="large" color="#667eea" />
      </View>
    );
  }
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.ustKart}>
        <Text style={styles.ustBaslik}>Bildirimi Onayla</Text>
        <Text style={styles.ustMetin}>{metin}</Text>
      </View>

      <View style={styles.bolum}>
        <Text style={styles.bolumBaslik}>Kategori</Text>
        <View style={styles.kategoriSatir}>
          {KATEGORILER.map((kat) => (
            <TouchableOpacity
              key={kat.id}
              style={[styles.kategoriButon, seciliKategoriId === kat.id && styles.kategoriAktif]}
              onPress={() => setSeciliKategoriId(kat.id)}
            >
              <Text style={[styles.kategoriYazi, seciliKategoriId === kat.id && styles.kategoriYaziAktif]}>
                {kat.ikon} {kat.ad}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.bolum}>
        <Text style={styles.bolumBaslik}>Alt Kategori</Text>
        <TextInput
          style={styles.input}
          value={seciliAltKategori}
          onChangeText={setSeciliAltKategori}
          placeholder="Ornek: Teknik Servis"
          placeholderTextColor="#94a3b8"
        />
      </View>

      <View style={styles.bolum}>
        <Text style={styles.bolumBaslik}>Oncelik</Text>
        <View style={styles.oncelikSatir}>
          {[
            { id: "normal", ad: "NORMAL", renk: "#10b981" },
            { id: "onemli", ad: "ONEMLI", renk: "#f59e0b" },
            { id: "acil", ad: "ACIL", renk: "#dc2626" },
          ].map((o) => (
            <TouchableOpacity
              key={o.id}
              style={[styles.oncelikButon, seciliOncelik === o.id && { backgroundColor: o.renk }]}
              onPress={() => setSeciliOncelik(o.id)}
            >
              <Text style={[styles.oncelikYazi, seciliOncelik === o.id && styles.oncelikYaziAktif]}>
                {o.ad}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.bolum}>
        <Text style={styles.bolumBaslik}>Fotograflar ({fotograflar.length})</Text>
        <View style={styles.fotoSatir}>
          <TouchableOpacity style={styles.fotoButon} onPress={fotografCek}>
            <Text style={styles.fotoIkon}>📷</Text>
            <Text style={styles.fotoYazi}>Kamera</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.fotoButon} onPress={fotografSec}>
            <Text style={styles.fotoIkon}>🖼️</Text>
            <Text style={styles.fotoYazi}>Galeri</Text>
          </TouchableOpacity>
        </View>
        {fotograflar.length > 0 ? (
          <ScrollView horizontal style={{ marginTop: 10 }}>
            {fotograflar.map((uri, i) => (
              <Image key={i} source={{ uri }} style={styles.fotoOnizleme} />
            ))}
          </ScrollView>
        ) : null}
      </View>

      <View style={styles.bolum}>
        <Text style={styles.bolumBaslik}>Konum</Text>
        <TextInput
          style={styles.input}
          value={konumAdres}
          onChangeText={setKonumAdres}
          placeholder="Konumu yazin veya otomatik alin"
          placeholderTextColor="#94a3b8"
        />
        <TouchableOpacity style={styles.konumYenile} onPress={konumAl}>
          <Text style={styles.konumYenileYazi}>📍 Konumu Otomatik Al</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.bolum}>
        <Text style={styles.bolumBaslik}>Ek Not (opsiyonel)</Text>
        <TextInput
          style={styles.input}
          value={not}
          onChangeText={setNot}
          placeholder="Eklemek istediginiz not..."
          placeholderTextColor="#94a3b8"
          multiline
        />
      </View>

      <TouchableOpacity
        style={[styles.gonderButon, gonderiliyor && styles.gonderPasif]}
        onPress={gonder}
        disabled={gonderiliyor}
      >
        {gonderiliyor ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.gonderYazi}>✓ Bildirimi Gonder</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 40, backgroundColor: "#f1f5f9" },
  yukleniyor: { flex: 1, justifyContent: "center", alignItems: "center" },
  ustKart: { backgroundColor: "#667eea", borderRadius: 12, padding: 16, marginBottom: 12 },
  ustBaslik: { color: "#fff", fontSize: 13, marginBottom: 6, opacity: 0.9 },
  ustMetin: { color: "#fff", fontSize: 16, fontWeight: "600" },
  bolum: { backgroundColor: "#fff", borderRadius: 12, padding: 16, marginBottom: 12, elevation: 2 },
  bolumBaslik: { fontSize: 15, fontWeight: "bold", color: "#1e293b", marginBottom: 10 },
  kategoriSatir: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  kategoriButon: { backgroundColor: "#f1f5f9", padding: 10, borderRadius: 8, borderWidth: 1, borderColor: "#e2e8f0" },
  kategoriAktif: { backgroundColor: "#667eea", borderColor: "#667eea" },
  kategoriYazi: { color: "#64748b", fontSize: 13 },
  kategoriYaziAktif: { color: "#fff", fontWeight: "bold" },
  input: { backgroundColor: "#f8fafc", borderRadius: 10, padding: 12, fontSize: 14, color: "#1e293b", borderWidth: 1, borderColor: "#e2e8f0" },
  oncelikSatir: { flexDirection: "row", gap: 8 },
  oncelikButon: { flex: 1, padding: 12, borderRadius: 8, backgroundColor: "#f1f5f9", alignItems: "center", borderWidth: 1, borderColor: "#e2e8f0" },
  oncelikYazi: { color: "#64748b", fontWeight: "bold", fontSize: 13 },
  oncelikYaziAktif: { color: "#fff" },
  fotoSatir: { flexDirection: "row", gap: 10 },
  fotoButon: { flex: 1, backgroundColor: "#f8fafc", padding: 14, borderRadius: 10, alignItems: "center", borderWidth: 1, borderColor: "#e2e8f0" },
  fotoIkon: { fontSize: 24, marginBottom: 4 },
  fotoYazi: { color: "#667eea", fontWeight: "600", fontSize: 13 },
  fotoOnizleme: { width: 80, height: 80, borderRadius: 8, marginRight: 8 },
  konumYenile: { marginTop: 8, padding: 8, alignSelf: "flex-start" },
  konumYenileYazi: { color: "#667eea", fontWeight: "600", fontSize: 13 },
  gonderButon: { backgroundColor: "#10b981", padding: 18, borderRadius: 12, alignItems: "center", marginTop: 8 },
  gonderPasif: { backgroundColor: "#94a3b8" },
  gonderYazi: { color: "#fff", fontWeight: "bold", fontSize: 16 },
});
