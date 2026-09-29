const fs = require('fs');

let f = fs.readFileSync('src/pages/Finanzas.jsx', 'utf-8');

const target = `<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
          
          <div className="stat-card" style={{ borderColor: '#4CAF50' }}>
            <div className="stat-header">
              <DollarSign color="#4CAF50" size={24}/>
              <h3>Ingresos (Flujo de Caja)</h3>
            </div>
            <div className="stat-value" style={{ color: '#4CAF50' }}>L. {ingresosTotales.toFixed(2)}</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
              Ventas de Contado: L. {(data.ingresosFood || 0).toFixed(2)}</div><div style={{fontSize: '0.75rem', marginTop: '0.2rem', color: '#ffeb3b'}}>+ Envíos Recaudados: L. {(data.ingresosDelivery || 0).toFixed(2)}<br/>
              Abonos Recibidos: L. {data.abonos.toFixed(2)}
            </div>
          </div>

          <div className="stat-card" style={{ borderColor: '#f44336' }}>
            <div className="stat-header">
              <TrendingUp color="#f44336" size={24} style={{ transform: 'rotate(180deg)' }}/>
              <h3>Egresos Operativos</h3>
            </div>
            <div className="stat-value" style={{ color: '#f44336' }}>L. {gastosRestables.toFixed(2)}</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
              Caja Chica Diario: L. {data.cajaChica.toFixed(2)}<br/>
              Inventario Mayor: L. {data.operativos.toFixed(2)}<br/>
              Nómina/Sueldos: L. {data.nomina.toFixed(2)}<br/>
              Administrativos: L. {data.administrativos.toFixed(2)}
            </div>
          </div>

          <div className="stat-card" style={{ borderColor: flujoNeto >= 0 ? '#2196F3' : '#f44336', gridColumn: '1 / -1' }}>
            <div className="stat-header">
              <Briefcase color={flujoNeto >= 0 ? '#2196F3' : '#f44336'} size={24}/>
              <h3>Flujo Neto (Ganancia Operativa)</h3>
            </div>
            <div className="stat-value" style={{ color: flujoNeto >= 0 ? '#2196F3' : '#f44336', fontSize: '2.5rem' }}>
              L. {flujoNeto.toFixed(2)}
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              Este es el dinero real disponible generado por la operación del restaurante en este periodo.
            </p>
          </div>

          <div className="stat-card" style={{ borderColor: '#ff9800' }}>
            <div className="stat-header">
              <Plus color="#ff9800" size={24}/>
              <h3>Inversión (Capital)</h3>
            </div>
            <div className="stat-value" style={{ color: '#ff9800' }}>L. {data.inversiones.toFixed(2)}</div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>No afecta el Flujo Neto Operativo.</p>
          </div>

          <div className="stat-card" style={{ borderColor: '#9C27B0' }}>
            <div className="stat-header">
              <Users color="#9C27B0" size={24}/>
              <h3>Retiros Personales</h3>
            </div>
            <div className="stat-value" style={{ color: '#9C27B0' }}>L. {data.personales.toFixed(2)}</div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Fugas de capital no deducibles.</p>
          </div>
        </div>`;

// Use CSS inside JS for App-like cards
const replacement = `<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
          
          {/* Tarjeta Ingresos */}
          <div className="rn-card" style={{ '--card-color': '#4CAF50', '--card-bg': 'rgba(76, 175, 80, 0.05)' }}>
            <div className="rn-card-header">
              <div className="rn-icon-wrapper"><DollarSign color="#4CAF50" size={24}/></div>
              <h3 className="rn-card-title">Ingresos (Flujo de Caja)</h3>
            </div>
            <div className="rn-card-value">L. {ingresosTotales.toFixed(2)}</div>
            <div className="rn-card-breakdown">
              <div className="rn-breakdown-item">
                <span>Ventas de Contado:</span>
                <strong>L. {(data.ingresosFood || 0).toFixed(2)}</strong>
              </div>
              <div className="rn-breakdown-item" style={{color: '#ffeb3b'}}>
                <span>+ Envíos Recaudados:</span>
                <strong>L. {(data.ingresosDelivery || 0).toFixed(2)}</strong>
              </div>
              <div className="rn-breakdown-item">
                <span>Abonos Recibidos:</span>
                <strong>L. {data.abonos.toFixed(2)}</strong>
              </div>
            </div>
          </div>

          {/* Tarjeta Egresos */}
          <div className="rn-card" style={{ '--card-color': '#f44336', '--card-bg': 'rgba(244, 67, 54, 0.05)' }}>
            <div className="rn-card-header">
              <div className="rn-icon-wrapper"><TrendingUp color="#f44336" size={24} style={{ transform: 'rotate(180deg)' }}/></div>
              <h3 className="rn-card-title">Egresos Operativos</h3>
            </div>
            <div className="rn-card-value" style={{ color: '#f44336' }}>L. {gastosRestables.toFixed(2)}</div>
            <div className="rn-card-breakdown">
              <div className="rn-breakdown-item">
                <span>Caja Chica Diario:</span>
                <strong>L. {data.cajaChica.toFixed(2)}</strong>
              </div>
              <div className="rn-breakdown-item">
                <span>Inventario Mayor:</span>
                <strong>L. {data.operativos.toFixed(2)}</strong>
              </div>
              <div className="rn-breakdown-item">
                <span>Nómina/Sueldos:</span>
                <strong>L. {data.nomina.toFixed(2)}</strong>
              </div>
              <div className="rn-breakdown-item">
                <span>Administrativos:</span>
                <strong>L. {data.administrativos.toFixed(2)}</strong>
              </div>
            </div>
          </div>

          {/* Tarjeta Flujo Neto */}
          <div className="rn-card" style={{ '--card-color': flujoNeto >= 0 ? '#2196F3' : '#f44336', '--card-bg': flujoNeto >= 0 ? 'rgba(33, 150, 243, 0.05)' : 'rgba(244, 67, 54, 0.05)', gridColumn: '1 / -1' }}>
            <div className="rn-card-header">
              <div className="rn-icon-wrapper"><Briefcase color={flujoNeto >= 0 ? '#2196F3' : '#f44336'} size={24}/></div>
              <h3 className="rn-card-title">Flujo Neto (Ganancia Operativa)</h3>
            </div>
            <div className="rn-card-value" style={{ color: flujoNeto >= 0 ? '#2196F3' : '#f44336', fontSize: '2.5rem' }}>
              L. {flujoNeto.toFixed(2)}
            </div>
            <p className="rn-card-desc">Este es el dinero real disponible generado por la operación del restaurante en este periodo.</p>
          </div>

          {/* Tarjeta Inversión */}
          <div className="rn-card" style={{ '--card-color': '#ff9800', '--card-bg': 'rgba(255, 152, 0, 0.05)' }}>
            <div className="rn-card-header">
              <div className="rn-icon-wrapper"><Plus color="#ff9800" size={24}/></div>
              <h3 className="rn-card-title">Inversión (Capital)</h3>
            </div>
            <div className="rn-card-value" style={{ color: '#ff9800' }}>L. {data.inversiones.toFixed(2)}</div>
            <p className="rn-card-desc">No afecta el Flujo Neto Operativo.</p>
          </div>

          {/* Tarjeta Retiros */}
          <div className="rn-card" style={{ '--card-color': '#9C27B0', '--card-bg': 'rgba(156, 39, 176, 0.05)' }}>
            <div className="rn-card-header">
              <div className="rn-icon-wrapper"><Users color="#9C27B0" size={24}/></div>
              <h3 className="rn-card-title">Retiros Personales</h3>
            </div>
            <div className="rn-card-value" style={{ color: '#9C27B0' }}>L. {data.personales.toFixed(2)}</div>
            <p className="rn-card-desc">Fugas de capital no deducibles.</p>
          </div>
        </div>`;

if (f.includes('display: \'grid\', gridTemplateColumns: \'repeat(auto-fit, minmax(300px, 1fr))\', gap: \'1rem\'')) {
  f = f.replace(target, replacement);
  fs.writeFileSync('src/pages/Finanzas.jsx', f);
  console.log("Card layout replaced");
} else {
  console.log("Target not found");
}
