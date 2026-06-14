import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import type { Package } from '../types';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl p-5" style={{ background: '#12121a', border: '1px solid rgba(255,255,255,0.08)' }}>
      <h2 className="font-bold uppercase tracking-widest mb-4" style={{ color: 'rgba(255,255,255,0.4)', fontFamily: 'Orbitron, sans-serif', fontSize: '10px' }}>
        {title}
      </h2>
      {children}
    </div>
  );
}

export default function PackageAdmin() {
  const navigate = useNavigate();
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | 'new' | null>(null);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [error, setError] = useState('');

  // Edit form state
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [duration, setDuration] = useState('');
  const [tagline, setTagline] = useState('');
  const [popular, setPopular] = useState(false);
  const [inclusionsText, setInclusionsText] = useState('');
  const [sortOrder, setSortOrder] = useState('');

  useEffect(() => { loadPackages(); }, []);

  async function loadPackages() {
    setLoading(true);
    const { data } = await supabase.from('packages').select('*').order('sort_order');
    setPackages((data as Package[]) ?? []);
    setLoading(false);
  }

  function startEdit(pkg: Package) {
    setEditingId(pkg.id);
    setName(pkg.name);
    setPrice(String(pkg.price / 100));
    setDuration(pkg.duration);
    setTagline(pkg.tagline);
    setPopular(pkg.popular);
    setInclusionsText(pkg.inclusions.join('\n'));
    setSortOrder(String(pkg.sort_order));
    setError('');
  }

  function startNew() {
    setEditingId('new');
    setName('');
    setPrice('');
    setDuration('');
    setTagline('');
    setPopular(false);
    setInclusionsText('');
    setSortOrder(String((packages[packages.length - 1]?.sort_order ?? 0) + 1));
    setError('');
  }

  function cancelEdit() {
    setEditingId(null);
    setError('');
  }

  async function handleSave() {
    if (!name.trim() || !price || !duration.trim()) {
      setError('Name, price, and duration are required.');
      return;
    }
    setSaving(true);
    setError('');

    const payload = {
      name: name.trim(),
      price: Math.round(parseFloat(price) * 100),
      duration: duration.trim(),
      tagline: tagline.trim(),
      popular,
      inclusions: inclusionsText.split('\n').map((l) => l.trim()).filter(Boolean),
      sort_order: sortOrder ? parseInt(sortOrder) : 99,
    };

    if (editingId === 'new') {
      const { error: err } = await supabase.from('packages').insert(payload);
      if (err) { setError(err.message); setSaving(false); return; }
    } else {
      const { error: err } = await supabase.from('packages').update(payload).eq('id', editingId!);
      if (err) { setError(err.message); setSaving(false); return; }
    }

    setSuccessMsg('Package saved!');
    setTimeout(() => setSuccessMsg(''), 3000);
    setEditingId(null);
    loadPackages();
    setSaving(false);
  }

  async function handleDelete(pkg: Package) {
    if (!confirm(`Delete "${pkg.name}"? This cannot be undone.`)) return;
    setSaving(true);
    await supabase.from('packages').delete().eq('id', pkg.id);
    loadPackages();
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0a0a0f' }}>
        <div className="w-8 h-8 rounded-full border-2 animate-spin" style={{ borderColor: 'rgba(255,255,255,0.1)', borderTopColor: '#3b82f6' }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: '#0a0a0f', fontFamily: 'Rajdhani, sans-serif' }}>
      <div className="max-w-2xl mx-auto px-4 pb-10">

        {/* Header */}
        <div className="flex items-center gap-3 py-5">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 text-sm font-semibold rounded-xl px-3 py-2"
            style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.6)' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Dashboard
          </button>
          <h1 className="flex-1 font-bold text-lg" style={{ fontFamily: 'Orbitron, sans-serif', color: '#fff' }}>
            Packages
          </h1>
          <button
            onClick={startNew}
            className="px-3 py-2 rounded-xl text-sm font-bold"
            style={{ background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', color: '#fff' }}
          >
            + New
          </button>
        </div>

        {/* Messages */}
        {successMsg && (
          <div className="mb-4 rounded-xl p-3 text-sm font-semibold" style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.3)', color: '#818cf8' }}>
            {successMsg}
          </div>
        )}
        {error && (
          <div className="mb-4 rounded-xl p-3 text-sm font-semibold" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444' }}>
            {error}
          </div>
        )}

        <div className="flex flex-col gap-4">

          {/* New package form */}
          {editingId === 'new' && (
            <Section title="New Package">
              <PackageForm
                name={name} setName={setName}
                price={price} setPrice={setPrice}
                duration={duration} setDuration={setDuration}
                tagline={tagline} setTagline={setTagline}
                popular={popular} setPopular={setPopular}
                inclusionsText={inclusionsText} setInclusionsText={setInclusionsText}
                sortOrder={sortOrder} setSortOrder={setSortOrder}
                onSave={handleSave}
                onCancel={cancelEdit}
                saving={saving}
                isNew
              />
            </Section>
          )}

          {/* Existing packages */}
          {packages.map((pkg) => (
            <Section key={pkg.id} title={`Package — Order ${pkg.sort_order}`}>
              {editingId === pkg.id ? (
                <PackageForm
                  name={name} setName={setName}
                  price={price} setPrice={setPrice}
                  duration={duration} setDuration={setDuration}
                  tagline={tagline} setTagline={setTagline}
                  popular={popular} setPopular={setPopular}
                  inclusionsText={inclusionsText} setInclusionsText={setInclusionsText}
                  sortOrder={sortOrder} setSortOrder={setSortOrder}
                  onSave={handleSave}
                  onCancel={cancelEdit}
                  saving={saving}
                />
              ) : (
                <div>
                  {/* Preview */}
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-lg" style={{ color: '#fff', fontFamily: 'Orbitron, sans-serif', fontSize: '1rem' }}>{pkg.name}</span>
                        {pkg.popular && (
                          <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: 'linear-gradient(135deg,#3b82f6,#8b5cf6)', color: '#fff' }}>
                            Popular
                          </span>
                        )}
                      </div>
                      <div className="text-xl font-bold" style={{ color: '#818cf8', fontFamily: 'Orbitron, sans-serif' }}>
                        ${(pkg.price / 100).toFixed(0)}
                        <span className="text-sm font-normal ml-2" style={{ color: 'rgba(255,255,255,0.5)' }}>{pkg.duration}</span>
                      </div>
                      <p className="text-sm mt-0.5" style={{ color: 'rgba(255,255,255,0.45)' }}>{pkg.tagline}</p>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <button
                        onClick={() => startEdit(pkg)}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                        style={{ background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.3)', color: '#60a5fa' }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(pkg)}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                        style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#f87171' }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  {pkg.inclusions.length > 0 && (
                    <ul className="flex flex-col gap-1 mt-2">
                      {pkg.inclusions.map((item, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>
                          <span style={{ color: '#818cf8', flexShrink: 0 }}>✓</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </Section>
          ))}

          {packages.length === 0 && editingId !== 'new' && (
            <div className="text-center py-12" style={{ color: 'rgba(255,255,255,0.3)' }}>
              No packages yet. Click "+ New" to add one.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PackageForm({
  name, setName, price, setPrice, duration, setDuration,
  tagline, setTagline, popular, setPopular,
  inclusionsText, setInclusionsText, sortOrder, setSortOrder,
  onSave, onCancel, saving, isNew,
}: {
  name: string; setName: (v: string) => void;
  price: string; setPrice: (v: string) => void;
  duration: string; setDuration: (v: string) => void;
  tagline: string; setTagline: (v: string) => void;
  popular: boolean; setPopular: (v: boolean) => void;
  inclusionsText: string; setInclusionsText: (v: string) => void;
  sortOrder: string; setSortOrder: (v: string) => void;
  onSave: () => void; onCancel: () => void;
  saving: boolean; isNew?: boolean;
}) {
  const inputLabel = (label: string) => (
    <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
      {label}
    </label>
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          {inputLabel('Package Name')}
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. The Vibe" />
        </div>
        <div>
          {inputLabel('Price ($)')}
          <input type="number" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="e.g. 275" />
        </div>
        <div>
          {inputLabel('Duration')}
          <input type="text" value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="e.g. 3 hours" />
        </div>
        <div className="col-span-2">
          {inputLabel('Tagline')}
          <input type="text" value={tagline} onChange={(e) => setTagline(e.target.value)} placeholder="e.g. Great for parties" />
        </div>
        <div>
          {inputLabel('Display Order')}
          <input type="number" min="1" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} placeholder="1" />
        </div>
        <div className="flex items-center gap-3 pt-5">
          <button
            type="button"
            onClick={() => setPopular(!popular)}
            className="flex items-center gap-2 text-sm font-semibold"
            style={{ color: popular ? '#818cf8' : 'rgba(255,255,255,0.4)' }}
          >
            <div
              className="w-9 h-5 rounded-full transition-colors relative"
              style={{ background: popular ? '#818cf8' : 'rgba(255,255,255,0.12)' }}
            >
              <div
                className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform"
                style={{ transform: popular ? 'translateX(18px)' : 'translateX(2px)' }}
              />
            </div>
            Most Popular
          </button>
        </div>
      </div>

      <div>
        {inputLabel('Inclusions (one per line)')}
        <textarea
          value={inclusionsText}
          onChange={(e) => setInclusionsText(e.target.value)}
          rows={6}
          placeholder={'2 hours of live DJ performance\nProfessional speakers & subwoofer\nSetup & teardown included'}
          style={{ resize: 'vertical', fontFamily: 'monospace', fontSize: '13px' }}
        />
        <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.3)' }}>Each line becomes one bullet point on the landing page.</p>
      </div>

      <div className="flex gap-2">
        <button
          onClick={onSave}
          disabled={saving}
          className="flex-1 py-2.5 rounded-xl font-bold text-sm"
          style={{ background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', color: '#fff' }}
        >
          {saving ? 'Saving…' : isNew ? 'Create Package' : 'Save Changes'}
        </button>
        <button
          onClick={onCancel}
          className="px-4 py-2.5 rounded-xl font-semibold text-sm"
          style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.6)' }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
