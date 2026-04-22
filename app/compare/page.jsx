'use client';

import { useState, useEffect, useMemo } from 'react';
import { FEATURE_CONFIG, ALL_FEATURES, phones as fallbackPhones } from '@/src/api/mobileData.js';

// ─── Comparison Logic Helpers ────────────────────────────────────────────────
function getBestValue(feature, phones) {
  if (!phones || phones.length === 0) return null;
  const values = phones.map(p => p[feature]);
  
  // Price: lower is better
  if (feature === 'price') return Math.min(...values);
  
  // Higher is better for everything else
  return Math.max(...values);
}

function formatValue(feature, value) {
  if (value === undefined || value === null) return '-';
  const { unit } = FEATURE_CONFIG[feature];
  if (unit === '₹')    return `₹${value.toLocaleString('en-IN')}`;
  if (unit === 'mAh')  return `${value.toLocaleString('en-IN')} mAh`;
  if (unit === '"')    return `${value}"`;
  if (unit === 'GB')   return `${value} GB`;
  if (unit === 'GHz')  return `${value} GHz`;
  if (unit === 'MP')   return `${value} MP`;
  if (unit === 'W')    return `${value} W`;
  if (unit === '/10')  return `${value}/10`;
  return String(value);
}

export default function Compare() {
  const [dataset, setDataset] = useState(fallbackPhones);
  const [selectedIds, setSelectedIds] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Fetch data
  useEffect(() => {
    async function fetchLivePhones() {
      try {
        const res = await fetch('http://localhost:3001/api/released-phones');
        if (!res.ok) throw new Error('API failed');
        const data = await res.json();
        if (data && data.length > 0) setDataset(data);
      } catch (err) {
        console.error('Compare page fetch failed:', err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchLivePhones();
  }, []);

  // Filter phones by search
  const filteredPhones = useMemo(() => {
    if (!searchQuery.trim()) return dataset.slice(0, 10); // Show top 10 initially
    const q = searchQuery.toLowerCase();
    return dataset.filter(p => 
      p.name.toLowerCase().includes(q) || 
      p.brand.toLowerCase().includes(q)
    ).slice(0, 20); // Limit results for performance
  }, [dataset, searchQuery]);

  const selectedPhones = useMemo(() => 
    selectedIds.map(id => dataset.find(p => p.id === id)).filter(Boolean),
    [dataset, selectedIds]
  );

  const togglePhone = (id) => {
    setSelectedIds(prev => {
      if (prev.includes(id)) return prev.filter(i => i !== id);
      if (prev.length >= 3) return prev;
      return [...prev, id];
    });
  };

  const removePhone = (id) => {
    setSelectedIds(prev => prev.filter(i => i !== id));
  };

  return (
    <main style={{ minHeight: '100vh', padding: '40px 20px', background: '#f8fafc' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
        
        <header style={{ textAlign: 'center', marginBottom: '48px' }}>
          <h1 style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '2.5rem', fontWeight: 800, color: '#0f172a', marginBottom: '12px' }}>
            Compare Devices
          </h1>
          <p style={{ color: '#64748b', fontSize: '1.1rem' }}>
            Select up to 3 smartphones to see a detailed side-by-side specification breakdown.
          </p>
        </header>

        {/* Search & Selection Section */}
        <section style={{ background: 'white', borderRadius: '24px', padding: '32px', boxShadow: '0 4px 25px rgba(0,0,0,0.05)', marginBottom: '40px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '24px', alignItems: 'start' }}>
            
            {/* Left: Search Area */}
            <div style={{ position: 'relative' }}>
              <div style={{ marginBottom: '20px' }}>
                <input 
                  type="text"
                  placeholder="Search phones (e.g. iPhone 14, Samsung S23)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '16px 20px',
                    borderRadius: '12px',
                    border: '2px solid #e2e8f0',
                    fontSize: '1rem',
                    outline: 'none',
                    transition: 'border-color 0.2s',
                    fontFamily: 'inherit'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#2563eb'}
                  onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                />
              </div>

              {searchQuery && (
                <div style={{ 
                  position: 'absolute', top: '70px', left: 0, right: 0, 
                  background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px',
                  boxShadow: '0 10px 30px rgba(0,0,0,0.1)', zIndex: 10,
                  maxHeight: '300px', overflowY: 'auto', padding: '8px'
                }}>
                  {filteredPhones.length > 0 ? filteredPhones.map(p => (
                    <div 
                      key={p.id}
                      onClick={() => { togglePhone(p.id); setSearchQuery(''); }}
                      style={{
                        padding: '12px 16px', borderRadius: '8px', cursor: 'pointer',
                        background: selectedIds.includes(p.id) ? '#eff6ff' : 'transparent',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#f1f5f9'}
                      onMouseLeave={(e) => e.currentTarget.style.background = selectedIds.includes(p.id) ? '#eff6ff' : 'transparent'}
                    >
                      <span style={{ fontWeight: 600, color: '#1e293b' }}>{p.name}</span>
                      <span style={{ fontSize: '0.85rem', color: '#64748b' }}>₹{p.price.toLocaleString()}</span>
                    </div>
                  )) : (
                    <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>No phones found matching "{searchQuery}"</div>
                  )}
                </div>
              )}

              {/* Suggestions Chips */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                <span style={{ fontSize: '0.9rem', color: '#64748b', alignSelf: 'center', marginRight: '8px' }}>Popular:</span>
                {dataset.slice(0, 5).map(p => (
                  <button 
                    key={p.id}
                    onClick={() => togglePhone(p.id)}
                    disabled={selectedIds.includes(p.id)}
                    style={{
                      padding: '6px 14px', borderRadius: '100px', border: '1px solid #e2e8f0',
                      background: 'white', color: '#475569', fontSize: '0.85rem', fontWeight: 600,
                      cursor: 'pointer', transition: 'all 0.2s'
                    }}
                  >
                    + {p.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Right: Selected Counter */}
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#2563eb', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>
                Selected ({selectedIds.length}/3)
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                {selectedPhones.map(p => (
                  <div key={p.id} style={{ 
                    background: '#f1f5f9', padding: '8px 12px', borderRadius: '10px', 
                    display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid #e2e8f0'
                  }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e293b' }}>{p.brand} {p.name.split(' ')[0]}</span>
                    <button 
                      onClick={() => removePhone(p.id)}
                      style={{ border: 'none', background: '#cbd5e1', color: 'white', borderRadius: '50%', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '10px' }}
                    >✕</button>
                  </div>
                ))}
                {selectedIds.length === 0 && (
                  <div style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: '0.9rem' }}>Choose phones to compare</div>
                )}
              </div>
            </div>

          </div>
        </section>

        {/* Comparison Table */}
        {selectedIds.length > 0 ? (
          <div style={{ background: 'white', borderRadius: '24px', overflow: 'hidden', boxShadow: '0 10px 40px rgba(0,0,0,0.08)', border: '1px solid #e2e8f0' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #f1f5f9' }}>
                  <th style={{ padding: '24px', width: '200px', background: '#f8fafc', color: '#64748b', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Attribute</th>
                  {selectedPhones.map(p => (
                    <th key={p.id} style={{ padding: '24px', textAlign: 'center' }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#2563eb', textTransform: 'uppercase', marginBottom: '4px' }}>{p.brand}</div>
                      <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>{p.name}</div>
                    </th>
                  ))}
                  {/* Fill empty slots */}
                  {Array.from({ length: 3 - selectedIds.length }).map((_, i) => (
                    <th key={`empty-${i}`} style={{ padding: '24px', textAlign: 'center', color: '#cbd5e1' }}>
                      <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#f8fafc', border: '2px dashed #e2e8f0', margin: '0 auto 12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>+</div>
                      <div style={{ fontSize: '0.9rem' }}>Add Device</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ALL_FEATURES.map((feature, idx) => {
                  const cfg = FEATURE_CONFIG[feature];
                  const bestValue = getBestValue(feature, selectedPhones);
                  
                  return (
                    <tr key={feature} style={{ borderBottom: '1px solid #f1f5f9', background: idx % 2 === 0 ? 'transparent' : '#fcfdfe' }}>
                      <td style={{ padding: '18px 24px', fontWeight: 600, color: '#475569', fontSize: '0.95rem' }}>{cfg.label}</td>
                      {selectedPhones.map(p => {
                        const isBest = p[feature] === bestValue && selectedPhones.length > 1;
                        return (
                          <td key={p.id} style={{ padding: '18px 24px', textAlign: 'center' }}>
                            <div style={{ 
                              display: 'inline-block', padding: '6px 12px', borderRadius: '8px',
                              background: isBest ? '#ecfdf5' : 'transparent',
                              border: isBest ? '1px solid #10b981' : 'none',
                              color: isBest ? '#065f46' : '#1e293b',
                              fontWeight: isBest ? 800 : 500,
                              fontSize: '1rem'
                            }}>
                              {formatValue(feature, p[feature])}
                              {isBest && <span style={{ marginLeft: '6px', fontSize: '0.7rem', verticalAlign: 'middle', background: '#10b981', color: 'white', padding: '2px 6px', borderRadius: '4px' }}>BEST</span>}
                            </div>
                          </td>
                        );
                      })}
                      {/* Empty cells */}
                      {Array.from({ length: 3 - selectedIds.length }).map((_, i) => (
                        <td key={`empty-cell-${i}`} style={{ padding: '18px 24px' }}></td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '100px 40px', background: 'white', borderRadius: '24px', border: '2px dashed #e2e8f0' }}>
            <div style={{ fontSize: '3rem', marginBottom: '20px' }}>📊</div>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>Start your comparison</h3>
            <p style={{ color: '#64748b', maxWidth: '400px', margin: '0 auto' }}>
              Use the search bar above to find and select smartphones. You can compare up to 3 devices side-by-side.
            </p>
          </div>
        )}

      </div>
    </main>
  );
}
