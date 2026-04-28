import { useState, useEffect } from 'react';
import { BookOpen, Plus, Search, Filter, Clock, ChevronRight, Tag, Eye, FileText, Folder, ArrowLeft } from 'lucide-react';
import { DocumentExplorer } from '../components/DocumentExplorer';
import { getTenantId, getToken } from '../utils/auth';
import type { KbArticle } from '../types/entities';

export const KnowledgeBaseView = () => {
  const [articles, setArticles] = useState<KbArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeView, setActiveView] = useState<'articles' | 'documents'>('articles');
  const [showModal, setShowModal] = useState(false);
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [folderStack, setFolderStack] = useState<{ id: string | null, name: string }[]>([{ id: null, name: 'Hauptverzeichnis' }]);
  
  const [newArticle, setNewArticle] = useState<Partial<KbArticle>>({
    title: '',
    content: '',
    category: '',
    is_published: true,
    is_internal: true,
  });

  const tenantId = getTenantId();
  const currentFolder = folderStack[folderStack.length - 1];

  const fetchData = async () => {
    try {
      setLoading(true);
      const parentId = currentFolder.id ? `?parent_id=${currentFolder.id}` : '?parent_id=null';
      const res = await fetch(`/api/knowledge/articles${parentId}`, {
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });
      const data = await res.json();
      if (data.success) setArticles(data.data);
    } catch (err) {
      console.error('Error fetching KB articles:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeView === 'articles') fetchData();
  }, [currentFolder.id, activeView]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newArticle.title) return;

    try {
      const res = await fetch('/api/knowledge/articles', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`
        },
        body: JSON.stringify({
          ...newArticle,
          tenant_id: tenantId,
          parent_id: currentFolder.id,
          is_folder: false
        }),
      });
      const data = await res.json();
      if (data.success) {
        setArticles([data.data, ...articles].sort((a, b) => (b.is_folder ? 1 : 0) - (a.is_folder ? 1 : 0)));
        setShowModal(false);
        setNewArticle({ title: '', content: '', category: '', is_published: true, is_internal: true });
      }
    } catch (err) {
      console.error('Error creating article:', err);
    }
  };

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName) return;

    try {
      const res = await fetch('/api/knowledge/articles', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`
        },
        body: JSON.stringify({
          title: newFolderName,
          tenant_id: tenantId,
          parent_id: currentFolder.id,
          is_folder: true,
          is_internal: true,
          is_published: true
        }),
      });
      const data = await res.json();
      if (data.success) {
        setArticles([data.data, ...articles]);
        setShowFolderModal(false);
        setNewFolderName('');
      }
    } catch (err) {
      console.error('Error creating folder:', err);
    }
  };

  const categories = Array.from(new Set(articles.filter(a => !a.is_folder).map(a => a.category).filter(Boolean)));

  const filtered = articles.filter(a => {
    const matchesSearch = a.title.toLowerCase().includes(search.toLowerCase()) || 
                         (a.content || '').toLowerCase().includes(search.toLowerCase());
    const matchesCategory = !selectedCategory || a.category === selectedCategory || a.is_folder;
    return matchesSearch && matchesCategory;
  });

  const enterFolder = (folder: KbArticle) => {
    setFolderStack([...folderStack, { id: folder.id, name: folder.title }]);
    setSelectedCategory(null);
  };

  const popFolder = (index: number) => {
    setFolderStack(folderStack.slice(0, index + 1));
    setSelectedCategory(null);
  };

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
        <div style={{ display: 'flex', gap: 12 }}>
          {activeView === 'articles' && (
            <>
              <button className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: 8 }} onClick={() => setShowFolderModal(true)}>
                <Folder size={16} /> Neuer Ordner
              </button>
              <button className="btn-primary" onClick={() => setShowModal(true)}>
                <Plus size={16} style={{ marginRight: 8, verticalAlign: 'middle' }} /> Neuer Artikel
              </button>
            </>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: 24 }}>
        <aside>
          <div className="card" style={{ padding: 16 }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Filter size={14} /> Navigation
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
              {/* Breadcrumbs */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, fontSize: 13, color: 'var(--color-text-muted)' }}>
                {folderStack.map((f, i) => (
                  <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span 
                      style={{ cursor: 'pointer', fontWeight: i === folderStack.length - 1 ? 700 : 400, color: i === folderStack.length - 1 ? 'var(--color-text-main)' : 'inherit' }}
                      onClick={() => popFolder(i)}
                    >
                      {f.name}
                    </span>
                    {i < folderStack.length - 1 && <ChevronRight size={14} />}
                  </span>
                ))}
              </div>

              <div className="card" style={{ marginBottom: 20, padding: 12 }}>
                <div style={{ position: 'relative' }}>
                  <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                  <input
                    type="text"
                    placeholder="In diesem Ordner suchen..."
                    className="input-field"
                    style={{ paddingLeft: 36, border: 'none', backgroundColor: 'var(--color-background)' }}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
              </div>

              {loading ? (
                <div style={{ textAlign: 'center', padding: 48, color: 'var(--color-text-muted)' }}>Lade Inhalte...</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {filtered.length === 0 ? (
                    <div className="card" style={{ textAlign: 'center', padding: 48, color: 'var(--color-text-muted)' }}>
                      Keine Inhalte in diesem Verzeichnis.
                    </div>
                  ) : filtered.map(item => (
                    <div 
                      key={item.id} 
                      className="card hover-bg-row" 
                      style={{ padding: 16, cursor: 'pointer', transition: 'all 0.2s ease' }}
                      onClick={() => item.is_folder ? enterFolder(item) : null}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ display: 'flex', gap: 12 }}>
                          {item.is_folder ? (
                            <Folder size={20} color="var(--color-primary)" fill="var(--color-primary)" fillOpacity={0.1} />
                          ) : (
                            <FileText size={20} color="var(--color-text-muted)" />
                          )}
                          <div>
                            <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>{item.title}</h3>
                            {!item.is_folder && (
                              <div style={{ display: 'flex', gap: 16, marginTop: 4, color: 'var(--color-text-muted)', fontSize: 12 }}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Clock size={12} /> {new Date(item.created_at).toLocaleDateString('de-CH')}</span>
                                {item.category && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Tag size={12} /> {item.category}</span>}
                                {item.is_internal && <span className="badge warning" style={{ fontSize: 10 }}>Intern</span>}
                              </div>
                            )}
                          </div>
                        </div>
                        <ChevronRight size={18} color="var(--color-text-muted)" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
               <div style={{ padding: 24 }}>
                  <DocumentExplorer entityType="kb" entityId="00000000-0000-0000-0000-000000000000" />
               </div>
            </div>
          )}
        </main>
      </div>

      {/* Article Modal */}
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
                    placeholder="z.B. IT-Support"
                    value={newArticle.category}
                    onChange={(e) => setNewArticle({ ...newArticle, category: e.target.value })}
                  />
                </div>
                <div style={{ display: 'flex', gap: 20, alignItems: 'flex-end', height: '100%', paddingBottom: 8 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
                    <input type="checkbox" checked={newArticle.is_internal} onChange={e => setNewArticle({ ...newArticle, is_internal: e.target.checked })} /> Intern
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
                    <input type="checkbox" checked={newArticle.is_published} onChange={e => setNewArticle({ ...newArticle, is_published: e.target.checked })} /> Veröffentlicht
                  </label>
                </div>
              </div>
              <div style={{ marginBottom: 24 }}>
                <label className="input-label">Inhalt (Markdown unterstützt)</label>
                <textarea
                  className="input-field"
                  rows={12}
                  style={{ resize: 'vertical', fontFamily: 'monospace' }}
                  value={newArticle.content}
                  onChange={(e) => setNewArticle({ ...newArticle, content: e.target.value })}
                ></textarea>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Abbrechen</button>
                <button type="submit" className="btn-primary">Artikel erstellen</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Folder Modal */}
      {showFolderModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: 400 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20 }}>Neuer Ordner</h2>
            <form onSubmit={handleCreateFolder}>
              <div style={{ marginBottom: 20 }}>
                <label className="input-label">Ordnername</label>
                <input
                  type="text"
                  className="input-field"
                  required
                  autoFocus
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="z.B. Anleitungen"
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                <button type="button" className="btn-secondary" onClick={() => setShowFolderModal(false)}>Abbrechen</button>
                <button type="submit" className="btn-primary">Ordner erstellen</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .modal-overlay {
          position: fixed;
          inset: 0;
          background-color: rgba(0,0,0,0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1100;
          backdrop-filter: blur(4px);
        }
        .modal-content {
          background-color: var(--color-surface);
          padding: 32px;
          border-radius: var(--radius-lg);
          width: 90%;
          box-shadow: var(--shadow-lg);
        }
      `}</style>
    </div>
  );
};
