const fs = require('fs');
let f = fs.readFileSync('src/pages/ClubCadetes/CocinaTab.jsx', 'utf8');

// The block to replace
const original = `</div>
                    </div>
                  ))`;

const replaced = `</div>
                      <button onClick={() => handleDeleteOrder(order.id)} style={{ background: 'transparent', border: 'none', color: '#f44336', cursor: 'pointer', padding: '0.2rem' }}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))`;

f = f.replace(original, replaced);
fs.writeFileSync('src/pages/ClubCadetes/CocinaTab.jsx', f);
console.log("Replaced Trash2");
