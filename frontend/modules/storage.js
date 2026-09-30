export async function saveRecord(kind, payload) {
  try { const r = await fetch('/api/records', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind, payload }), signal: AbortSignal.timeout(5000) }); if (!r.ok) return { saved: false, reason: r.status === 503 ? 'Storage is not configured.' : 'The record could not be saved.' }; const data = await r.json(); return { saved: Boolean(data.saved), reason: data.message || '' }; }
  catch (_) { return { saved: false, reason: 'Optional record storage is unavailable.' }; }
}
