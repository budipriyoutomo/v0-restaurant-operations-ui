# Pola: Dialog dengan Smart-Default Toggle

Referensi lengkap untuk pola yang dipakai di `components/dialogs/create-issue-dialog.tsx`. Pakai pola ini setiap kali membuat form create/edit yang punya **pilihan otomatis berdasarkan field lain**, tapi tetap harus bisa di-override user.

## Kapan pakai pola ini

Pola ini cocok ketika:
- Form punya satu field "kategori/tipe" yang menentukan default untuk field/toggle lain.
- User tidak boleh dipaksa mengisi semua hal manual (UX buruk), tapi juga tidak boleh sistem terlalu kaku/otomatis penuh (user kehilangan kontrol).
- Contoh nyata: kategori Issue menentukan default toggle "Create Task" dan "Send to Approval".

## Struktur

### 1. Definisikan default rules sebagai data, bukan logic tersebar

```ts
// lib/types.ts
export const CATEGORY_DEFAULTS: Record<IssueCategory, { task: boolean; approval: boolean }> = {
  Maintenance: { task: true, approval: false },
  Procurement: { task: true, approval: true },
  // ...
}
```

Kenapa sebagai object map, bukan `if/else` di komponen: supaya satu sumber kebenaran, mudah di-test, dan mudah ditambah kategori baru tanpa menyentuh logic komponen.

### 2. State `touchedToggles` untuk membedakan "default" vs "user override"

```tsx
const [generateTask, setGenerateTask] = useState(true)
const [generateApproval, setGenerateApproval] = useState(false)
const [touchedToggles, setTouchedToggles] = useState(false)

useEffect(() => {
  if (!touchedToggles) {
    const defaults = CATEGORY_DEFAULTS[form.category]
    setGenerateTask(defaults.task)
    setGenerateApproval(defaults.approval)
  }
}, [form.category, touchedToggles])
```

Tanpa flag `touchedToggles`, setiap kali user ganti kategori, toggle yang sudah dia ubah manual akan ke-reset paksa ke default — ini bug UX yang sering tidak ketahuan sampai user testing.

### 3. Checkbox yang men-set `touchedToggles = true` saat disentuh

```tsx
<input
  type="checkbox"
  checked={generateTask}
  onChange={(e) => { setTouchedToggles(true); setGenerateTask(e.target.checked) }}
/>
```

Begitu user sentuh salah satu toggle, `useEffect` di atas berhenti meng-override pilihan user untuk sisa sesi form ini (sampai dialog ditutup/reset).

### 4. Conditional field berdasarkan toggle

```tsx
{generateApproval && (
  <input name="approvalAmount" placeholder="e.g. RM 12,000" ... />
)}
```

Field tambahan (misal amount) hanya muncul kalau relevan — mengurangi noise form untuk kasus yang tidak butuh field tersebut.

## Anti-pattern yang harus dihindari

- ❌ Hardcode `if (category === 'Procurement') setApproval(true)` langsung di `onChange` handler kategori — sulit di-maintain begitu kategori bertambah.
- ❌ Toggle otomatis tanpa cara override — user merasa sistem "memaksa".
- ❌ Reset toggle setiap render tanpa cek `touchedToggles` — user override hilang begitu field lain berubah.
- ❌ Validasi field conditional (`approvalAmount`) dilakukan di level submit saja tanpa disable/hide dari UI — bikin user bingung kenapa ada field yang "wajib" tapi tidak relevan.
