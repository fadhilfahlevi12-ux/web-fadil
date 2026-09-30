import {
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core'

export const userRoleEnum = pgEnum('user_role', [
  'mahasiswa',
  'admin',
  'kaprodi',
  'dosen',
])

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  role: userRoleEnum('role').notNull().default('mahasiswa'),
  // Khusus mahasiswa
  nim: varchar('nim', { length: 30 }),
  // Khusus dosen/kaprodi
  nidn: varchar('nidn', { length: 30 }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
})

// ---------- Modul Layanan Surat Mahasiswa (E-Service) ----------

export const letterTypeEnum = pgEnum('letter_type', [
  'active_student',
  'research_introduction',
  'internship_introduction',
])

export const letterStatusEnum = pgEnum('letter_status', [
  'pending_staff',
  'pending_kaprodi',
  'approved',
  'rejected',
])

export const letterRequests = pgTable(
  'letter_requests',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    letterType: letterTypeEnum('letter_type').notNull(),
    purpose: text('purpose').notNull(),
    destination: text('destination'),
    notes: text('notes'),
    status: letterStatusEnum('status').notNull().default('pending_staff'),
    // Keputusan staf: verifikasi berkas
    staffVerifiedById: uuid('staff_verified_by_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    verifiedAt: timestamp('verified_at', { withTimezone: true }),
    // Keputusan kaprodi: persetujuan & tanda tangan digital
    kaprodiApprovedById: uuid('kaprodi_approved_by_id').references(
      () => users.id,
      { onDelete: 'set null' }
    ),
    approvedAt: timestamp('approved_at', { withTimezone: true }),
    documentNumber: varchar('document_number', { length: 60 }),
    documentUrl: text('document_url'),
    qrToken: varchar('qr_token', { length: 64 }).unique(),
    rejectionReason: text('rejection_reason'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index('letter_requests_user_idx').on(table.userId),
    index('letter_requests_status_idx').on(table.status),
  ]
)

// ---------- Modul Administrasi Tugas Akhir / Skripsi ----------

export const thesisStatusEnum = pgEnum('thesis_status', [
  'pending',
  'approved',
  'rejected',
])

export const thesisSubmissions = pgTable(
  'thesis_submissions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    summary: text('summary').notNull(),
    status: thesisStatusEnum('status').notNull().default('pending'),
    // Keputusan kaprodi atas usulan judul
    decidedById: uuid('decided_by_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    decidedAt: timestamp('decided_at', { withTimezone: true }),
    rejectionReason: text('rejection_reason'),
    // Penetapan dosen pembimbing 1 & 2
    pembimbing1Id: uuid('pembimbing1_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    pembimbing2Id: uuid('pembimbing2_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    pembimbingAssignedAt: timestamp('pembimbing_assigned_at', {
      withTimezone: true,
    }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index('thesis_submissions_user_idx').on(table.userId),
    index('thesis_submissions_status_idx').on(table.status),
  ]
)

export const seminarTypeEnum = pgEnum('seminar_type', [
  'proposal',
  'result',
  'final',
])

export const seminarSchedules = pgTable(
  'seminar_schedules',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    thesisSubmissionId: uuid('thesis_submission_id').references(
      () => thesisSubmissions.id,
      { onDelete: 'set null' }
    ),
    seminarType: seminarTypeEnum('seminar_type').notNull(),
    heldAt: timestamp('held_at', { withTimezone: true }).notNull(),
    location: text('location'),
    notes: text('notes'),
    publishedById: uuid('published_by_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index('seminar_schedules_type_idx').on(table.seminarType),
    index('seminar_schedules_held_at_idx').on(table.heldAt),
  ]
)

// ---------- Modul Arsip Digital Prodi (E-Archive) ----------

export const archiveCategoryEnum = pgEnum('archive_category', [
  'sk_rektor',
  'sk_mengajar',
  'akreditasi',
  'mou',
])

export const archiveDocuments = pgTable(
  'archive_documents',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    category: archiveCategoryEnum('category').notNull(),
    title: varchar('title', { length: 255 }).notNull(),
    description: text('description'),
    fileUrl: text('file_url').notNull(),
    academicYear: varchar('academic_year', { length: 9 }),
    uploadedById: uuid('uploaded_by_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index('archive_documents_category_idx').on(table.category),
    index('archive_documents_year_idx').on(table.academicYear),
  ]
)

export type Role = (typeof userRoleEnum.enumValues)[number]

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert

export type LetterType = (typeof letterTypeEnum.enumValues)[number]
export type LetterStatus = (typeof letterStatusEnum.enumValues)[number]
export type LetterRequest = typeof letterRequests.$inferSelect
export type NewLetterRequest = typeof letterRequests.$inferInsert

export type ThesisStatus = (typeof thesisStatusEnum.enumValues)[number]
export type ThesisSubmission = typeof thesisSubmissions.$inferSelect
export type NewThesisSubmission = typeof thesisSubmissions.$inferInsert

export type SeminarType = (typeof seminarTypeEnum.enumValues)[number]
export type SeminarSchedule = typeof seminarSchedules.$inferSelect
export type NewSeminarSchedule = typeof seminarSchedules.$inferInsert

export type ArchiveCategory = (typeof archiveCategoryEnum.enumValues)[number]
export type ArchiveDocument = typeof archiveDocuments.$inferSelect
export type NewArchiveDocument = typeof archiveDocuments.$inferInsert

// ---------- Label untuk tampilan UI ----------

export const LETTER_TYPE_LABELS: Record<LetterType, string> = {
  active_student: 'Surat Keterangan Aktif Kuliah',
  research_introduction: 'Surat Pengantar Penelitian',
  internship_introduction: 'Surat Pengantar Magang / KP',
}

export const LETTER_STATUS_LABELS: Record<LetterStatus, string> = {
  pending_staff: 'Menunggu Verifikasi Staf',
  pending_kaprodi: 'Menunggu TTD Kaprodi',
  approved: 'Selesai',
  rejected: 'Ditolak',
}

export const THESIS_STATUS_LABELS: Record<ThesisStatus, string> = {
  pending: 'Menunggu Persetujuan Kaprodi',
  approved: 'Disetujui',
  rejected: 'Ditolak',
}

export const SEMINAR_TYPE_LABELS: Record<SeminarType, string> = {
  proposal: 'Seminar Proposal',
  result: 'Seminar Hasil',
  final: 'Seminar Tutup / Ujian',
}

export const ARCHIVE_CATEGORY_LABELS: Record<ArchiveCategory, string> = {
  sk_rektor: 'SK Rektor',
  sk_mengajar: 'SK Mengajar Dosen',
  akreditasi: 'Sertifikat Akreditasi',
  mou: 'MoU / Kerja Sama',
}
