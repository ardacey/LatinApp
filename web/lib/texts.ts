export type TextSection = {
  label: string;
  latin: string;
};

export type LatinText = {
  slug: string;
  author: string;
  title: string;
  work: string;
  century: string;
  difficulty: "kolay" | "orta" | "zor";
  description: string;
  sections: TextSection[];
};

export const TEXTS: LatinText[] = [
  {
    slug: "caesar-dbg-1",
    author: "Gaius Iulius Caesar",
    title: "De Bello Gallico — I. Kitap",
    work: "De Bello Gallico",
    century: "M.Ö. 1. yüzyıl",
    difficulty: "orta",
    description: "Caesar'ın Galya Savaşı hakkındaki anı eserinin açılışı. Galya'nın coğrafi ve etnik tanımını yapar.",
    sections: [
      {
        label: "I.1",
        latin: "Gallia est omnis divisa in partes tres, quarum unam incolunt Belgae, aliam Aquitani, tertiam qui ipsorum lingua Celtae, nostra Galli appellantur.",
      },
      {
        label: "I.2",
        latin: "Hi omnes lingua, institutis, legibus inter se differunt. Gallos ab Aquitanis Garumna flumen, a Belgis Matrona et Sequana dividit.",
      },
      {
        label: "I.3",
        latin: "Horum omnium fortissimi sunt Belgae, propterea quod a cultu atque humanitate provinciae longissime absunt, minimeque ad eos mercatores saepe commeant atque ea quae ad effeminandos animos pertinent important, proximique sunt Germanis, qui trans Rhenum incolunt, quibuscum continenter bellum gerunt.",
      },
    ],
  },
  {
    slug: "vergilius-aeneis-1",
    author: "Publius Vergilius Maro",
    title: "Aeneis — I. Kitap, 1–11. Satırlar",
    work: "Aeneis",
    century: "M.Ö. 1. yüzyıl",
    difficulty: "zor",
    description: "Latin edebiyatının en büyük destanının açılışı. Aeneas'ın Troya'dan İtalya'ya yolculuğunu anlatır.",
    sections: [
      {
        label: "I.1–11",
        latin: "Arma virumque cano, Troiae qui primus ab oris Italiam, fato profugus, Laviniaque venit litora, multum ille et terris iactatus et alto vi superum saevae memorem Iunonis ob iram; multa quoque et bello passus, dum conderet urbem, inferretque deos Latio, genus unde Latinum, Albanique patres, atque altae moenia Romae.",
      },
    ],
  },
  {
    slug: "phaedrus-lupus-agnus",
    author: "Gaius Iulius Phaedrus",
    title: "Lupus et Agnus",
    work: "Fabulae Aesopiae — I. Kitap, 1. Fabl",
    century: "M.S. 1. yüzyıl",
    difficulty: "kolay",
    description: "Phaedrus'un en ünlü fabülü: güçlünün zayıfı ezmesini anlatan klasik bir hikâye.",
    sections: [
      {
        label: "Fabl",
        latin: "Ad rivum eundem lupus et agnus venerant, siti compulsi. Superior stabat lupus, longeque inferior agnus. Tunc fauce improba latro incitatus iurgii causam intulit: Cur, inquit, turbulentam fecisti mihi aquam bibenti? Laniger contra timens: Qui possum, quaeso, facere quod quereris, lupe? A te decurrit ad meos haustus liquor. Repulsus ille veritatis viribus: Ante hos sex menses, ait, male dixisti mihi. Respondit agnus: Equidem natus non eram. Pater, hercle tuus, ait, male dixit mihi. Atque ita correptum lacerat iniusta nece. Haec propter illos scripta est homines fabula, qui fictis causis innocentes opprimunt.",
      },
    ],
  },
  {
    slug: "seneca-epistula-1",
    author: "Lucius Annaeus Seneca",
    title: "Epistulae Morales — I. Mektup",
    work: "Epistulae Morales ad Lucilium",
    century: "M.S. 1. yüzyıl",
    difficulty: "orta",
    description: "Seneca'nın Lucilius'a yazdığı mektupların ilki. Zamanın değeri üzerine felsefi bir düşünce.",
    sections: [
      {
        label: "§1",
        latin: "Ita fac, mi Lucili: vindica te tibi, et tempus quod adhuc aut auferebatur aut subripiebatur aut excidebat collige et serva.",
      },
      {
        label: "§2",
        latin: "Persuade tibi hoc sic esse ut scribo: quaedam tempora eripiuntur nobis, quaedam subducuntur, quaedam effluunt. Turpissima tamen est iactura quae per neglegentiam fit. Et si volueris attendere, magna pars vitae elabitur male agentibus, maxima nihil agentibus, tota vita aliud agentibus.",
      },
      {
        label: "§3",
        latin: "Omnia, Lucili, aliena sunt, tempus tantum nostrum est. In hunc unum casum naturae nos dedit, ex hoc nos pellit quicumque vult.",
      },
    ],
  },
  {
    slug: "cicero-de-officiis",
    author: "Marcus Tullius Cicero",
    title: "Seçme Sözler",
    work: "De Officiis · De Re Publica · Philippicae",
    century: "M.Ö. 1. yüzyıl",
    difficulty: "orta",
    description: "Cicero'nun çeşitli eserlerinden alınan ünlü Latince sözler. Retorik ve felsefi düşüncenin zirvesi.",
    sections: [
      {
        label: "De Re Publica",
        latin: "Salus populi suprema lex esto. Omnia praeclara rara. Dum spiro, spero.",
      },
      {
        label: "In Catilinam",
        latin: "O tempora, o mores! Quousque tandem abutere, Catilina, patientia nostra? Quam diu etiam furor iste tuus nos eludet?",
      },
      {
        label: "De Amicitia",
        latin: "Amicitia nisi in bonis esse non potest. Ita fit ut amicitia res humanae omnes ad se rapiat, nullum relinquat locum nec doloribus nec curis.",
      },
    ],
  },
  {
    slug: "ovidius-metamorphoses-1",
    author: "Publius Ovidius Naso",
    title: "Metamorphoses — Açılış",
    work: "Metamorphoses — I. Kitap, 1–4. Satırlar",
    century: "M.S. 1. yüzyıl",
    difficulty: "zor",
    description: "Ovidius'un dönüşümler üzerine yazdığı destanın açılışı. Kaos'tan düzene geçişi anlatır.",
    sections: [
      {
        label: "I.1–4",
        latin: "In nova fert animus mutatas dicere formas corpora; di, coeptis, nam vos mutastis et illas, adspirate meis primaque ab origine mundi ad mea perpetuum deducite tempora carmen.",
      },
    ],
  },
];

export const DIFFICULTY_LABELS: Record<string, string> = {
  kolay: "Kolay",
  orta: "Orta",
  zor: "Zor",
};

export const DIFFICULTY_COLORS: Record<string, string> = {
  kolay: "bg-green-100 text-green-700 border-green-200",
  orta:  "bg-amber-100 text-amber-700 border-amber-200",
  zor:   "bg-red-100 text-red-700 border-red-200",
};
