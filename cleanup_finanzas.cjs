const fs = require('fs');
let f = fs.readFileSync('src/pages/Finanzas.jsx', 'utf-8');

// The file currently has my rn-card grid, followed by the rest of the old grid.
// Let's find exactly where my rn-card grid starts:
const startString = `<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>`;

// And let's find the end of the ENTIRE dashboard grid.
// It should end right before `      )}` which is right before `    </div>` at the end of the DashboardPL component.
const endString = `      )}
    </div>
  );
}`;

const startIndex = f.indexOf(startString);
const endIndex = f.indexOf(endString);

if (startIndex === -1 || endIndex === -1) {
  console.log("Could not find start or end bounds.");
  process.exit(1);
}

// Extract everything before the startString
const before = f.substring(0, startIndex);

// Extract everything after the endString (which is the rest of the file)
const after = f.substring(endIndex);

// Define the NEW pure rn-card grid
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
        </div>
`;

fs.writeFileSync('src/pages/Finanzas.jsx', before + replacement + after);
console.log("Successfully replaced the entire grid block.");
