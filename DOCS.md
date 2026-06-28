# DOCS — Issue Core Technical Documentation

Dokumentasi ini untuk developer yang membuka project ini di **Visual Studio Code** dan ingin memahami struktur, menjalankan, atau mengembangkan lebih jauh module Issue Core.

---

## 1. Stack

| Layer | Teknologi |
|---|---|
| Framework | Next.js 16 (App Router, `'use client'` components) |
| Bahasa | TypeScript (strict mode) |
| State management | Zustand |
| Styling | Tailwind CSS v4 (CSS variables, no `tailwind.config` — config inline di `globals.css`) |
| UI primitives | shadcn/ui (`new-york` style) di atas Radix UI |
| Icons | lucide-react |
| Forms | react-hook-form + zod (dipakai di sebagian dialog, Issue Core saat ini pakai local `useState` form sederhana) |
| Charts | Recharts (dipakai di Analytics/Dashboard, tidak dipakai Issue Core) |

Package manager: project pakai `pnpm-lock.yaml` (lockfile asli), tapi juga bisa pakai `npm`/`yarn` — sesuaikan dengan tooling tim.

## 2. Setup di VS Code

```bash
git clone https://github.com/budipriyoutomo/v0-restaurant-operations-ui.git
cd v0-restaurant-operations-ui
npm install        # atau: pnpm install
npm run dev        # buka http://localhost:3000
```

### Extension VS Code yang disarankan
- **ESLint** (`dbaeumer.vscode-eslint`)
- **Tailwind CSS IntelliSense** (`bradlc.vscode-tailwindcss`) — penting karena project pakai banyak utility class
- **TypeScript and JavaScript Language Features** (built-in, pastikan versi workspace TS dipakai, bukan versi global)

### `.vscode/settings.json` yang direkomendasikan
```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "typescript.tsdk": "node_modules/typescript/lib",
  "tailwindCSS.experimental.classRegex": [
    ["cn\\(([^)]*)\\)", "[\"'`]([^\"'`]*)[\"'`]"]
  ]
}
```

## 3. Struktur Folder (relevan untuk Issue Core)

```
app/
  page.tsx                       # Router sederhana berbasis useState (currentPage), bukan file-based routing
  layout.tsx

components/
  pages/
    issues-list-page.tsx         # Module utama — tempat user create & lihat semua Issue
    task-center-page.tsx         # Kanban board, konsumen Issue Core (read + update status)
    approval-center-page.tsx     # Inbox approval, konsumen Issue Core (read + approve/reject)
  dialogs/
    create-issue-dialog.tsx      # Form Create Issue dengan smart-default toggle Task/Approval
  layout/
    app-shell.tsx, sidebar.tsx, top-nav.tsx   # Shell aplikasi & navigasi

lib/
  types.ts                       # Shared domain types: Issue, Task, ApprovalRequest, CreateIssueInput
  store.ts                       # Zustand store — single source of truth + auto-generation logic
  utils.ts                       # cn() helper (clsx + tailwind-merge), dari shadcn

PRD.md                           # Product Requirements Document
DOCS.md                          # File ini
```

## 4. Arsitektur Data — Issue Core

### 4.1 Konsep inti

Issue Core berpusat di **satu Zustand store** (`lib/store.ts`). Tidak ada lagi mock array lokal di tiap halaman seperti versi sebelumnya — semua page membaca dan menulis lewat hook `useIssueStore()`.

```
┌─────────────────┐
│  Issues Page     │── createIssue() ──┐
└─────────────────┘                    │
                                        ▼
                              ┌──────────────────┐
                              │  useIssueStore    │  (Zustand)
                              │  - issues[]        │
                              │  - tasks[]          │
                              │  - approvals[]       │
                              └──────────────────┘
                                  │            │
                    ┌─────────────┘            └─────────────┐
                    ▼                                          ▼
        ┌──────────────────────┐                   ┌─────────────────────────┐
        │  Task Center Page     │                   │  Approval Center Page    │
        │  (read tasks,          │                   │  (read approvals,         │
        │   updateTaskStatus)    │                   │   decideApproval)         │
        └──────────────────────┘                   └─────────────────────────┘
```

### 4.2 Relasi

```ts
Issue {
  id, number
  taskIds: string[]      // 0..N — relasi ke Task
  approvalId?: string    // 0..1 — relasi ke Approval (MVP: maksimal satu)
}

Task {
  id, number
  issueId: string        // wajib — Task tidak boleh berdiri sendiri
  issueNumber: string
}

ApprovalRequest {
  id, number
  issueId: string        // wajib
  issueNumber: string
}
```

### 4.3 Alur `createIssue()`

File: `lib/store.ts`

1. Generate `issueId` dan `issueNumber` (format `ISS-{tahun}-{sequence}`, sequence dihitung dari angka terbesar yang sudah ada).
2. Buat object `Issue` baru.
3. **Jika** `input.generateTask === true` → generate satu `Task` baru, push id-nya ke `Issue.taskIds`.
4. **Jika** `input.generateApproval === true` → generate satu `ApprovalRequest` baru (tipe diambil dari `CATEGORY_TO_APPROVAL_TYPE[category]`), set `Issue.approvalId`.
5. Semua state baru di-`set()` sekaligus (issues, tasks, approvals).

### 4.4 Smart-default rules

File: `lib/types.ts` → konstanta `CATEGORY_DEFAULTS`.

```ts
export const CATEGORY_DEFAULTS: Record<IssueCategory, { task: boolean; approval: boolean }> = {
  Maintenance: { task: true, approval: false },
  Procurement: { task: true, approval: true },
  // ...
}
```

Dipakai di `create-issue-dialog.tsx` lewat `useEffect` yang memantau perubahan `category`, dan hanya berlaku selama user belum menyentuh toggle secara manual (`touchedToggles` flag).

## 5. Cara Extend

### 5.1 Menambah kategori Issue baru
1. Tambahkan ke union type `IssueCategory` di `lib/types.ts`.
2. Tambahkan entry default di `CATEGORY_DEFAULTS`.
3. Jika kategori ini perlu jenis Approval baru, tambahkan ke `ApprovalType` dan `CATEGORY_TO_APPROVAL_TYPE`.
4. Tambahkan ke array `CATEGORIES` di `create-issue-dialog.tsx`.

### 5.2 Menghubungkan module baru (misal Maintenance penuh, Procurement penuh)
Pola yang sama bisa di-replicate:
1. Tambahkan field relasi baru di `Issue` (misal `workOrderId?: string`).
2. Tambahkan toggle baru di `CreateIssueDialog` + logic generate di `createIssue()`.
3. Module baru tinggal `useIssueStore()` dan filter berdasarkan field relasinya.

### 5.3 Mengubah Task/Approval agar bisa banyak per Issue
Saat ini `approvalId` adalah single string. Untuk multi-approval per Issue:
```ts
// lib/types.ts
approvalIds: string[]   // ganti dari approvalId?: string
```
Lalu update semua referensi di `store.ts` dan halaman yang membaca `selectedIssue.approvalId`.

### 5.4 Migrasi ke backend sungguhan
Saat ini `lib/store.ts` murni in-memory (hilang saat refresh). Untuk migrasi:
1. Ganti isi action (`createIssue`, `updateTaskStatus`, `decideApproval`) agar memanggil API route (`/api/issues`, dst.) alih-alih langsung `set()`.
2. Pertimbangkan pakai `zustand` middleware seperti `persist` (localStorage, untuk tahap antara) atau full migrasi ke server state library (TanStack Query) di atas API nyata.
3. Skema tabel SQL bisa langsung mengikuti `lib/types.ts` — `Issue`, `Task`, `ApprovalRequest` sudah merepresentasikan bentuk tabel relasionalnya.

## 6. Known Limitations (MVP ini)

- Data hilang saat refresh browser (in-memory Zustand, tidak ada persist middleware).
- Satu Issue maksimal satu Approval (lihat §5.3 cara generalize).
- Update status Task tidak otomatis mempengaruhi status Issue induk (lihat PRD §8 Open Questions).
- Tidak ada validasi server-side (semua validasi di client saja, form-level).
- Tidak ada auth/role check — semua user dianggap punya akses penuh ke semua action.

## 7. Testing (belum ada — rekomendasi setup)

Belum ada testing framework di project ini. Rekomendasi untuk iterasi berikutnya:
- **Vitest** + **React Testing Library** untuk unit test `lib/store.ts` (terutama logic `createIssue` — pastikan relasi `taskIds`/`approvalId` selalu konsisten).
- Contoh test case yang penting untuk Issue Core:
  - `createIssue` dengan `generateTask: true, generateApproval: false` → pastikan `taskIds.length === 1`, `approvalId === undefined`.
  - `decideApproval('rejected')` → pastikan `Issue.status` berubah jadi `'waiting'`.
  - `nextNumber()` → pastikan sequence number selalu increment dengan benar walau ada gap di data seed.
