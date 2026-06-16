export const db = {
  users: [
    {
      id: "1",
      nama: "Super Admin",
      email: "alitsumberdana@gmail.com",
      password: "$2a$10$X7.1m/A.9w9w9w9w9w9w9.9w9w9w9w9w9w9w9w9w9w9w9w9w9w9w9", // password123
      noHp: "081234567890",
      role: "Super Admin",
      profilePic: "" as string | undefined,
    },
    {
      id: "2",
      nama: "Budi Santoso",
      email: "budi@warga.com",
      password: "$2a$10$X7.1m/A.9w9w9w9w9w9w9.9w9w9w9w9w9w9w9w9w9w9w9w9w9w9w9", // password123
      noHp: "081234567891",
      role: "Warga",
      profilePic: "" as string | undefined,
    }
  ],
  warga: [
    {
      id: "1",
      nik: "3201010101010001",
      nama: "Budi Santoso",
      alamat: "Jl. Merdeka No. 1",
      noHp: "081234567891",
      status: "Aktif",
      kk: "3201010101010000",
    },
    {
      id: "2",
      nik: "3201010101010002",
      nama: "Siti Aminah",
      alamat: "Jl. Merdeka No. 2",
      noHp: "081234567892",
      status: "Aktif",
      kk: "3201010101010002",
    },
    {
      id: "3",
      nik: "3201010101010003",
      nama: "Ahmad Dahlan",
      alamat: "Jl. Merdeka No. 3",
      noHp: "081234567893",
      status: "Pindah",
      kk: "3201010101010003",
    },
    {
      id: "4",
      nik: "3201010101010004",
      nama: "Joko Widodo",
      alamat: "Jl. Merdeka No. 4",
      noHp: "081234567894",
      status: "Aktif",
      kk: "3201010101010004",
    }
  ],
  surat: [
    {
      id: "1",
      nama: "Budi Santoso",
      nik: "3201010101010001",
      jenis: "Surat Pengantar RT",
      keterangan: "Untuk keperluan pembuatan KTP baru",
      status: "Pending",
      tanggal: new Date(Date.now() - 86400000).toISOString(),
    },
    {
      id: "2",
      nama: "Siti Aminah",
      nik: "3201010101010002",
      jenis: "Surat Keterangan Domisili",
      keterangan: "Pendaftaran sekolah anak",
      status: "Disetujui",
      tanggal: new Date(Date.now() - 172800000).toISOString(),
    },
    {
      id: "3",
      nama: "Ahmad Dahlan",
      nik: "3201010101010003",
      jenis: "Surat Keterangan Usaha",
      keterangan: "Pengajuan pinjaman bank",
      status: "Ditolak",
      tanggal: new Date(Date.now() - 259200000).toISOString(),
    }
  ],
  pengumuman: [
    {
      id: "1",
      judul: "Kerja Bakti Rutin",
      isi: "Diberitahukan kepada seluruh warga RT 01 untuk mengikuti kerja bakti pada hari Minggu, 20 Maret 2026.",
      tanggal: new Date(Date.now() - 86400000).toISOString(),
    },
    {
      id: "2",
      judul: "Iuran Bulanan",
      isi: "Mohon kepada seluruh warga untuk segera melunasi iuran bulanan paling lambat tanggal 10 setiap bulannya.",
      tanggal: new Date(Date.now() - 432000000).toISOString(),
    },
    {
      id: "3",
      judul: "Posyandu Balita",
      isi: "Kegiatan Posyandu balita akan dilaksanakan di Balai Warga pada hari Sabtu pagi jam 08.00 WIB.",
      tanggal: new Date(Date.now() - 604800000).toISOString(),
    }
  ],
  keuangan: [
    {
      id: "1",
      tanggal: new Date(Date.now() - 86400000).toISOString(),
      jenis: "Pemasukan",
      jumlah: 500000,
      keterangan: "Iuran Kas RT Bulan Maret",
    },
    {
      id: "2",
      tanggal: new Date(Date.now() - 172800000).toISOString(),
      jenis: "Pengeluaran",
      jumlah: 150000,
      keterangan: "Perbaikan Lampu Jalan Blok A",
    },
    {
      id: "3",
      tanggal: new Date(Date.now() - 259200000).toISOString(),
      jenis: "Pemasukan",
      jumlah: 300000,
      keterangan: "Sumbangan Donatur",
    },
    {
      id: "4",
      tanggal: new Date(Date.now() - 345600000).toISOString(),
      jenis: "Pengeluaran",
      jumlah: 50000,
      keterangan: "Konsumsi Rapat Pengurus",
    }
  ],
  pengaduan: [
    {
      id: "1",
      nama: "Budi Santoso",
      judul: "Lampu Jalan Mati",
      deskripsi: "Lampu jalan di depan rumah Blok A1 No. 1 mati sejak 3 hari yang lalu, mohon segera diperbaiki.",
      status: "Pending",
      tanggal: new Date(Date.now() - 86400000).toISOString(),
    },
    {
      id: "2",
      nama: "Siti Aminah",
      judul: "Selokan Mampet",
      deskripsi: "Selokan di pertigaan Blok B mampet dan airnya meluap ke jalan saat hujan.",
      status: "Diproses",
      tanggal: new Date(Date.now() - 172800000).toISOString(),
    },
    {
      id: "3",
      nama: "Joko Widodo",
      judul: "Suara Bising Malam Hari",
      deskripsi: "Ada warga di Blok C yang sering menyalakan musik keras-keras di atas jam 11 malam.",
      status: "Selesai",
      tanggal: new Date(Date.now() - 432000000).toISOString(),
    }
  ],
  notifikasi: [
    {
      id: "1",
      judul: "Pengajuan Surat Baru",
      pesan: "Budi Santoso mengajukan Surat Pengantar RT.",
      tipe: "surat",
      tanggal: new Date(Date.now() - 3600000).toISOString(),
      isRead: false,
    },
    {
      id: "2",
      judul: "Pengaduan Warga",
      pesan: "Siti Aminah melaporkan Selokan Mampet.",
      tipe: "pengaduan",
      tanggal: new Date(Date.now() - 7200000).toISOString(),
      isRead: false,
    },
    {
      id: "3",
      judul: "Pembayaran Iuran",
      pesan: "Joko Widodo telah membayar iuran bulan ini.",
      tipe: "keuangan",
      tanggal: new Date(Date.now() - 86400000).toISOString(),
      isRead: true,
    }
  ],
};
