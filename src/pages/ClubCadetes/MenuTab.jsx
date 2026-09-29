import { useState, useEffect } from 'react';
import { collection, query, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase';
import { Edit2, Trash2, Plus } from 'lucide-react';
import { toast } from 'sonner';

export default function MenuTab() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingItem, setEditingItem] = useState(null);
  
  const [formData, setFormData] = useState({
    name: '',
    price: ''
  });

  useEffect(() => {
    fetchMenu();
  }, []);

  const fetchMenu = async () => {
    try {
      const snap = await getDocs(collection(db, 'clubMenuItems'));
      const list = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() }));
      setItems(list.sort((a,b) => a.name.localeCompare(b.name)));
    } catch (error) {
      console.error(error);
      toast.error('Error cargando menú del club');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.price) return toast.error("Llena todos los campos");
    
    try {
      const payload = {
        name: formData.name.trim(),
        price: parseFloat(formData.price),
        active: true,
        updatedAt: new Date()
      };

      if (editingItem) {
        await updateDoc(doc(db, 'clubMenuItems', editingItem.id), payload);
        toast.success("Platillo actualizado");
      } else {
        await addDoc(collection(db, 'clubMenuItems'), { ...payload, createdAt: new Date() });
        toast.success("Platillo agregado");
      }
      
      setFormData({ name: '', price: '' });
      setEditingItem(null);
      fetchMenu();
    } catch (error) {
      console.error(error);
      toast.error("Error al guardar");
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Seguro que deseas eliminar este platillo del club?')) return;
    try {
      await deleteDoc(doc(db, 'clubMenuItems', id));
      toast.success("Platillo eliminado");
      fetchMenu();
    } catch (e) {
      console.error(e);
      toast.error("Error al eliminar");
    }
  };

  return (
    <div style={{ display: 'flex', gap: '2rem', height: '100%', alignItems: 'flex-start' }}>
      
      {/* Formulario */}
      <div className="card" style={{ flex: '1', maxWidth: '350px', position: 'sticky', top: 0 }}>
        <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {editingItem ? <Edit2 size={20} /> : <Plus size={20} />}
          {editingItem ? 'Editar Platillo' : 'Nuevo Platillo'}
        </h3>
        
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', display: 'block' }}>Nombre del Platillo</label>
            <input 
              type="text" 
              className="input-field" 
              placeholder="Ej. Pollo Frito con Tajadas"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>
          <div>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', display: 'block' }}>Precio (L.)</label>
            <input 
              type="number" 
              className="input-field" 
              placeholder="0.00"
              step="0.01"
              value={formData.price}
              onChange={e => setFormData({ ...formData, price: e.target.value })}
              required
            />
          </div>
          
          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
            <button type="submit" className="btn-primary" style={{ flex: 1 }}>
              Guardar
            </button>
            {editingItem && (
              <button type="button" className="btn-secondary" onClick={() => {
                setEditingItem(null);
                setFormData({ name: '', price: '' });
              }}>
                Cancelar
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Lista de Platillos */}
      <div className="card" style={{ flex: '2', overflowY: 'auto', maxHeight: 'calc(100vh - 150px)' }}>
        <h3 style={{ marginBottom: '1.5rem' }}>Catálogo Exclusivo (Club de Cadetes)</h3>
        {loading ? <p>Cargando menú...</p> : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Platillo</th>
                <th>Precio</th>
                <th style={{ width: '100px', textAlign: 'center' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan="3" style={{ textAlign: 'center', padding: '2rem' }}>No hay platillos registrados para el club.</td>
                </tr>
              ) : (
                items.map(item => (
                  <tr key={item.id}>
                    <td style={{ fontWeight: '500' }}>{item.name}</td>
                    <td style={{ color: '#4CAF50', fontWeight: 'bold' }}>L. {item.price.toFixed(2)}</td>
                    <td style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                      <button 
                        className="btn-secondary" 
                        style={{ padding: '0.4rem', border: 'none' }}
                        onClick={() => {
                          setEditingItem(item);
                          setFormData({ name: item.name, price: item.price });
                        }}
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        className="btn-secondary" 
                        style={{ padding: '0.4rem', border: 'none', color: '#f44336' }}
                        onClick={() => handleDelete(item.id)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

    </div>
  );
}
