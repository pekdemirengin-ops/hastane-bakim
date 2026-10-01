export const KATEGORILER = [
  {
    id: "ariza",
    ad: "Ariza Bildirim",
    ikon: "🔧",
    altKategoriler: [
      { ad: "Bilgisayar Donanim", anahtar: ["bilgisayar", "ekran", "klavye", "mouse", "ram", "disk", "anakart"] },
      { ad: "Bilgisayar Yazilim", anahtar: ["yazilim", "program", "windows", "office", "lisans", "guncelleme"] },
      { ad: "Biyomedikal", anahtar: ["monitor", "ventilator", "pompa", "infuzyon", "defibrilator", "ultrason", "rontgen", "ekg", "oksijen", "tibbi", "cihaz"] },
      { ad: "Teknik Servis", anahtar: ["lamba", "isik", "ampul", "priz", "elektrik", "su", "kacak", "klima", "asansor", "kapi", "cam", "mobilya", "teknik"] },
    ],
  },
  {
    id: "guvenlik",
    ad: "Guvenlik",
    ikon: "🔒",
    altKategoriler: [
      { ad: "Fiziksel Guvenlik", anahtar: ["kapi", "kilit", "kart", "guvenlik", "kamera", "giris"] },
      { ad: "Yangin", anahtar: ["yangin", "tupu", "alarm", "duman", "acil", "cikis"] },
    ],
  },
  {
    id: "temizlik",
    ad: "Temizlik",
    ikon: "🧹",
    altKategoriler: [
      { ad: "Genel Temizlik", anahtar: ["temizlik", "supur", "paspas", "cop", "tuvalet", "lavabo"] },
      { ad: "Tibbi Atik", anahtar: ["atik", "tibbi atik", "enjektor", "kirmizi", "poset"] },
    ],
  },
  {
    id: "yonlendirme",
    ad: "Yonlendirme",
    ikon: "🧭",
    altKategoriler: [
      { ad: "Hasta Yonlendirme", anahtar: ["hasta", "yonlendir", "poliklinik", "servis", "oda"] },
      { ad: "Bilgi Danisma", anahtar: ["bilgi", "danisma", "soru", "yardim"] },
    ],
  },
];

export function kategoriBul(kategoriId) {
  return KATEGORILER.find((k) => k.id === kategoriId) || null;
}

export function altKategoriBul(kategoriId, altKategoriAd) {
  const kat = kategoriBul(kategoriId);
  if (!kat) return null;
  return kat.altKategoriler.find((a) => a.ad === altKategoriAd) || null;
}
