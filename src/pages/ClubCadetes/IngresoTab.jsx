import { useState, useEffect, useRef } from 'react';
import { collection, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../firebase';
import { extraerPedidosClub } from '../../../utils/aiService';
import { toast } from 'sonner';
import { Upload, Plus, Trash2, Wand2, Loader2 } from 'lucide-react';

const YEARS = ['I año', 'II año', 'III año', 'IV año', 'Extra'];

export default function IngresoTab({ sessionId }) {
  const [menuItems, setMenuItems] = useState([]);
  const [draftOrders, setDraftOrders] = useState([]);
  
  // Para ingreso manual
  const [manualName, setManualName] = useState('');
  const [manualYear, setManualYear] = useState('I año');
  const [manualDishId, setManualDishId] = useState('');

  const [isProcessing, setIsProcessing] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const fileInputRef = useRef(null);

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
      id: Date.now().toString() + Math.random(),
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

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!menuItems || menuItems.length === 0) {
      return toast.error("No hay platillos en el menú del club. Crea menú primero.");
    }

    setIsScanning(true);
    const toastId = toast.loading("Analizando imagen con IA (Gemini)...");

    try {
      // Convertir a Base64
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        try {
          const base64Data = reader.result.split(',')[1];
          const resultJson = await extraerPedidosClub(base64Data, file.type, menuItems);
          
          if (!Array.isArray(resultJson)) throw new Error("Formato inválido devuelto por IA");

          // Mapear resultado a la estructura del draft
          const newDrafts = resultJson.map(item => {
            // Buscar si el dishName coincide con alguno de la base de datos
            const matchDish = menuItems.find(m => m.name.toLowerCase() === (item.dishName || '').toLowerCase());
            
            return {
              id: Date.now().toString() + Math.random(),
              cadetName: (item.cadetName || 'Desconocido').toUpperCase(),
              year: YEARS.includes(item.year) ? item.year : 'Extra',
              dishId: matchDish ? matchDish.id : '', // Vacío si no se encontró exacto
              dishName: matchDish ? matchDish.name : (item.dishName || 'Desconocido'),
              price: matchDish ? matchDish.price : 0,
              status: 'PENDING',
              hasError: !matchDish // Bandera para mostrar en rojo si hay que corregirlo manual
            };
          });

          setDraftOrders([...draftOrders, ...newDrafts]);
          toast.success(`Se encontraron ${newDrafts.length} pedidos`, { id: toastId });
        } catch (err) {
          console.error(err);
          toast.error("La IA no pudo procesar la imagen correctamente", { id: toastId });
        } finally {
          setIsScanning(false);
        }
      };
    } catch (error) {
      console.error(error);
      toast.error("Error leyendo archivo", { id: toastId });
      setIsScanning(false);
    }
  };

  const updateDraftDish = (id, newDishId) => {
    const dish = menuItems.find(m => m.id === newDishId);
    if (!dish) return;
    
    setDraftOrders(draftOrders.map(d => {
      if (d.id === id) {
        return { ...d, dishId: dish.id, dishName: dish.name, price: dish.price, hasError: false };
      }
      return d;
    }));
  };

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
          <input 
            type="file" 
            accept="image/*" 
            ref={fileInputRef} 
            style={{ display: 'none' }} 
            onChange={handleImageUpload}
          />
          <button 
            className="btn-secondary" 
            onClick={() => fileInputRef.current?.click()}
            disabled={isScanning}
            style={{ width: '100%', borderColor: 'var(--info-color)', color: 'var(--info-color)' }}
          >
            {isScanning ? <Loader2 size={18} className="spin" /> : <Upload size={18} />}
            {isScanning ? 'Analizando...' : 'Subir Imagen / Foto'}
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
            disabled={draftOrders.length === 0 || isProcessing || draftOrders.some(d => d.hasError)}
          >
            {isProcessing ? 'Enviando...' : draftOrders.some(d => d.hasError) ? 'Corrige los errores primero' : 'Confirmar y Enviar a Cocina'}
          </button>
        </div>
        
        <div className="table-container" style={{ flex: 1, overflowY: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Año</th>
                <th>Nombre Completo</th>
                <th>Platillo Detectado</th>
                <th style={{ textAlign: 'center' }}>Acción</th>
              </tr>
            </thead>
            <tbody>
              {draftOrders.length === 0 ? (
                <tr><td colSpan="4" style={{ textAlign: 'center', padding: '3rem' }}>El borrador está vacío. Ingresa pedidos manuales o usa la IA.</td></tr>
              ) : (
                draftOrders.map(order => (
                  <tr key={order.id} style={{ backgroundColor: order.hasError ? 'rgba(244, 67, 54, 0.1)' : 'transparent' }}>
                    <td><span className="badge">{order.year}</span></td>
                    <td style={{ fontWeight: 'bold' }}>{order.cadetName}</td>
                    <td>
                      {order.hasError ? (
                        <select 
                          className="input-field" 
                          style={{ borderColor: '#f44336', color: '#f44336', padding: '0.3rem' }}
                          onChange={(e) => updateDraftDish(order.id, e.target.value)}
                          value={order.dishId}
                        >
                          <option value="">¿Quisiste decir {order.dishName}?</option>
                          {menuItems.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                        </select>
                      ) : (
                        <span style={{ color: 'var(--primary-color)' }}>{order.dishName}</span>
                      )}
                    </td>
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
