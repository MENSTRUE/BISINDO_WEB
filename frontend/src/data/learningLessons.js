/* =========================================
   BISINDO LEARNING DATASET
========================================= */


/*
 * Catatan:
 *
 * Deskripsi movement pada dataset ini
 * disusun berdasarkan video referensi
 * pembelajaran yang digunakan aplikasi.
 *
 * Ini BUKAN klaim bahwa deskripsi tersebut
 * merupakan standar BISINDO nasional.
 *
 * Jika nanti sudah diverifikasi oleh
 * pengguna/komunitas BISINDO, field
 * verified dapat diubah menjadi true.
 */


const PRACTICE_RULES = {
  requiredRepetitions: 10,

  minConfidencePercent: 75,

  minMarginPercent: 10,
};


const LEARNING_CATEGORIES = [
  "Semua",
  "Dasar",
  "Aktivitas",
  "Pertanyaan",
  "Warna",
  "Waktu",
  "Relasi",
  "Tempat",
  "Benda",
];


const LEARNING_LESSONS = [
  {
    id: 0,

    word: "Air",

    slug: "air",

    category: "Dasar",

    video:
      "/learning-videos/air.mp4",

    meaning:
      "Kosakata yang digunakan untuk menyebut air.",

    example:
      "Saya minum air.",

    verified: false,

    movement: {
      hands:
        "Satu tangan dominan",

      start:
        "Mulai dari posisi tangan rileks di samping tubuh.",

      action:
        "Angkat tangan dominan ke depan dada hingga berada pada posisi mendatar seperti pada video, kemudian lakukan gerakan singkat mengikuti contoh.",

      finish:
        "Kembalikan tangan ke posisi netral.",

      focus: [
        "Ketinggian tangan di depan dada.",
        "Orientasi telapak tangan.",
        "Arah gerakan pendek pada bagian tengah gesture.",
      ],
    },
  },


  {
    id: 1,

    word: "Belajar",

    slug: "belajar",

    category: "Aktivitas",

    video:
      "/learning-videos/belajar.mp4",

    meaning:
      "Kosakata untuk menyatakan kegiatan belajar atau mempelajari sesuatu.",

    example:
      "Saya belajar BISINDO.",

    verified: false,

    movement: {
      hands:
        "Satu tangan dominan",

      start:
        "Posisi awal tangan berada dalam keadaan rileks.",

      action:
        "Angkat tangan dominan menuju area sisi kepala atau kening dan lakukan gerakan seperti pada video referensi.",

      finish:
        "Turunkan tangan kembali ke posisi awal.",

      focus: [
        "Posisi tangan di sekitar kepala.",
        "Bentuk jari saat tangan berada dekat kepala.",
        "Tempo gerakan.",
      ],
    },
  },


  {
    id: 2,

    word: "Cari",

    slug: "cari",

    category: "Aktivitas",

    video:
      "/learning-videos/cari.mp4",

    meaning:
      "Kosakata untuk menyatakan kegiatan mencari seseorang atau sesuatu.",

    example:
      "Saya cari teman.",

    verified: false,

    movement: {
      hands:
        "Satu tangan dominan",

      start:
        "Tangan dominan mulai dari posisi bawah.",

      action:
        "Angkat tangan ke area depan wajah lalu lakukan perubahan posisi tangan dan gerakan pendek seperti yang terlihat pada video.",

      finish:
        "Tangan kembali turun menuju posisi netral.",

      focus: [
        "Bentuk tangan saat berada di depan wajah.",
        "Arah gerakan.",
        "Perubahan bentuk jari selama gesture.",
      ],
    },
  },


  {
    id: 3,

    word: "Hari",

    slug: "hari",

    category: "Waktu",

    video:
      "/learning-videos/hari.mp4",

    meaning:
      "Kosakata yang digunakan ketika membicarakan hari.",

    example:
      "Hari ini saya belajar.",

    verified: false,

    movement: {
      hands:
        "Satu tangan dominan",

      start:
        "Angkat tangan dominan menuju sisi wajah.",

      action:
        "Gerakkan tangan dari area sisi wajah menuju bagian depan atau tengah tubuh mengikuti video referensi.",

      finish:
        "Tangan kembali ke posisi netral.",

      focus: [
        "Posisi awal di sisi wajah.",
        "Arah gerakan menuju tengah tubuh.",
        "Orientasi telapak tangan.",
      ],
    },
  },


  {
    id: 4,

    word: "Ingat",

    slug: "ingat",

    category: "Aktivitas",

    video:
      "/learning-videos/ingat.mp4",

    meaning:
      "Kosakata untuk menyatakan bahwa seseorang mengingat sesuatu.",

    example:
      "Saya ingat teman saya.",

    verified: false,

    movement: {
      hands:
        "Satu tangan dominan",

      start:
        "Tangan dominan mulai dari posisi rileks.",

      action:
        "Angkat tangan menuju area dahi atau pelipis dan berhenti atau menyentuh area tersebut seperti pada video.",

      finish:
        "Turunkan tangan kembali.",

      focus: [
        "Posisi tangan di area dahi atau pelipis.",
        "Bentuk jari.",
        "Gerakan harus singkat dan jelas.",
      ],
    },
  },


  {
    id: 5,

    word: "Lagi",

    slug: "lagi",

    category: "Dasar",

    video:
      "/learning-videos/lagi.mp4",

    meaning:
      "Kosakata untuk menunjukkan sesuatu yang dilakukan atau terjadi kembali.",

    example:
      "Saya belajar lagi.",

    verified: false,

    movement: {
      hands:
        "Satu tangan dominan",

      start:
        "Angkat tangan dominan ke area depan dada.",

      action:
        "Lakukan perubahan bentuk tangan dan gerakan pendek seperti yang ditampilkan pada video.",

      finish:
        "Kembalikan tangan ke posisi netral.",

      focus: [
        "Perubahan bentuk jari.",
        "Posisi tangan tetap di sekitar depan dada.",
        "Tempo gerakan.",
      ],
    },
  },


  {
    id: 6,

    word: "Maaf",

    slug: "maaf",

    category: "Dasar",

    video:
      "/learning-videos/maaf.mp4",

    meaning:
      "Ungkapan yang digunakan untuk meminta maaf.",

    example:
      "Maaf, saya terlambat.",

    verified: false,

    movement: {
      hands:
        "Satu tangan dominan",

      start:
        "Tangan dominan diangkat dari posisi netral.",

      action:
        "Bawa tangan menuju area wajah lalu lakukan gerakan pendek mengikuti contoh pada video.",

      finish:
        "Turunkan kembali tangan.",

      focus: [
        "Posisi tangan relatif terhadap wajah.",
        "Bentuk jari.",
        "Arah gerakan tangan.",
      ],
    },
  },


  {
    id: 7,

    word: "Makan",

    slug: "makan",

    category: "Aktivitas",

    video:
      "/learning-videos/makan.mp4",

    meaning:
      "Kosakata untuk menyatakan aktivitas makan.",

    example:
      "Saya makan pagi.",

    verified: false,

    movement: {
      hands:
        "Satu tangan dominan",

      start:
        "Tangan dominan mulai di depan tubuh.",

      action:
        "Gerakkan tangan menuju area mulut mengikuti bentuk dan arah gerakan pada video.",

      finish:
        "Tangan bergerak kembali menjauh dari mulut.",

      focus: [
        "Bentuk tangan.",
        "Gerakan menuju mulut.",
        "Jarak tangan terhadap wajah.",
      ],
    },
  },


  {
    id: 8,

    word: "Motor",

    slug: "motor",

    category: "Benda",

    video:
      "/learning-videos/motor.mp4",

    meaning:
      "Kosakata untuk menyebut sepeda motor.",

    example:
      "Saya berangkat naik motor.",

    verified: false,

    movement: {
      hands:
        "Kedua tangan",

      start:
        "Angkat kedua tangan di depan tubuh.",

      action:
        "Posisikan kedua tangan seperti memegang bagian depan atau setang dan lakukan gerakan kecil mengikuti video.",

      finish:
        "Kedua tangan kembali turun.",

      focus: [
        "Jarak kedua tangan.",
        "Ketinggian kedua tangan harus relatif sejajar.",
        "Gerakan kecil pada pergelangan atau tangan.",
      ],
    },
  },


  {
    id: 9,

    word: "Saya",

    slug: "saya",

    category: "Dasar",

    video:
      "/learning-videos/saya.mp4",

    meaning:
      "Kosakata untuk merujuk pada diri sendiri.",

    example:
      "Saya belajar BISINDO.",

    verified: false,

    movement: {
      hands:
        "Satu tangan dominan",

      start:
        "Tangan dimulai dari posisi rileks.",

      action:
        "Angkat tangan dominan menuju bagian dada dan arahkan atau tempatkan tangan pada area dada seperti pada video.",

      finish:
        "Tangan kembali menuju posisi awal.",

      focus: [
        "Gerakan menuju dada.",
        "Posisi akhir tangan pada bagian dada.",
        "Jangan melakukan gerakan terlalu cepat.",
      ],
    },
  },


  {
    id: 10,

    word: "Terima kasih",

    slug: "terima-kasih",

    category: "Dasar",

    video:
      "/learning-videos/terima-kasih.mp4",

    meaning:
      "Ungkapan untuk menyampaikan rasa terima kasih.",

    example:
      "Terima kasih, teman.",

    verified: false,

    movement: {
      hands:
        "Satu tangan dominan",

      start:
        "Angkat tangan menuju area mulut atau dagu.",

      action:
        "Gerakkan tangan dari area wajah menuju arah depan mengikuti gerakan pada video.",

      finish:
        "Tangan berhenti di depan tubuh lalu kembali netral.",

      focus: [
        "Posisi awal dekat wajah.",
        "Gerakan tangan menuju depan.",
        "Orientasi telapak.",
      ],
    },
  },


  {
    id: 11,

    word: "Tuli",

    slug: "tuli",

    category: "Dasar",

    video:
      "/learning-videos/tuli.mp4",

    meaning:
      "Kosakata yang berkaitan dengan identitas atau kondisi Tuli.",

    example:
      "Dia teman Tuli saya.",

    verified: false,

    movement: {
      hands:
        "Satu tangan dominan",

      start:
        "Angkat tangan dominan menuju sisi kepala.",

      action:
        "Arahkan jari atau tangan ke area telinga dan lakukan gerakan pendek seperti pada video.",

      finish:
        "Tangan kembali turun.",

      focus: [
        "Lokasi tangan dekat telinga.",
        "Bentuk jari.",
        "Gerakan tidak terlalu lebar.",
      ],
    },
  },


  {
    id: 12,

    word: "Apa",

    slug: "apa",

    category: "Pertanyaan",

    video:
      "/learning-videos/apa.mp4",

    meaning:
      "Kata tanya untuk menanyakan benda, hal, atau informasi.",

    example:
      "Apa itu?",

    verified: false,

    movement: {
      hands:
        "Satu tangan dominan",

      start:
        "Tangan dimulai dalam posisi rileks.",

      action:
        "Angkat tangan di depan tubuh dengan telapak terbuka menghadap ke atas dan lakukan gerakan pendek mengikuti video.",

      finish:
        "Turunkan tangan kembali.",

      focus: [
        "Telapak tangan menghadap ke atas.",
        "Posisi tangan di depan tubuh.",
        "Arah gerakan.",
      ],
    },
  },


  {
    id: 13,

    word: "Siapa",

    slug: "siapa",

    category: "Pertanyaan",

    video:
      "/learning-videos/siapa.mp4",

    meaning:
      "Kata tanya untuk menanyakan seseorang.",

    example:
      "Siapa teman kamu?",

    verified: false,

    movement: {
      hands:
        "Satu tangan dominan",

      start:
        "Angkat tangan ke depan dada.",

      action:
        "Bentuk tangan mengikuti contoh video dan lakukan gerakan pendek di depan tubuh.",

      finish:
        "Kembalikan tangan ke posisi netral.",

      focus: [
        "Bentuk jari atau ibu jari.",
        "Posisi tangan di depan dada.",
        "Gerakan kecil selama gesture.",
      ],
    },
  },


  {
    id: 14,

    word: "Kapan",

    slug: "kapan",

    category: "Pertanyaan",

    video:
      "/learning-videos/kapan.mp4",

    meaning:
      "Kata tanya untuk menanyakan waktu.",

    example:
      "Kapan kamu datang?",

    verified: false,

    movement: {
      hands:
        "Satu tangan dominan",

      start:
        "Angkat tangan dominan di depan tubuh.",

      action:
        "Bentuk tangan mengikuti contoh video dan lakukan gerakan singkat pada area depan dada.",

      finish:
        "Tangan kembali turun.",

      focus: [
        "Handshape selama gesture.",
        "Posisi di depan dada.",
        "Gerakan pendek dan terkontrol.",
      ],
    },
  },


  {
    id: 15,

    word: "Di mana",

    slug: "di-mana",

    category: "Pertanyaan",

    video:
      "/learning-videos/di-mana.mp4",

    meaning:
      "Kata tanya untuk menanyakan tempat atau lokasi.",

    example:
      "Rumah kamu di mana?",

    verified: false,

    movement: {
      hands:
        "Satu tangan dominan",

      start:
        "Angkat tangan di depan tubuh.",

      action:
        "Buka telapak tangan menghadap ke atas lalu lakukan gerakan kecil seperti pada video.",

      finish:
        "Tangan kembali ke posisi awal.",

      focus: [
        "Arah telapak tangan.",
        "Ketinggian tangan.",
        "Gerakan kecil tangan.",
      ],
    },
  },


  {
    id: 16,

    word: "Mengapa",

    slug: "mengapa",

    category: "Pertanyaan",

    video:
      "/learning-videos/mengapa.mp4",

    meaning:
      "Kata tanya untuk menanyakan alasan atau sebab.",

    example:
      "Mengapa kamu datang?",

    verified: false,

    movement: {
      hands:
        "Satu tangan dominan",

      start:
        "Angkat tangan menuju sisi kepala atau wajah.",

      action:
        "Dari area kepala, gerakkan tangan keluar atau ke depan dengan bentuk tangan mengikuti video.",

      finish:
        "Tangan berakhir di bagian depan tubuh.",

      focus: [
        "Posisi awal dekat kepala.",
        "Perubahan posisi tangan saat bergerak keluar.",
        "Bentuk jari.",
      ],
    },
  },


  {
    id: 17,

    word: "Bagaimana",

    slug: "bagaimana",

    category: "Pertanyaan",

    video:
      "/learning-videos/bagaimana.mp4",

    meaning:
      "Kata tanya untuk menanyakan cara atau keadaan.",

    example:
      "Bagaimana cara belajar BISINDO?",

    verified: false,

    movement: {
      hands:
        "Kedua tangan",

      start:
        "Mulai dengan kedua tangan di bagian depan tubuh.",

      action:
        "Angkat kedua tangan dengan telapak terbuka lalu arahkan telapak ke atas seperti yang terlihat pada video.",

      finish:
        "Kedua tangan berhenti di depan tubuh lalu kembali netral.",

      focus: [
        "Gerakkan kedua tangan secara bersamaan.",
        "Telapak tangan terbuka.",
        "Perhatikan perubahan orientasi telapak.",
      ],
    },
  },


  {
    id: 18,

    word: "Merah",

    slug: "merah",

    category: "Warna",

    video:
      "/learning-videos/merah.mp4",

    meaning:
      "Kosakata untuk menyebut warna merah.",

    example:
      "Motor itu merah.",

    verified: false,

    movement: {
      hands:
        "Satu tangan dominan",

      start:
        "Angkat tangan dominan menuju area wajah.",

      action:
        "Tempatkan atau gerakkan tangan di sekitar bagian mulut atau pipi mengikuti contoh pada video.",

      finish:
        "Tangan kembali turun.",

      focus: [
        "Posisi tangan dekat wajah.",
        "Bentuk jari.",
        "Arah gerakan pendek.",
      ],
    },
  },


  {
    id: 19,

    word: "Kuning",

    slug: "kuning",

    category: "Warna",

    video:
      "/learning-videos/kuning.mp4",

    meaning:
      "Kosakata untuk menyebut warna kuning.",

    example:
      "Baju itu kuning.",

    verified: false,

    movement: {
      hands:
        "Satu tangan dominan",

      start:
        "Angkat tangan menuju bagian depan atau sisi leher.",

      action:
        "Tempatkan tangan di area leher dan lakukan gerakan pendek mengikuti video.",

      finish:
        "Turunkan kembali tangan.",

      focus: [
        "Posisi tangan di area leher.",
        "Bentuk tangan.",
        "Gerakan singkat.",
      ],
    },
  },


  {
    id: 20,

    word: "Hijau",

    slug: "hijau",

    category: "Warna",

    video:
      "/learning-videos/hijau.mp4",

    meaning:
      "Kosakata untuk menyebut warna hijau.",

    example:
      "Baju saya hijau.",

    verified: false,

    movement: {
      hands:
        "Satu tangan dominan",

      start:
        "Angkat tangan dari sisi tubuh.",

      action:
        "Bawa tangan menuju area atas atau sisi kepala dengan telapak terbuka mengikuti video.",

      finish:
        "Turunkan tangan kembali.",

      focus: [
        "Ketinggian tangan.",
        "Orientasi telapak.",
        "Gerakan di sekitar sisi kepala.",
      ],
    },
  },


  {
    id: 21,

    word: "Hitam",

    slug: "hitam",

    category: "Warna",

    video:
      "/learning-videos/hitam.mp4",

    meaning:
      "Kosakata untuk menyebut warna hitam.",

    example:
      "Motor saya hitam.",

    verified: false,

    movement: {
      hands:
        "Satu tangan dominan",

      start:
        "Angkat tangan ke sisi wajah.",

      action:
        "Gerakkan tangan di area wajah sambil mengubah bentuk tangan seperti pada video.",

      finish:
        "Tangan kembali ke posisi netral.",

      focus: [
        "Perubahan bentuk tangan.",
        "Posisi relatif terhadap wajah.",
        "Tempo gerakan.",
      ],
    },
  },


  {
    id: 22,

    word: "Dengar",

    slug: "dengar",

    category: "Aktivitas",

    video:
      "/learning-videos/dengar.mp4",

    meaning:
      "Kosakata yang berkaitan dengan aktivitas mendengar.",

    example:
      "Saya dengar suara motor.",

    verified: false,

    movement: {
      hands:
        "Satu tangan dominan",

      start:
        "Angkat tangan menuju sisi kepala.",

      action:
        "Arahkan tangan atau jari ke area telinga mengikuti video referensi.",

      finish:
        "Turunkan tangan kembali.",

      focus: [
        "Lokasi tangan dekat telinga.",
        "Bentuk jari.",
        "Gerakan singkat.",
      ],
    },
  },


  {
    id: 23,

    word: "Berangkat",

    slug: "berangkat",

    category: "Aktivitas",

    video:
      "/learning-videos/berangkat.mp4",

    meaning:
      "Kosakata untuk menyatakan kegiatan mulai pergi menuju suatu tempat.",

    example:
      "Saya berangkat pagi.",

    verified: false,

    movement: {
      hands:
        "Satu tangan dominan",

      start:
        "Angkat tangan dominan di depan atau dekat wajah.",

      action:
        "Gerakkan tangan menuju arah depan seperti pada video.",

      finish:
        "Tangan kembali menuju posisi netral.",

      focus: [
        "Arah gerak keluar atau ke depan.",
        "Posisi awal tangan.",
        "Bentuk tangan selama bergerak.",
      ],
    },
  },


  {
    id: 24,

    word: "Datang",

    slug: "datang",

    category: "Aktivitas",

    video:
      "/learning-videos/datang.mp4",

    meaning:
      "Kosakata untuk menyatakan seseorang datang atau tiba.",

    example:
      "Teman saya datang sore.",

    verified: false,

    movement: {
      hands:
        "Satu tangan dominan",

      start:
        "Tangan dominan berada di bagian depan atau samping tubuh.",

      action:
        "Gerakkan tangan menuju bagian tengah tubuh mengikuti arah pada video.",

      finish:
        "Tangan kembali netral.",

      focus: [
        "Arah gerakan menuju tubuh.",
        "Posisi tangan.",
        "Orientasi telapak.",
      ],
    },
  },


  {
    id: 25,

    word: "Teman",

    slug: "teman",

    category: "Relasi",

    video:
      "/learning-videos/teman.mp4",

    meaning:
      "Kosakata untuk menyebut seorang teman.",

    example:
      "Dia teman saya.",

    verified: false,

    movement: {
      hands:
        "Kedua tangan",

      start:
        "Angkat kedua tangan di depan dada.",

      action:
        "Pertemukan kedua tangan atau jari dan lakukan bentuk hubungan tangan mengikuti video referensi.",

      finish:
        "Kedua tangan kembali ke posisi netral.",

      focus: [
        "Pertemuan kedua tangan.",
        "Bentuk jari pada kedua tangan.",
        "Posisi di depan dada.",
      ],
    },
  },


  {
    id: 26,

    word: "Keluarga",

    slug: "keluarga",

    category: "Relasi",

    video:
      "/learning-videos/keluarga.mp4",

    meaning:
      "Kosakata untuk menyebut keluarga.",

    example:
      "Keluarga saya di rumah.",

    verified: false,

    movement: {
      hands:
        "Satu tangan dominan pada video referensi",

      start:
        "Angkat tangan dominan di depan bagian tengah tubuh.",

      action:
        "Lakukan gerakan melingkar atau menyapu di depan tubuh mengikuti jalur yang diperlihatkan video.",

      finish:
        "Turunkan tangan menuju posisi awal.",

      focus: [
        "Jalur gerakan tangan.",
        "Ketinggian tangan di depan tubuh.",
        "Orientasi tangan selama gerakan.",
      ],
    },
  },


  {
    id: 27,

    word: "Rumah",

    slug: "rumah",

    category: "Tempat",

    video:
      "/learning-videos/rumah.mp4",

    meaning:
      "Kosakata untuk menyebut rumah atau tempat tinggal.",

    example:
      "Saya di rumah.",

    verified: false,

    movement: {
      hands:
        "Kedua tangan",

      start:
        "Mulai dengan kedua tangan di bagian depan tubuh.",

      action:
        "Angkat kedua tangan menuju bagian atas tubuh dan bentuk posisi menyerupai sisi atau atap seperti yang terlihat pada video.",

      finish:
        "Kedua tangan bergerak kembali turun.",

      focus: [
        "Gunakan kedua tangan.",
        "Kedua tangan bergerak relatif simetris.",
        "Perhatikan bentuk pada posisi tertinggi.",
      ],
    },
  },


  {
    id: 28,

    word: "Pagi",

    slug: "pagi",

    category: "Waktu",

    video:
      "/learning-videos/pagi.mp4",

    meaning:
      "Kosakata untuk menyebut waktu pagi.",

    example:
      "Saya berangkat pagi.",

    verified: false,

    movement: {
      hands:
        "Satu tangan dominan",

      start:
        "Angkat tangan ke area atas dada.",

      action:
        "Gerakkan tangan secara mendatar atau menyapu di area dada mengikuti video.",

      finish:
        "Turunkan kembali tangan.",

      focus: [
        "Posisi di sekitar dada.",
        "Arah gerakan horizontal.",
        "Orientasi telapak.",
      ],
    },
  },


  {
    id: 29,

    word: "Siang",

    slug: "siang",

    category: "Waktu",

    video:
      "/learning-videos/siang.mp4",

    meaning:
      "Kosakata untuk menyebut waktu siang.",

    example:
      "Saya makan siang.",

    verified: false,

    movement: {
      hands:
        "Satu tangan dominan",

      start:
        "Tangan mulai di depan atau sekitar dada.",

      action:
        "Gerakkan tangan dari area dada menuju posisi yang lebih tinggi di atas atau sisi kepala seperti pada video.",

      finish:
        "Turunkan tangan kembali.",

      focus: [
        "Perubahan ketinggian tangan.",
        "Arah gerakan ke atas.",
        "Bentuk tangan pada posisi akhir.",
      ],
    },
  },


  {
    id: 30,

    word: "Sore",

    slug: "sore",

    category: "Waktu",

    video:
      "/learning-videos/sore.mp4",

    meaning:
      "Kosakata untuk menyebut waktu sore.",

    example:
      "Teman saya datang sore.",

    verified: false,

    movement: {
      hands:
        "Satu tangan dominan",

      start:
        "Angkat tangan hingga berada di atas atau sisi kepala.",

      action:
        "Gerakkan tangan turun atau berubah posisi di sekitar sisi kepala mengikuti video.",

      finish:
        "Tangan kembali menuju posisi netral.",

      focus: [
        "Posisi awal yang tinggi.",
        "Arah gerakan turun.",
        "Bentuk jari saat gerakan selesai.",
      ],
    },
  },


  {
    id: 31,

    word: "Malam",

    slug: "malam",

    category: "Waktu",

    video:
      "/learning-videos/malam.mp4",

    meaning:
      "Kosakata untuk menyebut waktu malam.",

    example:
      "Saya belajar malam.",

    verified: false,

    movement: {
      hands:
        "Satu tangan dominan",

      start:
        "Angkat tangan di sisi tubuh.",

      action:
        "Gerakkan tangan secara menyapu menuju bagian depan atau melintasi dada mengikuti video.",

      finish:
        "Tangan berakhir di depan tubuh lalu kembali netral.",

      focus: [
        "Gerakan menyapu.",
        "Ketinggian tangan.",
        "Arah gerakan dari sisi menuju tengah.",
      ],
    },
  },
];


const getLessonById = (
  id
) =>
  LEARNING_LESSONS.find(
    (lesson) =>
      lesson.id ===
      Number(id)
  )
  ??
  null;


const getLessonByLabel = (
  label
) => {
  const normalized =
    String(
      label ?? ""
    )
      .trim()
      .toLowerCase();


  return (
    LEARNING_LESSONS.find(
      (lesson) =>
        lesson.word
          .toLowerCase()
          ===
        normalized
    )
    ??
    null
  );
};


export {
  LEARNING_LESSONS,
  LEARNING_CATEGORIES,
  PRACTICE_RULES,
  getLessonById,
  getLessonByLabel,
};