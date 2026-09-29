const fs = require('fs');

let f = fs.readFileSync('src/pages/Finanzas.jsx', 'utf-8');

// Find the end of DashboardPL which might be duplicated
// DashboardPL should end with:
//       )}
//     </div>
//   );
// }

// Just split by "export default Finanzas;" and check what's before it
let lines = f.split('\n');
let newLines = [];
let insideEnd = false;
for (let i = 0; i < lines.length; i++) {
  newLines.push(lines[i]);
}

// Easier to just use string replace for the exact mess at the end.
const mess = `      )}
    </div>
  );
  );}
    </div>
  );
}`;

const correct = `      )}
    </div>
  );
}`;

if (f.includes(mess)) {
  f = f.replace(mess, correct);
  fs.writeFileSync('src/pages/Finanzas.jsx', f);
  console.log("Fixed mess exactly");
} else {
  // Let's just print the last 20 lines to see what they are
  console.log(lines.slice(lines.length - 20).join('\n'));
}
