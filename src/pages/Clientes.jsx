import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { collection, getDocs, addDoc, doc, updateDoc, setDoc, serverTimestamp, getDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { logAuditAction } from '../utils/auditLogger';
import { printReceipt, printInvoice } from '../utils/printService';
import { Users, Plus, DollarSign, Search, Printer, Edit, Trash2 } from 'lucide-react';
import './Clientes.css';

export default function Clientes() {
  const { currentUser } = useAuth();
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterActiveCredit, setFilterActiveCredit] = useState(false);

  // Estados del modal/formulario
  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    rtn: '',
    razonSocial: '',
    cumpleanios: '',
    creditBalance: 0
  });
  
  // Estado para el abono de crédito
  const [showCreditModal, setShowCreditModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [abonoAmount, setAbonoAmount] = useState(0);
  const [abonoMethod, setAbonoMethod] = useState('EFECTIVO');
  const [abonoBank, setAbonoBank] = useState('Banpais');
  
  // Ver historial de facturas
  const [showInvoicesModal, setShowInvoicesModal] = useState(false);
  const [clientInvoices, setClientInvoices] = useState([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);

  useEffect(() => {
    fetchClientes();
  }, []);

  const fetchClientes = async () => {
    try {
      setLoading(true);
      const querySnapshot = await getDocs(collection(db, 'clients'));
      const clientsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setClientes(clientsData);
    } catch (error) {
      console.error("Error fetching clients:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveClient = async (e) => {
    e.preventDefault();
    try {
      if (editMode && editingId) {
        await updateDoc(doc(db, 'clients', editingId), formData);
        await logAuditAction('EDITAR_CLIENTE', 'CLIENTES', `Cliente editado: ${formData.name}`, currentUser);
        toast.success("Cliente actualizado");
      } else {
        await addDoc(collection(db, 'clients'), {
          ...formData,
          createdAt: serverTimestamp()
        });
        await logAuditAction('NUEVO_CLIENTE', 'CLIENTES', `Cliente registrado: ${formData.name}`, currentUser);
        toast.success("Cliente guardado");
      }
      setShowModal(false);
      setEditMode(false);
      setEditingId(null);
      setFormData({ name: '', phone: '', rtn: '', razonSocial: '', cumpleanios: '', creditBalance: 0 });
      fetchClientes();
    } catch (error) {
      console.error("Error saving client:", error);
      toast.error("Error al guardar cliente");
    }
  };

  const handleDeleteClient = async (id, name) => {
    if (!window.confirm(`¿Estás seguro de que deseas eliminar permanentemente al cliente ${name}?`)) return;
    try {
      await deleteDoc(doc(db, 'clients', id));
      await logAuditAction('ELIMINAR_CLIENTE', 'CLIENTES', `Cliente eliminado: ${name}`, currentUser);
      toast.success("Cliente eliminado");
      fetchClientes();
    } catch (error) {
      console.error("Error deleting client:", error);
      toast.error("Error al eliminar cliente");
    }
  };

  const handleAbono = async (e) => {
    e.preventDefault();
    if (abonoAmount <= 0) return toast.error("El abono debe ser mayor a 0");
    
    try {
      // LOGICA DE ABONO A FACTURAS (FIFO)
      const snap = await getDocs(collection(db, 'invoices'));
      const pendingInvoices = snap.docs
        .map(d => ({ firebaseId: d.id, ...d.data() }))
        .filter(i => i.clienteId === selectedClient.id && i.estado === 'CRÉDITO')
        .sort((a,b) => (a.createdAt?.toMillis() || 0) - (b.createdAt?.toMillis() || 0));
        
      let remainingAbono = abonoAmount;
      for (const inv of pendingInvoices) {
         if (remainingAbono <= 0) break;
         const saldo = inv.saldoPendiente !== undefined ? inv.saldoPendiente : inv.total;
         if (saldo <= 0) continue;

         if (remainingAbono >= saldo) {
            remainingAbono -= saldo;
            await updateDoc(doc(db, 'invoices', inv.firebaseId), {
               estado: 'PAGADA',
               saldoPendiente: 0
            });
         } else {
            await updateDoc(doc(db, 'invoices', inv.firebaseId), {
               saldoPendiente: saldo - remainingAbono
            });
            remainingAbono = 0;
         }
      }

      const newBalance = (selectedClient.creditBalance || 0) - abonoAmount;
      const clientRef = doc(db, 'clients', selectedClient.id);
      
      await updateDoc(clientRef, { creditBalance: newBalance });
      
      // Crear Recibo (Metadata)
      const metaRef = doc(db, 'metadata', 'receipts');
      const metaSnap = await getDoc(metaRef);
      let nextNum = 1;
      if (metaSnap.exists()) {
        nextNum = metaSnap.data().lastCorrelative + 1;
      }
      const receiptId = `REC-${String(nextNum).padStart(4, '0')}`;
      
      const newReceipt = {
        id: receiptId,
        clienteId: selectedClient.id,
        clientName: selectedClient.name,
        amount: abonoAmount,
        oldBalance: selectedClient.creditBalance || 0,
        newBalance: newBalance,
        metodoPago: abonoMethod,
        paymentBank: abonoMethod === 'TRANSFERENCIA' ? abonoBank : null,
        createdBy: currentUser.uid,
        createdAt: serverTimestamp()
      };
      
      await setDoc(doc(db, 'receipts', receiptId), newReceipt);
      await setDoc(metaRef, { lastCorrelative: nextNum });

      await logAuditAction('ABONO_CREDITO', 'CLIENTES', `Abono de L. ${abonoAmount} por ${selectedClient.name} (${abonoMethod}). Recibo: ${receiptId}`, currentUser);
      
      setShowCreditModal(false);
      setAbonoAmount(0);
      setAbonoMethod('EFECTIVO');
      fetchClientes();
      
      // Print immediate receipt using the service
      printReceipt({ ...newReceipt, createdAt: { toDate: () => new Date() } });
      
    } catch (error) {
      console.error("Error registrando abono:", error);
    }
  };

  const handleViewInvoices = async (cliente) => {
    setSelectedClient(cliente);
    setShowInvoicesModal(true);
    setLoadingInvoices(true);
    try {
      // Usar query básico, filtramos en cliente
      const snap = await getDocs(collection(db, 'invoices'));
      const data = snap.docs.map(doc => ({ firebaseId: doc.id, ...doc.data() })).filter(i => i.clienteId === cliente.id);
      data.sort((a,b) => b.createdAt?.toMillis() - a.createdAt?.toMillis());
      setClientInvoices(data);
    } catch(e) {
      console.error(e);
    } finally {
      setLoadingInvoices(false);
    }
  };

  const handlePrintInvoice = (invoice) => {
    printInvoice(invoice);
  };

  const filteredClientes = clientes.filter(c => {
    const matchesSearch = (c.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
      (c.rtn || '').includes(searchTerm) || 
      (c.phone || '').includes(searchTerm) || 
      (c.razonSocial || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    if (filterActiveCredit) {
      return matchesSearch && (c.creditBalance > 0);
    }
    return matchesSearch;
  });

  const handleSyncBalances = async () => {
    if (!window.confirm("¿Deseas recalcular los saldos de todos los clientes basándote en sus facturas pendientes? Esto corregirá cualquier inconsistencia.")) return;
    try {
      setLoading(true);
      const snapInvoices = await getDocs(collection(db, 'invoices'));
      const pendingInvoices = snapInvoices.docs
        .map(d => d.data())
        .filter(i => i.estado === 'CRÉDITO');
      
      const clientDebts = {};
      pendingInvoices.forEach(inv => {
        if (!inv.clienteId) return;
        const saldo = inv.saldoPendiente !== undefined ? inv.saldoPendiente : inv.total;
        if (saldo > 0) {
           clientDebts[inv.clienteId] = (clientDebts[inv.clienteId] || 0) + saldo;
        }
      });
      
      for (const cliente of clientes) {
        const correctDebt = clientDebts[cliente.id] || 0;
        if (cliente.creditBalance !== correctDebt) {
          await updateDoc(doc(db, 'clients', cliente.id), { creditBalance: correctDebt });
        }
      }
      toast.error("¡Saldos sincronizados correctamente!");
      fetchClientes();
    } catch (error) {
      console.error(error);
      toast.error("Error al sincronizar saldos");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="clientes-container">
      <div className="clientes-header">
        <h1><Users size={28} /> Directorio de Clientes</h1>
        <div style={{display: 'flex', gap: '1rem'}}>
          <button className="btn-secondary" onClick={handleSyncBalances}>
            Sincronizar Saldos
          </button>
          <button className="btn-primary new-client-btn" onClick={() => { setEditMode(false); setEditingId(null); setFormData({ name: '', phone: '', rtn: '', razonSocial: '', cumpleanios: '', creditBalance: 0 }); setShowModal(true); }}>
            <Plus size={18} /> Nuevo Cliente
          </button>
        </div>
      </div>

      <div className="search-bar" style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, display: 'flex', alignItems: 'center' }}>
          <Search size={20} color="var(--text-secondary)" style={{ position: 'absolute', left: '1rem' }} />
          <input 
            type="text" 
            placeholder="Buscar por nombre, teléfono, RTN o Razón Social..." 
            className="input-field search-input"
            style={{ paddingLeft: '3rem', width: '100%' }}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', backgroundColor: 'var(--card-bg)', padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
          <input 
            type="checkbox" 
            checked={filterActiveCredit}
            onChange={(e) => setFilterActiveCredit(e.target.checked)}
          />
          <span style={{ fontWeight: 'bold' }}>Con saldo pendiente</span>
        </label>
      </div>

      <div className="clientes-grid">
        {loading ? <p>Cargando clientes...</p> : (
          filteredClientes.map(cliente => (
            <div key={cliente.id} className="card cliente-card">
              <div className="cliente-info">
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'}}>
                  <h3>{cliente.name}</h3>
                  <div style={{display: 'flex', gap: '0.5rem'}}>
                    <button className="icon-btn" style={{color: 'var(--text-secondary)'}} title="Editar Cliente" onClick={() => {
                      setEditMode(true);
                      setEditingId(cliente.id);
                      setFormData({
                        name: cliente.name || '',
                        phone: cliente.phone || '',
                        rtn: cliente.rtn || '',
                        razonSocial: cliente.razonSocial || '',
                        cumpleanios: cliente.cumpleanios || '',
                        creditBalance: cliente.creditBalance || 0
                      });
                      setShowModal(true);
                    }}>
                      <Edit size={16} />
                    </button>
                    <button className="icon-btn" style={{color: '#FF5252'}} title="Eliminar Cliente" onClick={() => handleDeleteClient(cliente.id, cliente.name)}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                <p>Tel: {cliente.phone || 'N/A'}</p>
                {cliente.rtn && <p style={{fontSize: '0.85rem', color: 'var(--text-secondary)'}}>RTN: {cliente.rtn}</p>}
                {cliente.cumpleanios && <p style={{fontSize: '0.85rem', color: 'var(--text-secondary)'}}>🎂 {cliente.cumpleanios}</p>}
              </div>
              
              <div className="cliente-credit">
                <span>Deuda Actual:</span>
                <h2 className={cliente.creditBalance > 0 ? 'debt-active' : 'debt-clear'}>
                  L. {(cliente.creditBalance || 0).toFixed(2)}
                </h2>
              </div>
              
              <div className="cliente-actions" style={{display: 'flex', gap: '0.5rem', flexWrap: 'wrap'}}>
                <button 
                  className="btn-secondary" 
                  style={{flex: 1}}
                  onClick={() => handleViewInvoices(cliente)}
                >
                  <Search size={16} /> Facturas
                </button>
                <button 
                  className="btn-primary" 
                  style={{flex: 1}}
                  disabled={!cliente.creditBalance || cliente.creditBalance <= 0}
                  onClick={() => { setSelectedClient(cliente); setShowCreditModal(true); }}
                >
                  <DollarSign size={16} /> Abonar
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal Nuevo Cliente */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-card card" style={{maxWidth: '500px'}}>
            <h2>{editMode ? 'Editar Cliente' : 'Registrar Nuevo Cliente'}</h2>
            <form onSubmit={handleSaveClient} className="modal-form">
              <div className="form-group">
                <label>Nombre del Cliente</label>
                <input type="text" className="input-field" required 
                  value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} 
                />
              </div>
              <div className="form-group">
                <label>Teléfono (Opcional)</label>
                <input type="text" className="input-field" 
                  value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} 
                />
              </div>
              <div className="form-group">
                <label>RTN (Opcional)</label>
                <input type="text" className="input-field" 
                  value={formData.rtn} onChange={e => setFormData({...formData, rtn: e.target.value})} 
                />
              </div>
              <div className="form-group">
                <label>Razón Social (Opcional)</label>
                <input type="text" className="input-field" 
                  value={formData.razonSocial} onChange={e => setFormData({...formData, razonSocial: e.target.value})} 
                />
              </div>
              <div className="form-group">
                <label>Cumpleaños (Opcional)</label>
                <input type="date" className="input-field" 
                  value={formData.cumpleanios} onChange={e => setFormData({...formData, cumpleanios: e.target.value})} 
                />
              </div>
              <div className="form-actions">
                <button type="button" className="btn-secondary" onClick={() => { setShowModal(false); setEditMode(false); setEditingId(null); setFormData({ name: '', phone: '', rtn: '', razonSocial: '', cumpleanios: '', creditBalance: 0 }); }}>Cancelar</button>
                <button type="submit" className="btn-primary">Guardar Cliente</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Abono a Crédito */}
      {showCreditModal && selectedClient && (
        <div className="modal-overlay">
          <div className="modal-card card">
            <h2>Abonar a Crédito</h2>
            <p>Cliente: <strong>{selectedClient.name}</strong></p>
            <p>Deuda Total: <strong>L. {(selectedClient.creditBalance || 0).toFixed(2)}</strong></p>
            
            <form onSubmit={handleAbono} className="modal-form">
              <div className="form-group">
                <label>Monto a Abonar (L.)</label>
                <input type="number" className="input-field" required min="1" step="0.01" max={selectedClient.creditBalance}
                  value={abonoAmount} onChange={e => setAbonoAmount(Number(e.target.value))} 
                />
              </div>

              <div className="form-group">
                <label>Método de Pago</label>
                <select className="input-field" value={abonoMethod} onChange={e => setAbonoMethod(e.target.value)}>
                  <option value="EFECTIVO">Efectivo</option>
                  <option value="TRANSFERENCIA">Transferencia</option>
                </select>
              </div>

              {abonoMethod === 'TRANSFERENCIA' && (
                <div className="form-group">
                  <label>Banco de Destino</label>
                  <select className="input-field" value={abonoBank} onChange={e => setAbonoBank(e.target.value)}>
                    <option value="Bac Antony">Bac Antony</option>
                    <option value="Bac Delmy">Bac Delmy</option>
                    <option value="Bac Elmer">Bac Elmer</option>
                    <option value="Banpais">Banpais</option>
                    <option value="Atlantida">Atlantida</option>
                    <option value="Ficohsa">Ficohsa</option>
                    <option value="Davivienda">Davivienda</option>
                    <option value="Occidente">Occidente</option>
                  </select>
                </div>
              )}

              <div className="form-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowCreditModal(false)}>Cancelar</button>
                <button type="submit" className="btn-primary" style={{backgroundColor: 'var(--success-color)'}}>
                  Confirmar Abono
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Historial de Facturas */}
      {showInvoicesModal && selectedClient && (
        <div className="modal-overlay">
          <div className="modal-card card" style={{maxWidth: '800px', width: '90%', maxHeight: '90vh', overflowY: 'auto'}}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem'}}>
              <h2>Historial de Facturas: {selectedClient.name}</h2>
              <button className="icon-btn" style={{fontSize: '1.5rem'}} onClick={() => { setShowInvoicesModal(false); setClientInvoices([]); setSelectedClient(null); }}>✕</button>
            </div>
            
            {loadingInvoices ? <p>Cargando facturas...</p> : (
              <table style={{width: '100%', borderCollapse: 'collapse', textAlign: 'left'}}>
                <thead>
                  <tr style={{borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)'}}>
                    <th style={{padding: '0.5rem'}}>Correlativo</th>
                    <th style={{padding: '0.5rem'}}>Fecha</th>
                    <th style={{padding: '0.5rem'}}>Estado</th>
                    <th style={{padding: '0.5rem'}}>Total</th>
                    <th style={{padding: '0.5rem'}}>Pendiente</th>
                    <th style={{padding: '0.5rem'}}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {clientInvoices.map(inv => {
                    const saldo = inv.saldoPendiente !== undefined ? inv.saldoPendiente : (inv.estado === 'CRÉDITO' ? inv.total : 0);
                    return (
                      <tr key={inv.firebaseId} style={{borderBottom: '1px solid var(--border-color)'}}>
                        <td style={{padding: '0.5rem', fontWeight: 'bold'}}>{inv.id}</td>
                        <td style={{padding: '0.5rem'}}>{inv.createdAt?.toDate ? inv.createdAt.toDate().toLocaleString() : ''}</td>
                        <td style={{padding: '0.5rem'}}>
                          <span className="badge" style={{backgroundColor: inv.estado === 'CRÉDITO' ? '#FF9800' : '#4CAF50'}}>{inv.estado}</span>
                        </td>
                        <td style={{padding: '0.5rem', fontWeight: 'bold'}}>L. {inv.total?.toFixed(2)}</td>
                        <td style={{padding: '0.5rem', color: saldo > 0 ? '#FF5252' : 'var(--text-secondary)'}}>L. {saldo.toFixed(2)}</td>
                        <td style={{padding: '0.5rem'}}>
                          <button className="btn-secondary" style={{padding: '0.2rem 0.5rem', fontSize: '0.8rem'}} onClick={() => handlePrintInvoice(inv)}>
                            <Printer size={14} /> Imprimir
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {clientInvoices.length === 0 && (
                    <tr>
                      <td colSpan="4" style={{padding: '1rem', textAlign: 'center', color: 'var(--text-secondary)'}}>No se encontraron facturas.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
