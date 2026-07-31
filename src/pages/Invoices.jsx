import { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { Receipt, Printer, Search } from 'lucide-react';
import { printInvoice } from '../utils/printService';

export default function Invoices() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      // Query recent invoices
      const q = query(collection(db, 'invoices'), orderBy('createdAt', 'desc'), limit(100));
      const snap = await getDocs(q);
      const data = snap.docs.map(doc => ({ firebaseId: doc.id, ...doc.data() }));
      setInvoices(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const filteredInvoices = invoices.filter(inv => 
    inv.id?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    inv.clientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    inv.orderId?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handlePrint = (invoice) => {
    printInvoice(invoice);
  };

  return (
    <div style={{padding: '2rem'}}>
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem'}}>
        <h1><Receipt size={32} style={{marginRight: '10px'}}/> Módulo de Facturación</h1>
      </div>

      <div className="card no-print" style={{marginBottom: '2rem'}}>
        <div style={{display: 'flex', gap: '1rem', alignItems: 'center'}}>
          <Search size={20} color="var(--text-secondary)" />
          <input 
            type="text" 
            className="input-field" 
            placeholder="Buscar por correlativo (FAC-0001), cliente u orden..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{flex: 1}}
          />
        </div>
      </div>

      {loading ? (
        <p>Cargando facturas...</p>
      ) : (
        <div className="card no-print" style={{overflowX: 'auto'}}>
          <table style={{width: '100%', borderCollapse: 'collapse', textAlign: 'left'}}>
            <thead>
              <tr style={{borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)'}}>
                <th style={{padding: '1rem'}}>Correlativo</th>
                <th style={{padding: '1rem'}}>Fecha</th>
                <th style={{padding: '1rem'}}>Cliente</th>
                <th style={{padding: '1rem'}}>Método</th>
                <th style={{padding: '1rem'}}>Estado</th>
                <th style={{padding: '1rem'}}>Total</th>
                <th style={{padding: '1rem'}}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredInvoices.map(inv => {
                const date = inv.createdAt?.toDate ? inv.createdAt.toDate().toLocaleString() : 'Fecha desconocida';
                return (
                  <tr key={inv.firebaseId} style={{borderBottom: '1px solid var(--border-color)'}}>
                    <td style={{padding: '1rem', fontWeight: 'bold'}}>{inv.id}</td>
                    <td style={{padding: '1rem'}}>{date}</td>
                    <td style={{padding: '1rem'}}>{inv.clientName}</td>
                    <td style={{padding: '1rem'}}>
                      {inv.metodoPago}
                      {inv.banco && <span style={{display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)'}}>{inv.banco}</span>}
                    </td>
                    <td style={{padding: '1rem'}}>
                      <span className="badge" style={{backgroundColor: inv.estado === 'CRÉDITO' ? '#FF9800' : '#4CAF50'}}>{inv.estado}</span>
                    </td>
                    <td style={{padding: '1rem', fontWeight: 'bold'}}>
                      L. {Number((!inv.includeDeliveryInInvoice && inv.deliveryFee) ? (inv.foodTotal || (inv.total - inv.deliveryFee)) : (inv.total || 0)).toFixed(2)}
                    </td>
                    <td style={{padding: '1rem'}}>
                      <button className="btn-secondary" onClick={() => handlePrint(inv)}><Printer size={16} /> Imprimir / PDF</button>
                    </td>
                  </tr>
                )
              })}
              {filteredInvoices.length === 0 && (
                <tr>
                  <td colSpan="7" style={{padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)'}}>No se encontraron facturas.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

    </div>
  );
}
