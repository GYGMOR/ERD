import { useState, useEffect } from 'react';
import { BookOpen, Plus, Search, Filter, Clock, ChevronRight, Tag, Eye, FileText } from 'lucide-react';
import { DocumentExplorer } from '../components/DocumentExplorer';
import { getTenantId } from '../utils/auth';
import type { KbArticle } from '../types/entities';

export const KnowledgeBaseView = () => {
  const [articles, setArticles] = useState<KbArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeView, setActiveView] = useState<'articles' | 'documents'>('articles');
  const [showModal, setShowModal] = useState(false);
  const [newArticle, setNewArticle] = useState<Partial<KbArticle>>({
    title: '',
    content: '',
    is_published: true,
    is_internal: true,
  });

  const tenantId = getTenantId();

  const fetchData = async () => {
    try {
      const res = await fetch('/api/kb/articles');
      const data = await res.json();
      if (data.success) setArticles(data.data);
    } catch (err) {
      console.error('Error fetching KB articles:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newArticle.title) return;

    try {
      const res = await fetch('/api/kb/articles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newArticle,
          tenant_id: tenantId,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setArticles([data.data, ...articles]);
        setShowModal(false);
        setNewArticle({ title: '', content: '', is_published: true, is_internal: true });
      }
    } catch (err) {
      console.error('Error creating article:', err);
    }
  };

  const categories = Array.from(new Set(articles.map(a => a.category).filter(Boolean)));

  const filtered = articles.filter(a => {
    const matchesSearch = a.title.toLowerCase().includes(search.toLowerCase()) || 
                         a.content.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = !selectedCategory || a.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="kb-page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10 }}>
            <BookOpen size={24} color="var(--color-primary)" /> Knowledge Base
          </h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 13, marginTop: 2 }}>
            Zentrale Dokumentation für Team und Kunden.
          </p>
        </div>
        <button className="btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={16} style={{ marginRight: 8, verticalAlign: 'middle' }} /> Neuer Artikel
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: 24 }}>
        <aside>
          <div className="card" style={{ padding: 16 }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Filter size={14} /> Kategorien
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <button
                onClick={() => setActiveView('articles')}
                style={{
                  textAlign: 'left', padding: '8px 12px', borderRadius: 'var(--radius-sm)', fontSize: 13,
                  backgroundColor: activeView === 'articles' ? 'var(--color-surface-hover)' : 'transparent',
                  color: activeView === 'articles' ? 'var(--color-primary)' : 'var(--color-text-main)',
                  fontWeight: activeView === 'articles' ? 600 : 400,
                  display: 'flex', alignItems: 'center', gap: 8
                }}
              >
                <BookOpen size={14} /> Artikel
              </button>
              <button
                onClick={() => setActiveView('documents')}
                style={{
                  textAlign: 'left', padding: '8px 12px', borderRadius: 'var(--radius-sm)', fontSize: 13,
                  backgroundColor: activeView === 'documents' ? 'var(--color-surface-hover)' : 'transparent',
                  color: activeView === 'documents' ? 'var(--color-primary)' : 'var(--color-text-main)',
                  fontWeight: activeView === 'documents' ? 600 : 400,
                  display: 'flex', alignItems: 'center', gap: 8
                }}
              >
                <FileText size={14} /> Handbücher & Dateien
              </button>
              
              {activeView === 'articles' && (
                <>
                  <div style={{ height: 1, backgroundColor: 'var(--color-border)', margin: '8px 0' }} />
                  <button
                    onClick={() => setSelectedCategory(null)}
                    style={{
                      textAlign: 'left', padding: '8px 12px', borderRadius: 'var(--radius-sm)', fontSize: 13,
                      backgroundColor: selectedCategory === null ? 'var(--color-surface-hover)' : 'transparent',
                      color: selectedCategory === null ? 'var(--color-primary)' : 'var(--color-text-main)',
                      fontWeight: selectedCategory === null ? 600 : 400
                    }}
                  >
                    Alle Artikel
                  </button>
                  {categories.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      style={{
                        textAlign: 'left', padding: '8px 12px', borderRadius: 'var(--radius-sm)', fontSize: 13,
                        backgroundColor: selectedCategory === cat ? 'var(--color-surface-hover)' : 'transparent',
                        color: selectedCategory === cat ? 'var(--color-primary)' : 'var(--color-text-main)',
                        fontWeight: selectedCategory === cat ? 600 : 400
                      }}
                    >
                      {cat}
                    </button>
                  ))}
                </>
              )}
            </div>
          </div>
        </aside>

        <main>
          {activeView === 'articles' ? (
            <>
              <div className="card" style={{ marginBottom: 20, padding: 12 }}>
                <div style={{ position: 'relative' }}>
                  <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                  <input
                    type="text"
                    placeholder="Knowledge Base durchsuchen..."
                    className="input-field"
                    style={{ paddingLeft: 36, border: 'none', backgroundColor: 'var(--color-background)' }}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
              </div>

              {loading ? (
                <div style={{ textAlign: 'center', padding: 48, color: 'var(--color-text-muted)' }}>Lade Artikel...</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {filtered.length === 0 ? (
                    <div className="card" style={{ textAlign: 'center', padding: 48, color: 'var(--color-text-muted)' }}>
                      Keine Artikel gefunden.
                    </div>
                  ) : filtered.map(article => (
                    <div key={article.id} className="card hover-bg-row" style={{ padding: 16, cursor: 'pointer', transition: 'all 0.2s ease' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                            <h3 style={{ fontSize: 15, fontWeight: 700 }}>{article.title}</h3>
                            {article.is_internal && <span className="badge info" style={{ fontSize: 9 }}>Intern</span>}
                          </div>
                          <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 12, display: 'flex', gap: 12, alignItems: 'center' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Tag size={12} /> {article.category || 'Allgemein'}</span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Clock size={12} /> {new Date(article.updated_at).toLocaleDateString('de-CH')}</span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Eye size={12} /> 0 Aufrufe</span>
                          </div>
                          <div style={{ fontSize: 13, color: 'var(--color-text-muted)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                            {article.content.replace(/<[^>]*>/g, '')}
                          </div>
                        </div>
                        <ChevronRight size={20} color="var(--color-border)" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
               <div className="card" style={{ padding: 24 }}>
                  <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Anleitungen & Handbücher</h3>
                  <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 24 }}>
                    Hier findest du alle wichtigen PDF-Anleitungen, Word-Vorlagen und Excel-Tabellen. 
                    Organisiere sie in Ordnern wie "Intern" und "Extern".
                  </p>
                  <DocumentExplorer entityType="kb" entityId="00000000-0000-0000-0000-000000000000" />
               </div>
            </div>
          )}
        </main>
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: 800 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20 }}>Neuer Knowledge Base Artikel</h2>
            <form onSubmit={handleCreate}>
              <div style={{ marginBottom: 16 }}>
                <label className="input-label">Titel *</label>
                <input
                  type="text"
                  className="input-field"
                  required
                  value={newArticle.title}
                  onChange={(e) => setNewArticle({ ...newArticle, title: e.target.value })}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                <div>
                  <label className="input-label">Kategorie</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="z.B. Onboarding, Technik"
                    onChange={(e) => setNewArticle({ ...newArticle, category: e.target.value })}
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 24, padding: '24px 0 0 0' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 13 }}>
                    <input
                      type="checkbox"
                      checked={newArticle.is_internal}
                      onChange={(e) => setNewArticle({ ...newArticle, is_internal: e.target.checked })}
                    />
                    <span>Interner Artikel</span>
                  </label>
                </div>
              </div>
              <div style={{ marginBottom: 20 }}>
                <label className="input-label">Inhalt (Markdown / Text) *</label>
                <textarea
                  className="input-field"
                  rows={10}
                  required
                  style={{ resize: 'vertical', fontFamily: 'monospace' }}
                  value={newArticle.content}
                  onChange={(e) => setNewArticle({ ...newArticle, content: e.target.value })}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Abbrechen</button>
                <button type="submit" className="btn-primary">Artikel erstellen</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
