import { useEffect, useState } from "react";
import {
  fetchPatientDocument,
  getPatientDocuments,
  uploadPatientDocument,
} from "../../services/patients.service";
import Modal from '../ui/Modal'
const categories = [
  "consent",
  "referral",
  "radiograph",
  "lab_report",
  "identification",
  "orthodontic",
  "clinical",
  "photograph",
  "general",
  "other",
];
export default function DocumentsPanel({ patient }) {
  const [docs, setDocs] = useState([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [open, setOpen] = useState(false),
    [uploading, setUploading] = useState(false),
    [form, setForm] = useState({
      document_type: "general",
      title: "",
      description: "",
      file: null,
    });
  async function load() {
    setLoading(true);
    try {
      const d = await getPatientDocuments({
        patient: patient.id,
        is_archived: false,
      });
      setDocs(d.results || d || []);
    } catch {
      setError("Documents unavailable.");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, [patient.id]);
  async function submit(e) {
    e.preventDefault();
    if (!form.file || !form.title) return;
    setUploading(true);
    try {
      await uploadPatientDocument({ ...form, patient: patient.id });
      setOpen(false);
      setForm({
        document_type: "general",
        title: "",
        description: "",
        file: null,
      });
      await load();
    } catch (e) {
      setError(e.response?.data?.file?.[0] || "Upload failed.");
    } finally {
      setUploading(false);
    }
  }
  async function openFile(id, mode) {
    const r = await fetchPatientDocument(id, mode);
    const url = URL.createObjectURL(r.data);
    if (mode === "preview") window.open(url, "_blank", "noopener");
    else {
      const a = document.createElement("a");
      a.href = url;
      a.download = "patient-document";
      a.click();
    }
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  }
  return (
    <section className="rounded-xl bg-white p-4 shadow-sm">
      <div className="flex justify-between">
        <h2 className="font-bold">Documents</h2>
        <button
          onClick={() => setOpen(true)}
          className="rounded bg-blue-600 px-3 py-2 text-sm font-semibold text-white"
        >
          Upload document
        </button>
      </div>
      {error && (
        <p role="alert" className="mt-3 text-red-700">
          {error}
        </p>
      )}
      <Modal isOpen={open} onClose={()=>!uploading&&setOpen(false)} title="Upload patient document" size="compact">
        <form
          onSubmit={submit}
          className="grid gap-4"
        >
          <input
            aria-label="Document title"
            placeholder="Title"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="rounded border p-2"
          />
          <select
            aria-label="Document category"
            value={form.document_type}
            onChange={(e) =>
              setForm({ ...form, document_type: e.target.value })
            }
            className="rounded border p-2"
          >
            {categories.map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
          <input
            aria-label="Document file"
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
            onChange={(e) => setForm({ ...form, file: e.target.files?.[0] })}
          />
          <textarea aria-label="Document description" placeholder="Description" value={form.description} onChange={e=>setForm({...form,description:e.target.value})} className="rounded border p-2"/>
          <button
            disabled={uploading || !form.file || !form.title}
            className="rounded bg-slate-900 p-2 text-white"
          >
            {uploading ? "Uploading…" : "Upload"}
          </button>
        </form>
      </Modal>
      {loading ? (
        <p className="py-8 text-slate-500">Loading documents…</p>
      ) : docs.length ? (
        <ul className="mt-3 divide-y">
          {docs.map((d) => (
            <li
              key={d.id}
              className="flex flex-wrap items-center justify-between gap-2 py-3"
            >
              <div>
                <b>{d.title}</b>
                <p className="text-xs text-slate-500">
                  {d.document_type} · {d.file_size || 0} bytes · v{d.version}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => openFile(d.id, "preview")}
                  className="text-sm text-blue-700"
                >
                  Preview
                </button>
                <button
                  onClick={() => openFile(d.id, "download")}
                  className="text-sm text-blue-700"
                >
                  Download
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="py-8 text-slate-500">No documents found.</p>
      )}
    </section>
  );
}
