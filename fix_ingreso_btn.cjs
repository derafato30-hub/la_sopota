const fs = require('fs');

let f = fs.readFileSync('src/pages/ClubCadetes/IngresoTab.jsx', 'utf8');

const targetBtn = "{isScanning ? 'Analizando...' : 'Subir Imagen / Foto'}\n          </button>";
const newBtn = `{isScanning ? 'Analizando...' : 'Subir Imagen / Foto'}
          </button>
          
          <input 
            type="file" 
            accept=".json" 
            ref={jsonInputRef} 
            style={{ display: 'none' }} 
            onChange={handleJsonUpload}
          />
          <button 
            className="btn-secondary" 
            onClick={() => jsonInputRef.current?.click()}
            style={{ width: '100%', borderColor: '#4CAF50', color: '#4CAF50', marginTop: '0.5rem' }}
          >
            Subir Archivo JSON
          </button>`;

f = f.replace(targetBtn, newBtn);

fs.writeFileSync('src/pages/ClubCadetes/IngresoTab.jsx', f);
console.log("Added json button to UI");
