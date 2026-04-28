import { useState, useEffect } from 'react';
import { 
  Folder, File, FileText, Plus, Upload, Trash2, 
  ChevronRight, ChevronLeft, MoreVertical, Download,
  FileSpreadsheet, FileArchive, FileImage
} from 'lucide-react';
import { getToken } from '../utils/auth';

interface FileItem {
  id: string;
  file_name: string;
  file_type: string;
  file_size?: number;
  is_folder: boolean;
  parent_id: string | null;
  created_at: string;
}

interface DocumentExplorerProps {
  entityType: string;
  entityId: string;
}

export const DocumentExplorer = ({ entityType, entityId }: DocumentExplorerProps) => {
  const [items, setItems] = useState<FileItem[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [folderStack, setFolderStack] = useState<{id: string | null, name: string}[]>([{id: null, name: 'Root'}]);
  const [loading, setLoading] = useState(true);
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [uploading, setUploading] = useState(false);

  const fetchItems = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/files?entity_type=${entityType}&entity_id=${entityId}&parent_id=${currentFolderId || 'null'}`, {
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });
      const data = await res.json();
      if (data.success) {
        setItems(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch files', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, [currentFolderId, entityId]);

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    try {
      const res = await fetch('/api/files/folders', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`
        },
        body: JSON.stringify({
          name: newFolderName.trim(),
          entity_type: entityType,
          entity_id: entityId,
          parent_id: currentFolderId
        })
      });
      const data = await res.json();
      if (data.success) {
        setItems(prev => [data.data, ...prev].sort((a, b) => b.is_folder ? 1 : -1));
        setNewFolderName('');
        setShowNewFolderModal(false);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      if (currentFolderId) formData.append('parent_id', currentFolderId);
      formData.append('entity_type', entityType);
      formData.append('entity_id', entityId);

      const res = await fetch('/api/files/upload', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${getToken()}`
        },
        body: formData
      });
      const data = await res.json();
      if (data.success) {
        setItems(prev => [data.data, ...prev].sort((a, b) => b.is_folder ? 1 : -1));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Soll dieses Element wirklich gelöscht werden?')) return;
    try {
      const res = await fetch(`/api/files/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });
      const data = await res.json();
      if (data.success) {
        setItems(prev => prev.filter(i => i.id !== id));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const navigateToFolder = (id: string | null, name: string) => {
    if (id === currentFolderId) return;
    
    if (id === null) {
      setFolderStack([{id: null, name: 'Root'}]);
    } else {
      setFolderStack(prev => [...prev, {id, name}]);
    }
    setCurrentFolderId(id);
  };

  const goBack = () => {
    if (folderStack.length <= 1) return;
    const newStack = [...folderStack];
    newStack.pop();
    const parent = newStack[newStack.length - 1];
    setFolderStack(newStack);
    setCurrentFolderId(parent.id);
  };

  const getFileIcon = (type: string, isFolder: boolean) => {
    if (isFolder) return <Folder size={20} style={{ color: '#e5b35a' }} />;
    
    switch (type.toLowerCase()) {
      case 'pdf': return <FileText size={20} style={{ color: '#ef4444' }} />;
      case 'xlsx':
      case 'xls':
      case 'csv': return <FileSpreadsheet size={20} style={{ color: '#10b981' }} />;
      case 'docx':
      case 'doc': return <FileText size={20} style={{ color: '#3b82f6' }} />;
      case 'zip':
      case 'rar': return <FileArchive size={20} style={{ color: '#8b5cf6' }} />;
      case 'png':
      case 'jpg':
      case 'jpeg': return <FileImage size={20} style={{ color: '#ec4899' }} />;
      default: return <File size={20} style={{ color: 'var(--color-text-muted)' }} />;
    }
  };

  const formatSize = (bytes?: number) => {
    if (!bytes) return '-';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Explorer Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--color-surface)', padding: '12px 16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {folderStack.length > 1 && (
            <button onClick={goBack} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center' }}>
              <ChevronLeft size={20} />
            </button>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 600 }}>
            {folderStack.map((f, i) => (
              <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {i > 0 && <ChevronRight size={14} style={{ color: 'var(--color-text-muted)' }} />}
                <span 
                  onClick={() => i < folderStack.length - 1 && navigateToFolder(f.id, f.name)}
                  style={{ cursor: i < folderStack.length - 1 ? 'pointer' : 'default', color: i < folderStack.length - 1 ? 'var(--color-primary)' : 'inherit' }}
                >
                  {f.name === 'Root' ? 'Dokumente' : f.name}
                </span>
              </span>
            ))}
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-secondary" onClick={() => setShowNewFolderModal(true)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', fontSize: 13 }}>
            <Plus size={16} /> Neuer Ordner
          </button>
          <label className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', fontSize: 13, cursor: 'pointer' }}>
            <Upload size={16} /> {uploading ? 'Lädt...' : 'Datei hochladen'}
            <input type="file" style={{ display: 'none' }} onChange={handleUpload} disabled={uploading} />
          </label>
        </div>
      </div>

      {/* Explorer Grid/List */}
      <div className="card" style={{ padding: 0, minHeight: 400 }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400, color: 'var(--color-text-muted)' }}>
            Wird geladen...
          </div>
        ) : items.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 400, color: 'var(--color-text-muted)', gap: 16 }}>
            <Folder size={64} style={{ opacity: 0.1 }} />
            <p>Dieser Ordner ist leer.</p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface-hover)' }}>
                <th style={{ padding: '12px 16px', fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Name</th>
                <th style={{ padding: '12px 16px', fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Grösse</th>
                <th style={{ padding: '12px 16px', fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Datum</th>
                <th style={{ padding: '12px 16px', width: 80 }}></th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr 
                  key={item.id} 
                  className="hover-bg-row" 
                  style={{ borderBottom: '1px solid var(--color-border)', cursor: item.is_folder ? 'pointer' : 'default' }}
                  onClick={() => item.is_folder && navigateToFolder(item.id, item.file_name)}
                >
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      {getFileIcon(item.file_type, item.is_folder)}
                      <span style={{ fontWeight: 500, fontSize: 14 }}>{item.file_name}</span>
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--color-text-muted)' }}>
                    {item.is_folder ? '-' : formatSize(item.file_size)}
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--color-text-muted)' }}>
                    {new Date(item.created_at).toLocaleDateString('de-CH')}
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                      {!item.is_folder && (
                        <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }} title="Download">
                          <Download size={16} />
                        </button>
                      )}
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-danger)' }} 
                        title="Löschen"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* New Folder Modal */}
      {showNewFolderModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: 16 }}>
          <div className="card" style={{ width: '100%', maxWidth: 400, padding: 24 }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Neuer Ordner</h3>
            <form onSubmit={handleCreateFolder}>
              <input 
                autoFocus
                className="input-field"
                placeholder="Ordnername"
                value={newFolderName}
                onChange={e => setNewFolderName(e.target.value)}
                style={{ marginBottom: 20 }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                <button type="button" className="btn-secondary" onClick={() => setShowNewFolderModal(false)}>Abbrechen</button>
                <button type="submit" className="btn-primary" disabled={!newFolderName.trim()}>Erstellen</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
