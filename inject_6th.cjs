const fs = require('fs');
let f = fs.readFileSync('src/pages/Finanzas.jsx', 'utf-8');

const targetCard = `{/* Tarjeta Retiros */}
          <div className="rn-card" style={{ '--card-color': '#9C27B0', '--card-bg': 'rgba(156, 39, 176, 0.05)' }}>
            <div className="rn-card-header">
              <div className="rn-icon-wrapper"><Users color="#9C27B0" size={24}/></div>
              <h3 className="rn-card-title">Retiros Personales</h3>
            </div>
            <div className="rn-card-value" style={{ color: '#9C27B0' }}>L. {data.personales.toFixed(2)}</div>
            <p className="rn-card-desc">Fugas de capital no deducibles.</p>
          </div>`;

const newCard = `

          {/* Tarjeta Balance Real */}
          <div className="rn-card" style={{ '--card-color': balanceReal >= 0 ? '#00BCD4' : '#f44336', '--card-bg': balanceReal >= 0 ? 'rgba(0, 188, 212, 0.05)' : 'rgba(244, 67, 54, 0.05)', gridColumn: '1 / -1', border: balanceReal >= 0 ? '1px solid rgba(0, 188, 212, 0.3)' : '1px solid rgba(244, 67, 54, 0.3)' }}>
            <div className="rn-card-header">
              <div className="rn-icon-wrapper"><DollarSign color={balanceReal >= 0 ? '#00BCD4' : '#f44336'} size={24}/></div>
              <h3 className="rn-card-title" style={{ fontSize: '1.4rem' }}>Balance Final en Caja (Efectivo Real)</h3>
            </div>
            <div className="rn-card-value" style={{ color: balanceReal >= 0 ? '#00BCD4' : '#f44336', fontSize: '3rem' }}>
              L. {balanceReal.toFixed(2)}
            </div>
            <p className="rn-card-desc" style={{ fontSize: '1rem', fontWeight: '500' }}>
              Esta métrica toma la <strong>Ganancia Operativa</strong>, suma Inversiones y resta tus <strong>Retiros Personales</strong> para decirte exactamente si estás consumiendo más de lo que genera el negocio.
            </p>
          </div>`;

// f might have different line endings or slight spacing differences
const fNorm = f.replace(/\r\n/g, '\n');
const targetNorm = targetCard.replace(/\r\n/g, '\n');

if (fNorm.includes(targetNorm)) {
  const newF = fNorm.replace(targetNorm, targetNorm + newCard);
  fs.writeFileSync('src/pages/Finanzas.jsx', newF);
  console.log("Injected 6th card");
} else {
  console.log("Could not find Retiros card");
}
