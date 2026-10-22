# Data Akademik — tempat menyiapkan data impor

Folder ini untuk menaruh daftar resmi **mahasiswa** dan **dosen** prodi.
File `*.txt` di sini **diabaikan git** (berisi NIM/NIDN asli).

## File yang dibaca

| File | Isi | Format |
| --- | --- | --- |
| `data/mahasiswa.txt` | Daftar mahasiswa | `NAMA;NIM` |
| `data/dosen.txt` | Daftar dosen (termasuk Kaprodi) | `NAMA;NIDN` |

Satu baris = satu orang. Pemisah boleh `;`, `|`, atau **tab** (salin langsung
dari Excel/Google Sheets). Baris diawali `#` dianggap komentar.

Boleh juga memakai **hasil export Excel/CSV** (`.csv`/`.tsv`): kolom terakhir
dibaca sebagai NIM/NIDN, kolom nomor urut (`NO`) dan baris judul dibuang
otomatis, dan nama bergelar yang dikutip (`"Dr. Andi, M.Kom."`) aman.

```csv
NO,NAMA,NIM
1,"Ahmad Fadil",2201010001
2,"Sitti Aminah",2201010002
```

```
# NAMA;NIM
Ahmad Fadil;2201010001
Sitti Aminah;2201010002
```

```
# NAMA;NIDN
Dr. Andi, M.Kom.;0912123401
Budi, M.Kom.;0912123402
```

> Koma **aman** dipakai di dalam gelar karena pemisahnya `;`, `|`, atau tab.

## Menjalankan

```bash
npm run db:import:dry   # cek dulu: berapa baris valid & baris bermasalah
npm run db:import       # tulis ke database
```

Aman dijalankan berulang: NIM/NIDN yang sama hanya memperbarui namanya, dan
data yang sudah dipakai membuat akun otomatis ditandai terpakai.

Setelah impor, data bisa dilihat/dirapikan di menu **Admin → Data Akademik**
(`/admin/data-akademik`).
