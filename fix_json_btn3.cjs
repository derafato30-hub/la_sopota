const fs = require('fs');

let f = fs.readFileSync('src/pages/ClubCadetes/IngresoTab.jsx', 'utf8');

const regex = /\{isScanning \? 'Analizando\.\.\.' : 'Subir Imagen \/ Foto'\}\s*<\/button>/g;
const replaceWith = `{isScanning ? 'Analizando...' : 'Subir Imagen / Foto'}
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

if (f.match(regex)) {
    f = f.replace(regex, replaceWith);
    fs.writeFileSync('src/pages/ClubCadetes/IngresoTab.jsx', f);
    console.log("Successfully injected JSON button.");
} else {
    console.error("Regex did not match!");
}
