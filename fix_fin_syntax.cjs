const fs = require('fs');
let f = fs.readFileSync('src/pages/Finanzas.jsx', 'utf-8');

const target = `      )}
    </div>
  );}
    </div>
  );
}`;

const rep = `      )}
    </div>
  );
}`;

if (f.includes(target)) {
  f = f.replace(target, rep);
  fs.writeFileSync('src/pages/Finanzas.jsx', f);
  console.log("Fixed!");
} else {
  console.log("Not found");
}
