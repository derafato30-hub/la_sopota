import { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import { toast } from 'sonner';
import { Upload, Plus, Trash2, Wand2 } from 'lucide-react';

const YEARS = ['I año', 'II año', 'III año', 'IV año', 'Extra'];

export default function IngresoTab({ sessionId }) {
  const [menuItems, setMenuItems] = useState([]);
  const [draftOrders, setDraftOrders] = useState([]);
  
  // Para ingreso manual
  const [manualName, setManualName] = useState('');
  const [manualYear, setManualYear] = useState('I año');
  const [manualDishId, setManualDishId] = useState('');

  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    fetchMenu();
  }, []);

  const fetchMenu = async () => {
    try {
      const snap = await getDocs(collection(db, 'clubMenuItems'));
      const list = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() }));
      setMenuItems(list.sort((a,b) => a.name.localeCompare(b.name)));
    } catch (e) {
      console.error(e);
      toast.error('Error cargando menú');
    }
  };

  const handleAddManual = (e) => {
    e.preventDefault();
    if (!manualName || !manualDishId) return toast.error("Llena nombre y platillo");

    const dish = menuItems.find(m => m.id === manualDishId);
    if (!dish) return;

    setDraftOrders([...draftOrders, {
      id: Date.now().toString(),
      cadetName: manualName.trim().toUpperCase(),
      year: manualYear,
      dishId: dish.id,
      dishName: dish.name,
      price: dish.price,
      status: 'PENDING'
    }]);

    setManualName('');
    toast.success("Agregado al borrador");
  };

  const removeDraft = (id) => {
    setDraftOrders(draftOrders.filter(d => d.id !== id));
  };

  const handleSaveToDB = async () => {
    if (draftOrders.length === 0) return toast.error("El borrador está vacío");
    setIsProcessing(true);

    try {
      const promises = draftOrders.map(order => {
        return addDoc(collection(db, 'clubOrders'), {
          sessionId,
          cadetName: order.cadetName,
          year: order.year,
          dishId: order.dishId,
          dishName: order.dishName,
          price: order.price,
          status: 'PENDING',
          createdAt: serverTimestamp()
        });
      });

      await Promise.all(promises);
      toast.success(`${draftOrders.length} pedidos enviados a la cocina`);
      setDraftOrders([]);
    } catch (error) {
      console.error(error);
      toast.error("Error al guardar en base de datos");
    } finally {
      setIsProcessing(false);
    }
  };

  // Funciones de IA estarán aquí después

  return (
    <div style={{ display: 'flex', gap: '2rem', height: '100%' }}>
      
      {/* Panel Izquierdo: Ingreso Manual y Botón IA */}
      <div style={{ flex: '1', display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '350px' }}>
        
        {/* IA Card */}
        <div className="card" style={{ border: '1px solid var(--info-color)' }}>
          <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--info-color)' }}>
            <Wand2 size={20} />
            Escaneo por IA
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
            Sube una foto del cuaderno o captura de excel. La IA detectará los nombres, el platillo y el año.
          </p>
          <button className="btn-secondary" style={{ width: '100%', borderColor: 'var(--info-color)', color: 'var(--info-color)' }}>
            <Upload size={18} />
            Subir Imagen / Foto
          </button>
        </div>

        {/* Manual Card */}
        <div className="card" style={{ flex: 1 }}>
          <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Plus size={20} />
            Ingreso Manual
          </h3>
          <form onSubmit={handleAddManual} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.3rem', display: 'block' }}>Nombre (Apellidos, Nombres)</label>
              <input 
                type="text" 
                className="input-field" 
                value={manualName}
                onChange={e => setManualName(e.target.value)}
                required
              />
            </div>
            <div>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.3rem', display: 'block' }}>Año</label>
              <select className="input-field" value={manualYear} onChange={e => setManualYear(e.target.value)}>
                {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.3rem', display: 'block' }}>Platillo</label>
              <select className="input-field" value={manualDishId} onChange={e => setManualDishId(e.target.value)} required>
                <option value="">-- Seleccionar Plato --</option>
                {menuItems.map(m => <option key={m.id} value={m.id}>{m.name} (L. {m.price})</option>)}
              </select>
            </div>
            <button type="submit" className="btn-secondary" style={{ marginTop: '0.5rem' }}>
              Añadir al Borrador
            </button>
          </form>
        </div>

      </div>

      {/* Panel Derecho: Borrador */}
      <div className="card" style={{ flex: '2', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3>Borrador ({draftOrders.length})</h3>
          <button 
            className="btn-primary" 
            onClick={handleSaveToDB}
            disabled={draftOrders.length === 0 || isProcessing}
          >
            {isProcessing ? 'Enviando...' : 'Confirmar y Enviar a Cocina'}
          </button>
        </div>
        
        <div className="table-container" style={{ flex: 1, overflowY: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Año</th>
                <th>Nombre Completo</th>
                <th>Platillo</th>
                <th style={{ textAlign: 'center' }}>Acción</th>
              </tr>
            </thead>
            <tbody>
              {draftOrders.length === 0 ? (
                <tr><td colSpan="4" style={{ textAlign: 'center', padding: '3rem' }}>El borrador está vacío. Ingresa pedidos manuales o usa la IA.</td></tr>
              ) : (
                draftOrders.map(order => (
                  <tr key={order.id}>
                    <td><span className="badge">{order.year}</span></td>
                    <td style={{ fontWeight: 'bold' }}>{order.cadetName}</td>
                    <td style={{ color: 'var(--primary-color)' }}>{order.dishName}</td>
                    <td style={{ textAlign: 'center' }}>
                      <button className="btn-secondary" style={{ padding: '0.3rem', color: '#f44336', border: 'none' }} onClick={() => removeDraft(order.id)}>
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
