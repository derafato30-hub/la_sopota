import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { collection, getDocs, doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { logAuditAction } from '../utils/auditLogger';
import { Calendar, Save, Sparkles } from 'lucide-react';
import './MenuDelDiaConfig.css';

export default function MenuDelDiaConfig() {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  
  // Catálogo completo de la base de datos
  const [catalogoCarnes, setCatalogoCarnes] = useState([]);
  const [catalogoAcompanantes, setCatalogoAcompanantes] = useState([]);
  const [catalogoSopas, setCatalogoSopas] = useState([]); // asumiendo que las sopas son platillos que se venden el día

  // Estado del menú del día de hoy
  const [todayDateStr, setTodayDateStr] = useState('');
  
  const [dailyConfig, setDailyConfig] = useState({
    carnesSeleccionadas: [],
    acompanantesSeleccionados: [],
    sopasSeleccionadas: [],
    precioCompleto: 120,
    precioMedio: 90,
    tortillasCompleto: 3,
    tortillasMedio: 2,
    acompanantesCompleto: 3, // Asumiendo 3 por defecto
    acompanantesMedio: 2,
    sopasInventario: {}
  });



  const [newItemName, setNewItemName] = useState('');
  const [newItemPrice, setNewItemPrice] = useState('');
  const [showNewItemModal, setShowNewItemModal] = useState(false);
  const [isSummaryExpanded, setIsSummaryExpanded] = useState(false);
  const [newItemType, setNewItemType] = useState('');
  const [editingItemId, setEditingItemId] = useState(null);

  // Estados para Búsqueda
  const [searchSopa, setSearchSopa] = useState('');
  const [searchCarne, setSearchCarne] = useState('');
  const [searchAcompanante, setSearchAcompanante] = useState('');

  // Historial de menús
  const [menuHistory, setMenuHistory] = useState([]);

  useEffect(() => {
    const today = new Date();
    const dateStr = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
    setTodayDateStr(dateStr);
    
    fetchCatalogAndTodayMenu(dateStr);
    fetchMenuHistory(dateStr);
  }, []);

  const fetchMenuHistory = async (todayStr) => {
    try {
      const { collection, getDocs, deleteDoc, doc } = await import('firebase/firestore');
      const querySnapshot = await getDocs(collection(db, 'dailyMenus'));
      
      const history = [];
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      for (const d of querySnapshot.docs) {
        const id = d.id; // Formato YYYY-MM-DD
        if (id === todayStr) continue; // No mostrar el de hoy en el historial
        
        const menuDate = new Date(id);
        // Si el menú tiene más de 30 días, lo borramos
        if (menuDate < thirtyDaysAgo) {
          await deleteDoc(doc(db, 'dailyMenus', id));
        } else {
          history.push({ id, ...d.data() });
        }
      }

      // Ordenar más recientes primero
      history.sort((a, b) => new Date(b.id) - new Date(a.id));
      setMenuHistory(history);

    } catch (error) {
      console.error("Error obteniendo historial:", error);
    }
  };

  const fetchCatalogAndTodayMenu = async (dateStr) => {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, 'menuItems'));
      const allItems = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      setCatalogoCarnes(allItems.filter(i => i.type === 'carne_menu_dia'));
      setCatalogoAcompanantes(allItems.filter(i => i.type === 'acompanante'));
      setCatalogoSopas(allItems.filter(i => i.type === 'sopa' || (i.type === 'platillo' && i.name.toLowerCase().includes('sopa'))));

      const menuRef = doc(db, 'dailyMenus', dateStr);
      const menuSnap = await getDoc(menuRef);
      if (menuSnap.exists()) {
        setDailyConfig(menuSnap.data());
      }
    } catch (error) {
      console.error("Error cargando el menú del día:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckboxChange = (type, itemId) => {
    setDailyConfig(prev => {
      const list = prev[type] || [];
      const updatedList = list.includes(itemId) ? list.filter(id => id !== itemId) : [...list, itemId];
      
      const newConfig = { ...prev, [type]: updatedList };
      
      // Si deseleccionamos una sopa, limpiamos su inventario
      if (type === 'sopasSeleccionadas' && !updatedList.includes(itemId)) {
         const newInv = { ...prev.sopasInventario };
         delete newInv[itemId];
         newConfig.sopasInventario = newInv;
      }
      return newConfig;
    });
  };

  const handleSoupInventoryChange = (sopaId, qty) => {
    setDailyConfig(prev => ({
      ...prev,
      sopasInventario: {
        ...(prev.sopasInventario || {}),
        [sopaId]: Number(qty)
      }
    }));
  };

  const handleSaveDailyMenu = async () => {
    const c = dailyConfig.carnesSeleccionadas?.length || 0;
    const a = dailyConfig.acompanantesSeleccionados?.length || 0;
    const s = dailyConfig.sopasSeleccionadas?.length || 0;

    if (c > 0 || a > 0) {
      if (c < 1) return toast.error("Si seleccionas acompañantes, debes seleccionar al menos 1 carne para el menú del día.");
      if (a < 3) return toast.error("Debes seleccionar al menos 3 acompañantes para el menú del día.");
    }

    if (c === 0 && a === 0 && s === 0) {
      return toast.error("El menú está vacío. Selecciona sopas o almuerzo.");
    }

    try {
      const menuRef = doc(db, 'dailyMenus', todayDateStr);
      await setDoc(menuRef, dailyConfig);
      await logAuditAction('CONFIGURAR_MENU_DIA', 'MENU', `Menú configurado para la fecha: ${todayDateStr}`, currentUser);
      toast.error('Menú del día guardado exitosamente.');
    } catch (error) {
      console.error("Error guardando el menú del día:", error);
    }
  };

  const solicitarPropuestaIA = () => {
    toast.error("Analizando tendencias de venta... (Integración Gemini configurada en el Dashboard)");
  };

  const openNewItemModal = (type, prefillName = '') => {
    setNewItemType(type);
    setNewItemName(prefillName);
    setNewItemPrice('');
    setEditingItemId(null);
    setShowNewItemModal(true);
  };

  const openEditModal = (item) => {
    setNewItemType(item.type);
    setNewItemName(item.name);
    setNewItemPrice(item.price || '');
    setEditingItemId(item.id);
    setShowNewItemModal(true);
  };

  const handleDeleteItem = async (id, name) => {
    if (window.confirm(`¿Seguro que deseas eliminar ${name}?`)) {
      try {
        const { doc, deleteDoc } = await import('firebase/firestore');
        await deleteDoc(doc(db, 'menuItems', id));
        fetchCatalogAndTodayMenu(todayDateStr);
      } catch (error) {
        console.error("Error eliminando elemento:", error);
      }
    }
  };

  const handleSaveNewItem = async (e) => {
    e.preventDefault();
    try {
      const { collection, addDoc, doc, updateDoc } = await import('firebase/firestore');
      const itemData = {
        name: newItemName,
        type: newItemType,
        price: Number(newItemPrice) || 0,
        available: true
      };
      
      if (editingItemId) {
        await updateDoc(doc(db, 'menuItems', editingItemId), itemData);
      } else {
        await addDoc(collection(db, 'menuItems'), itemData);
      }
      
      setShowNewItemModal(false);
      fetchCatalogAndTodayMenu(todayDateStr);
      toast.error('Elemento guardado exitosamente.');
    } catch (error) {
      console.error("Error guardando elemento:", error);
      toast.error("Hubo un error al guardar.");
    }
  };

  const handleToggleAvailability = async (item) => {
    try {
      const { doc, updateDoc } = await import('firebase/firestore');
      const newAvail = item.available === false ? true : false;
      await updateDoc(doc(db, 'menuItems', item.id), { available: newAvail });
      fetchCatalogAndTodayMenu(todayDateStr);
    } catch (error) {
      console.error("Error toggling availability:", error);
    }
  };

  // Filtrado de listas
  const filteredSopas = catalogoSopas.filter(s => s.name.toLowerCase().includes(searchSopa.toLowerCase()));
  const filteredCarnes = catalogoCarnes.filter(c => c.name.toLowerCase().includes(searchCarne.toLowerCase()));
  const filteredAcompanantes = catalogoAcompanantes.filter(a => a.name.toLowerCase().includes(searchAcompanante.toLowerCase()));

  // Funciones helper para mostrar nombres en el historial
  const getItemName = (id, catalogo) => {
    const item = catalogo.find(i => i.id === id);
    return item ? item.name : 'Desconocido';
  };

  if (loading) return <div className="card">Cargando configuración...</div>;

  const cLen = dailyConfig.carnesSeleccionadas?.length || 0;
  const aLen = dailyConfig.acompanantesSeleccionados?.length || 0;
  const sLen = dailyConfig.sopasSeleccionadas?.length || 0;

  return (
    <div className="daily-menu-container" style={{paddingBottom: '80px'}}>
      <div className="header-actions">
        <h1><Calendar size={28} style={{marginRight: '10px'}}/> Menú del Día: {todayDateStr}</h1>
        <div style={{display: 'flex', gap: '10px'}}>
          <button className="btn-secondary ai-btn" onClick={solicitarPropuestaIA}>
            <Sparkles size={18} /> Propuesta IA
          </button>
        </div>
      </div>

      <div className="selections-grid">
        {/* SOPAS */}
        <div className="card selection-section">
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem'}}>
            <h3 style={{border: 'none', margin: 0, padding: 0}}>Sopas Disponibles Hoy</h3>
            <button className="btn-secondary" style={{padding: '0.25rem 0.5rem', fontSize: '0.8rem'}} onClick={() => openNewItemModal('sopa')}>+ Nueva Sopa</button>
          </div>
          <input 
            type="text" 
            className="input-field" 
            placeholder="Buscar sopa..." 
            value={searchSopa}
            onChange={(e) => setSearchSopa(e.target.value)}
            style={{marginBottom: '1rem'}}
          />
          <div className="checkbox-list">
            {filteredSopas.map(sopa => {
              const isSelected = (dailyConfig.sopasSeleccionadas || []).includes(sopa.id);
              return (
                <div key={sopa.id} style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', backgroundColor: isSelected ? 'rgba(76, 175, 80, 0.1)' : 'transparent', padding: '0.5rem', borderRadius: '4px'}}>
                  <label className="checkbox-item" style={{flex: 1, margin: 0}}>
                    <input 
                      type="checkbox" 
                      checked={isSelected}
                      onChange={() => handleCheckboxChange('sopasSeleccionadas', sopa.id)}
                    />
                    <span>{sopa.name} - L.{sopa.price}</span>
                  </label>
                  
                  {isSelected && (
                    <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem', marginRight: '1rem'}}>
                      <span style={{fontSize: '0.85rem', color: 'var(--text-secondary)'}}>Cant. Preparada:</span>
                      <input 
                        type="number" 
                        min="0"
                        className="input-field" 
                        style={{width: '70px', padding: '0.2rem'}}
                        value={(dailyConfig.sopasInventario || {})[sopa.id] || 0}
                        onChange={(e) => handleSoupInventoryChange(sopa.id, e.target.value)}
                      />
                    </div>
                  )}

                  <div style={{display: 'flex', gap: '0.25rem'}}>
                    <button className="btn-secondary" style={{padding: '0.2rem 0.4rem', fontSize: '0.75rem', backgroundColor: sopa.available !== false ? 'var(--success-color)' : 'red', color: 'white', border: 'none'}} onClick={() => handleToggleAvailability(sopa)}>
                      {sopa.available !== false ? 'Disp' : 'Agotado'}
                    </button>
                    <button className="btn-secondary" style={{padding: '0.2rem 0.4rem', fontSize: '0.75rem'}} onClick={() => openEditModal(sopa)}>✎</button>
                    <button className="btn-secondary" style={{padding: '0.2rem 0.4rem', fontSize: '0.75rem', color: 'red', borderColor: 'red'}} onClick={() => handleDeleteItem(sopa.id, sopa.name)}>✕</button>
                  </div>
                </div>
              );
            })}
            {filteredSopas.length === 0 && (
              <div style={{marginTop: '1rem', textAlign: 'center'}}>
                <p className="empty-msg" style={{margin: '0 0 0.5rem 0'}}>No se encontraron sopas.</p>
                {searchSopa && (
                  <button className="btn-secondary" style={{padding: '0.4rem 0.8rem', fontSize: '0.85rem'}} onClick={() => openNewItemModal('sopa', searchSopa)}>
                    + Crear "{searchSopa}" como sopa
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* CARNES */}
        <div className="card selection-section">
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem'}}>
            <h3 style={{border: 'none', margin: 0, padding: 0}}>Carnes Disponibles Hoy</h3>
            <button className="btn-secondary" style={{padding: '0.25rem 0.5rem', fontSize: '0.8rem'}} onClick={() => openNewItemModal('carne_menu_dia')}>+ Nueva Carne</button>
          </div>
          <input 
            type="text" 
            className="input-field" 
            placeholder="Buscar carne..." 
            value={searchCarne}
            onChange={(e) => setSearchCarne(e.target.value)}
            style={{marginBottom: '1rem'}}
          />
          <div className="checkbox-list">
            {filteredCarnes.map(carne => (
              <div key={carne.id} style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem'}}>
                <label className="checkbox-item" style={{flex: 1, margin: 0}}>
                  <input 
                    type="checkbox" 
                    checked={(dailyConfig.carnesSeleccionadas || []).includes(carne.id)}
                    onChange={() => handleCheckboxChange('carnesSeleccionadas', carne.id)}
                  />
                  <span>{carne.name}</span>
                </label>
                <div style={{display: 'flex', gap: '0.25rem'}}>
                  <button className="btn-secondary" style={{padding: '0.2rem 0.4rem', fontSize: '0.75rem', backgroundColor: carne.available !== false ? 'var(--success-color)' : 'red', color: 'white', border: 'none'}} onClick={() => handleToggleAvailability(carne)}>
                    {carne.available !== false ? 'Disp' : 'Agotado'}
                  </button>
                  <button className="btn-secondary" style={{padding: '0.2rem 0.4rem', fontSize: '0.75rem'}} onClick={() => openEditModal(carne)}>✎</button>
                  <button className="btn-secondary" style={{padding: '0.2rem 0.4rem', fontSize: '0.75rem', color: 'red', borderColor: 'red'}} onClick={() => handleDeleteItem(carne.id, carne.name)}>✕</button>
                </div>
              </div>
            ))}
            {filteredCarnes.length === 0 && (
              <div style={{marginTop: '1rem', textAlign: 'center'}}>
                <p className="empty-msg" style={{margin: '0 0 0.5rem 0'}}>No se encontraron carnes.</p>
                {searchCarne && (
                  <button className="btn-secondary" style={{padding: '0.4rem 0.8rem', fontSize: '0.85rem'}} onClick={() => openNewItemModal('carne_menu_dia', searchCarne)}>
                    + Crear "{searchCarne}" como carne
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ACOMPAÑANTES */}
        <div className="card selection-section">
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem'}}>
            <h3 style={{border: 'none', margin: 0, padding: 0}}>Acompañantes Disponibles Hoy</h3>
            <button className="btn-secondary" style={{padding: '0.25rem 0.5rem', fontSize: '0.8rem'}} onClick={() => openNewItemModal('acompanante')}>+ Nuevo Acompañante</button>
          </div>
          <input 
            type="text" 
            className="input-field" 
            placeholder="Buscar acompañante..." 
            value={searchAcompanante}
            onChange={(e) => setSearchAcompanante(e.target.value)}
            style={{marginBottom: '1rem'}}
          />
          <div className="checkbox-list">
            {filteredAcompanantes.map(acom => (
              <div key={acom.id} style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem'}}>
                <label className="checkbox-item" style={{flex: 1, margin: 0}}>
                  <input 
                    type="checkbox" 
                    checked={(dailyConfig.acompanantesSeleccionados || []).includes(acom.id)}
                    onChange={() => handleCheckboxChange('acompanantesSeleccionados', acom.id)}
                  />
                  <span>{acom.name}</span>
                </label>
                <div style={{display: 'flex', gap: '0.25rem'}}>
                  <button className="btn-secondary" style={{padding: '0.2rem 0.4rem', fontSize: '0.75rem', backgroundColor: acom.available !== false ? 'var(--success-color)' : 'red', color: 'white', border: 'none'}} onClick={() => handleToggleAvailability(acom)}>
                    {acom.available !== false ? 'Disp' : 'Agotado'}
                  </button>
                  <button className="btn-secondary" style={{padding: '0.2rem 0.4rem', fontSize: '0.75rem'}} onClick={() => openEditModal(acom)}>✎</button>
                  <button className="btn-secondary" style={{padding: '0.2rem 0.4rem', fontSize: '0.75rem', color: 'red', borderColor: 'red'}} onClick={() => handleDeleteItem(acom.id, acom.name)}>✕</button>
                </div>
              </div>
            ))}
            {filteredAcompanantes.length === 0 && (
              <div style={{marginTop: '1rem', textAlign: 'center'}}>
                <p className="empty-msg" style={{margin: '0 0 0.5rem 0'}}>No se encontraron acompañantes.</p>
                {searchAcompanante && (
                  <button className="btn-secondary" style={{padding: '0.4rem 0.8rem', fontSize: '0.85rem'}} onClick={() => openNewItemModal('acompanante', searchAcompanante)}>
                    + Crear "{searchAcompanante}" como acompañante
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="card config-card" style={{marginTop: '1rem'}}>
        <h2>Estructura del Plato</h2>
        <div className="daily-prices-grid">
          <div className="form-group">
            <label>Precio Plato Completo (L.)</label>
            <input type="number" className="input-field" value={dailyConfig.precioCompleto} onChange={e => setDailyConfig({...dailyConfig, precioCompleto: Number(e.target.value)})} />
          </div>
          <div className="form-group">
            <label>Cant. Acompañantes (Completo)</label>
            <input type="number" className="input-field" value={dailyConfig.acompanantesCompleto} onChange={e => setDailyConfig({...dailyConfig, acompanantesCompleto: Number(e.target.value)})} />
          </div>
          <div className="form-group">
            <label>Cant. Tortillas (Completo)</label>
            <input type="number" className="input-field" value={dailyConfig.tortillasCompleto} onChange={e => setDailyConfig({...dailyConfig, tortillasCompleto: Number(e.target.value)})} />
          </div>

          <div className="form-group">
            <label>Precio Medio Plato (L.)</label>
            <input type="number" className="input-field" value={dailyConfig.precioMedio} onChange={e => setDailyConfig({...dailyConfig, precioMedio: Number(e.target.value)})} />
          </div>
          <div className="form-group">
            <label>Cant. Acompañantes (Medio)</label>
            <input type="number" className="input-field" value={dailyConfig.acompanantesMedio} onChange={e => setDailyConfig({...dailyConfig, acompanantesMedio: Number(e.target.value)})} />
          </div>
          <div className="form-group">
            <label>Cant. Tortillas (Medio)</label>
            <input type="number" className="input-field" value={dailyConfig.tortillasMedio} onChange={e => setDailyConfig({...dailyConfig, tortillasMedio: Number(e.target.value)})} />
          </div>
        </div>
      </div>

      {/* SECCIÓN HISTORIAL */}
      <div className="card history-section" style={{marginTop: '1rem'}}>
        <h2 style={{borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', color: 'var(--primary-color)'}}>
          Historial de Menús (Últimos 30 días)
        </h2>
        {menuHistory.length === 0 ? (
          <p className="empty-msg" style={{marginTop: '1rem'}}>No hay registros de días anteriores.</p>
        ) : (
          <div style={{display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem'}}>
            {menuHistory.map(hist => (
              <div key={hist.id} style={{backgroundColor: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '8px', borderLeft: '4px solid var(--accent-color)'}}>
                <h3 style={{marginTop: 0, color: 'var(--text-primary)'}}>Fecha: {hist.id}</h3>
                <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem'}}>
                  <div>
                    <strong style={{color: 'var(--text-secondary)'}}>Sopas:</strong>
                    <ul style={{margin: '0.25rem 0 0 1rem', padding: 0}}>
                      {(hist.sopasSeleccionadas || []).map(id => <li key={id}>{getItemName(id, catalogoSopas)}</li>)}
                    </ul>
                  </div>
                  <div>
                    <strong style={{color: 'var(--text-secondary)'}}>Carnes:</strong>
                    <ul style={{margin: '0.25rem 0 0 1rem', padding: 0}}>
                      {(hist.carnesSeleccionadas || []).map(id => <li key={id}>{getItemName(id, catalogoCarnes)}</li>)}
                    </ul>
                  </div>
                  <div>
                    <strong style={{color: 'var(--text-secondary)'}}>Acompañantes:</strong>
                    <ul style={{margin: '0.25rem 0 0 1rem', padding: 0}}>
                      {(hist.acompanantesSeleccionados || []).map(id => <li key={id}>{getItemName(id, catalogoAcompanantes)}</li>)}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showNewItemModal && (
        <div className="modal-overlay">
          <div className="modal-card card">
            <h2>{editingItemId ? 'Editar' : 'Agregar'} {newItemType === 'sopa' ? 'Sopa' : newItemType === 'acompanante' ? 'Acompañante' : 'Carne'}</h2>
            <form onSubmit={handleSaveNewItem} className="modal-form">
              <div className="form-group">
                <label>Nombre del Elemento</label>
                <input type="text" className="input-field" required 
                  value={newItemName} onChange={e => setNewItemName(e.target.value)} 
                />
              </div>
              <div className="form-group">
                <label>Precio (L.) - Usado para cobrar extras</label>
                <input type="number" className="input-field" required min="0" step="0.01"
                  value={newItemPrice} onChange={e => setNewItemPrice(e.target.value)} 
                />
              </div>
              <div className="form-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowNewItemModal(false)}>Cancelar</button>
                <button type="submit" className="btn-primary">Guardar al Catálogo</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Floating Summary Expandable Drawer */}
      <div style={{
        position: 'fixed', bottom: 0, left: 'var(--sidebar-width)', right: 0, 
        backgroundColor: 'var(--surface-color)', borderTop: '2px solid var(--accent-color)', 
        boxShadow: '0 -10px 30px rgba(0,0,0,0.5)', zIndex: 50,
        transition: 'all 0.3s cubic-bezier(0.32, 0.72, 0, 1)'
      }}>
        {isSummaryExpanded && (
          <div style={{padding: '2rem', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '2rem', borderBottom: '1px solid rgba(255,255,255,0.05)', maxHeight: '40vh', overflowY: 'auto'}}>
            <div>
              <h4 style={{color: 'var(--text-secondary)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem'}}><CheckCircle size={16} color="var(--primary-color)"/> Sopas Seleccionadas ({sLen})</h4>
              {selectedSopasNames.length === 0 ? <p style={{color: '#666', fontStyle: 'italic'}}>Ninguna</p> : (
                <ul style={{listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem'}}>
                  {selectedSopasNames.map((n, i) => <li key={i} style={{padding: '0.5rem', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '4px', fontSize: '0.95rem'}}>{n}</li>)}
                </ul>
              )}
            </div>
            <div>
              <h4 style={{color: 'var(--text-secondary)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem'}}><CheckCircle size={16} color="var(--primary-color)"/> Carnes Seleccionadas ({cLen})</h4>
              {selectedCarnesNames.length === 0 ? <p style={{color: '#666', fontStyle: 'italic'}}>Ninguna</p> : (
                <ul style={{listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem'}}>
                  {selectedCarnesNames.map((n, i) => <li key={i} style={{padding: '0.5rem', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '4px', fontSize: '0.95rem'}}>{n}</li>)}
                </ul>
              )}
            </div>
            <div>
              <h4 style={{color: 'var(--text-secondary)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem'}}><CheckCircle size={16} color="var(--primary-color)"/> Acompañantes Seleccionados ({aLen})</h4>
              {selectedAcompsNames.length === 0 ? <p style={{color: '#666', fontStyle: 'italic'}}>Ninguno</p> : (
                <ul style={{listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem'}}>
                  {selectedAcompsNames.map((n, i) => <li key={i} style={{padding: '0.5rem', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '4px', fontSize: '0.95rem'}}>{n}</li>)}
                </ul>
              )}
            </div>
          </div>
        )}

        <div style={{
          padding: '1rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        }}>
          <div style={{display: 'flex', alignItems: 'center', gap: '2rem'}}>
            <button onClick={() => setIsSummaryExpanded(!isSummaryExpanded)} className="btn-secondary" style={{display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: isSummaryExpanded ? 'rgba(255,255,255,0.1)' : 'transparent', border: '1px solid rgba(255,255,255,0.2)'}}>
              {isSummaryExpanded ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
              {isSummaryExpanded ? 'Ocultar Resumen' : 'Ver Resumen Detallado'}
            </button>
            <div style={{display: 'flex', gap: '1.5rem', fontSize: '1.05rem'}}>
              <div><strong>🍲 Sopas:</strong> <span style={{color: sLen > 0 ? 'var(--primary-color)' : 'inherit'}}>{sLen}</span></div>
              <div><strong>🥩 Carnes:</strong> <span style={{color: cLen > 0 ? 'var(--primary-color)' : 'inherit'}}>{cLen}</span></div>
              <div><strong>🥗 Acomps:</strong> <span style={{color: aLen >= 3 ? 'var(--primary-color)' : 'inherit'}}>{aLen}</span> {aLen > 0 && aLen < 3 && <span style={{color: '#FF5252', fontSize: '0.85rem'}}>(Faltan {3-aLen})</span>}</div>
            </div>
          </div>
          <button 
            className="btn-primary" 
            style={{padding: '0.75rem 2rem', fontSize: '1.1rem', boxShadow: '0 4px 15px rgba(249, 115, 22, 0.4)'}}
            onClick={handleSaveDailyMenu}
          >
            <Save size={20} style={{marginRight: '8px', verticalAlign: 'middle'}} />
            Confirmar y Guardar Menú
          </button>
        </div>
      </div>

    </div>
  );
}
