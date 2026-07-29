import { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { logAuditAction } from '../utils/auditLogger';
import { Utensils, Plus, Edit2, Trash2 } from 'lucide-react';
import './MenuConfig.css';

export default function MenuConfig() {
  const { currentUser } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Form State
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    type: 'platillo',
    price: 0,
    description: '',
    stock: -1,
    hasVariations: false,
    variations: [],
    available: true
  });

  const [activeTab, setActiveTab] = useState('todos');
  const [activeSubTab, setActiveSubTab] = useState('platillo');
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState(null);

  const mainTabs = [
    { value: 'todos', label: 'Todos' },
    { value: 'personales', label: 'Platillos Personales' },
    { value: 'combo', label: 'Combo Familiar' },
    { value: 'bebida', label: 'Bebida/Refresco' },
    { value: 'extra', label: 'Extras' }
  ];

  const subTabsPersonales = [
    { value: 'platillo', label: 'Tradicionales' },
    { value: 'pollo_frito', label: 'Pollo Frito' },
    { value: 'tacos', label: 'Tacos' },
    { value: 'alitas', label: 'Alitas y Salsas' }
  ];

  const itemTypes = [
    { value: 'platillo', label: 'Platillo (Tradicional)' },
    { value: 'pollo_frito', label: 'Pollo Frito' },
    { value: 'tacos', label: 'Tacos' },
    { value: 'alitas', label: 'Alitas' },
    { value: 'salsa_alitas', label: 'Salsa para Alitas' },
    { value: 'combo', label: 'Combo Familiar' },
    { value: 'bebida', label: 'Bebida/Refresco' },
    { value: 'extra', label: 'Extra (Tortilla, Aderezo)' }
  ];

  const fetchMenu = async () => {
    try {
      setLoading(true);
      const querySnapshot = await getDocs(collection(db, 'menuItems'));
      const menuData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Excluir sopa, carne_menu_dia y acompanante del catálogo general
      const filteredForCatalog = menuData.filter(i => 
        !['sopa', 'carne_menu_dia', 'acompanante'].includes(i.type)
      );
      setItems(filteredForCatalog);
    } catch (error) {
      console.error("Error fetching menu:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMenu();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await updateDoc(doc(db, 'menuItems', editingId), formData);
        await logAuditAction('ACTUALIZAR_MENU', 'MENU', `Actualizado item: ${formData.name}`, currentUser);
      } else {
        await addDoc(collection(db, 'menuItems'), formData);
        await logAuditAction('NUEVO_MENU', 'MENU', `Creado nuevo item: ${formData.name}`, currentUser);
      }
      setShowForm(false);
      setEditingId(null);
      setFormData({ name: '', type: 'platillo', price: 0, description: '', stock: -1, hasVariations: false, variations: [] });
      fetchMenu();
    } catch (error) {
      console.error("Error saving menu item:", error);
    }
  };

  const handleEdit = (item) => {
    setFormData({
      name: item.name,
      type: item.type,
      price: item.price || 0,
      description: item.description || '',
      stock: item.stock !== undefined ? item.stock : -1,
      hasVariations: item.hasVariations || false,
      variations: item.variations || [],
      available: item.available !== false // defaults to true
    });
    setEditingId(item.id);
    setShowForm(true);
  };

  const handleDelete = async (id, name) => {
    if(window.confirm(`¿Seguro que deseas eliminar ${name}?`)) {
      try {
        await deleteDoc(doc(db, 'menuItems', id));
        await logAuditAction('ELIMINAR_MENU', 'MENU', `Eliminado item: ${name}`, currentUser);
        fetchMenu();
      } catch (error) {
        console.error("Error deleting menu item:", error);
      }
    }
  };

  const handleVariationChange = (index, field, value) => {
    const newVars = [...formData.variations];
    newVars[index][field] = value;
    setFormData({...formData, variations: newVars});
  };

  const addVariation = () => {
    setFormData({
      ...formData, 
      variations: [...formData.variations, { id: Date.now().toString(), name: '', price: 0 }]
    });
  };

  const removeVariation = (index) => {
    const newVars = [...formData.variations];
    newVars.splice(index, 1);
    setFormData({...formData, variations: newVars});
  };

  const handleToggleAvailability = async (item) => {
    try {
      const { doc, updateDoc } = await import('firebase/firestore');
      const newState = item.available === false ? true : false;
      await updateDoc(doc(db, 'menuItems', item.id), { available: newState });
      fetchMenu();
    } catch (error) {
      console.error("Error toggling availability:", error);
    }
  };

  // Filter items based on selected tab and search term
  const filteredItems = items.filter(item => {
    const matchSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    let matchTab = false;
    if (activeTab === 'todos') {
      matchTab = true;
    } else if (activeTab === 'personales') {
      if (activeSubTab === 'alitas') {
        matchTab = item.type === 'alitas' || item.type === 'salsa_alitas';
      } else {
        matchTab = item.type === activeSubTab;
      }
    } else {
      matchTab = item.type === activeTab;
    }

    return matchTab && matchSearch;
  });

  return (
    <div className="menu-config-container">
      <div className="header-actions">
        <h1><Utensils size={28} style={{marginRight: '10px'}}/> Configuración del Catálogo</h1>
        <button className="btn-primary" onClick={() => { setShowForm(true); setEditingId(null); }}>
          <Plus size={18} /> Nuevo Artículo
        </button>
      </div>

      <div style={{marginBottom: '1rem'}}>
        <input 
          type="text" 
          className="input-field" 
          placeholder="🔍 Buscar platillo, bebida, salsa..." 
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Tabs Principales */}
      <div className="category-tabs" style={{display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.5rem', marginBottom: activeTab === 'personales' ? '0' : '1rem', borderBottom: activeTab === 'personales' ? 'none' : '1px solid var(--border-color)'}}>
        {mainTabs.map(tab => (
          <button 
            key={tab.value}
            className={`btn-secondary ${activeTab === tab.value ? 'active-tab' : ''}`}
            onClick={() => setActiveTab(tab.value)}
            style={activeTab === tab.value ? {backgroundColor: 'var(--primary-color)', color: 'white', borderColor: 'var(--primary-color)'} : {}}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Sub-tabs para Platillos Personales */}
      {activeTab === 'personales' && (
        <div className="subcategory-tabs" style={{display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '1rem', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingLeft: '1rem'}}>
          {subTabsPersonales.map(tab => (
            <button 
              key={tab.value}
              className={`btn-secondary ${activeSubTab === tab.value ? 'active-tab' : ''}`}
              onClick={() => setActiveSubTab(tab.value)}
              style={activeSubTab === tab.value ? {backgroundColor: 'var(--accent-color)', color: 'white', borderColor: 'var(--accent-color)', fontSize: '0.85rem', padding: '0.4rem 0.8rem'} : {fontSize: '0.85rem', padding: '0.4rem 0.8rem'}}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {showForm && (
        <div className="card form-card">
          <h2>{editingId ? 'Editar Artículo' : 'Nuevo Artículo'}</h2>
          <form onSubmit={handleSave} className="menu-form">
            <div className="form-group">
              <label>Nombre del Platillo / Producto</label>
              <input type="text" className="input-field" required 
                value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} 
              />
            </div>
            
            <div className="form-group">
              <label>Tipo de Artículo</label>
              <select className="input-field" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}>
                {itemTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            
            <div className="form-group full-width" style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
              <input 
                type="checkbox" 
                id="hasVariations"
                checked={formData.hasVariations}
                onChange={e => setFormData({...formData, hasVariations: e.target.checked})}
              />
              <label htmlFor="hasVariations" style={{margin: 0}}>Este platillo tiene múltiples precios / tamaños (Variaciones)</label>
            </div>

            {!formData.hasVariations ? (
              <div className="form-group">
                <label>Precio (L.)</label>
                <input type="number" className="input-field" required={!formData.hasVariations} min="0" step="0.01"
                  value={formData.price} onChange={e => setFormData({...formData, price: Number(e.target.value)})} 
                />
              </div>
            ) : (
              <div className="form-group full-width" style={{backgroundColor: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px'}}>
                <label style={{marginBottom: '0.5rem', display: 'block'}}>Variaciones (Tamaños / Piezas)</label>
                {formData.variations.map((v, idx) => (
                  <div key={v.id} style={{display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'center'}}>
                    <input 
                      type="text" 
                      className="input-field" 
                      placeholder="Nombre (ej: Pechuga)" 
                      value={v.name}
                      onChange={e => handleVariationChange(idx, 'name', e.target.value)}
                      required
                    />
                    <input 
                      type="number" 
                      className="input-field" 
                      placeholder="Precio L." 
                      value={v.price}
                      onChange={e => handleVariationChange(idx, 'price', Number(e.target.value))}
                      required
                      style={{width: '100px'}}
                    />
                    <button type="button" className="btn-secondary" style={{padding: '0.5rem', color: 'red', borderColor: 'red'}} onClick={() => removeVariation(idx)}>✕</button>
                  </div>
                ))}
                <button type="button" className="btn-secondary" style={{marginTop: '0.5rem'}} onClick={addVariation}>
                  + Añadir Variación
                </button>
              </div>
            )}
            
            <div className="form-group">
              <label>Stock (-1 si es infinito)</label>
              <input type="number" className="input-field" required 
                value={formData.stock} onChange={e => setFormData({...formData, stock: Number(e.target.value)})} 
              />
            </div>
            
            <div className="form-group full-width">
              <label>Descripción / Comentarios (Opcional)</label>
              <textarea className="input-field" rows="3"
                value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} 
              />
            </div>

            <div className="form-actions full-width">
              <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Cancelar</button>
              <button type="submit" className="btn-primary">Guardar</button>
            </div>
          </form>
        </div>
      )}

      <div className="menu-list">
        {loading ? <p>Cargando menú...</p> : (
          <div className="grid-cards">
            {filteredItems.map(item => (
              <div key={item.id} className="card item-card">
                <div className="item-header">
                  <h3>{item.name}</h3>
                  <span className={`badge badge-${item.type}`}>
                    {itemTypes.find(t => t.value === item.type)?.label || item.type}
                  </span>
                </div>
                <p className="item-desc">{item.description}</p>
                
                <div style={{marginTop: '0.5rem', marginBottom: '0.5rem'}}>
                  <label style={{display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', cursor: 'pointer'}}>
                    <input 
                      type="checkbox" 
                      checked={item.available !== false}
                      onChange={() => handleToggleAvailability(item)}
                    />
                    {item.available !== false ? <span style={{color: 'var(--success-color)'}}>Disponible</span> : <span style={{color: 'red', fontWeight: 'bold'}}>Agotado</span>}
                  </label>
                </div>

                <div className="item-footer">
                  {item.hasVariations ? (
                    <span className="item-price" style={{fontSize: '0.9rem'}}>Múltiples precios</span>
                  ) : (
                    <span className="item-price">L. {item.price.toFixed(2)}</span>
                  )}
                  <div className="item-actions">
                    <button onClick={() => handleEdit(item)} className="icon-btn edit-btn"><Edit2 size={18}/></button>
                    <button onClick={() => handleDelete(item.id, item.name)} className="icon-btn del-btn"><Trash2 size={18}/></button>
                  </div>
                </div>
              </div>
            ))}
            {filteredItems.length === 0 && (
               <p className="empty-msg" style={{gridColumn: '1 / -1'}}>No hay elementos en esta categoría.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
