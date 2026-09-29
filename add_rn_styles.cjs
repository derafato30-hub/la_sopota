const fs = require('fs');

let css = fs.readFileSync('src/index.css', 'utf-8');

const rnCss = `
/* React Native Style Cards for Finanzas */
.rn-card {
  display: flex;
  flex-direction: column;
  background-color: var(--surface-color);
  border-radius: 16px;
  padding: 1.5rem;
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  position: relative;
  overflow: hidden;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.rn-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.2);
}

.rn-card::before {
  content: '';
  position: absolute;
  top: 0; left: 0; width: 4px; height: 100%;
  background-color: var(--card-color);
}

.rn-card-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.rn-icon-wrapper {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background-color: var(--card-bg);
  display: flex;
  align-items: center;
  justify-content: center;
}

.rn-card-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
  letter-spacing: 0.2px;
}

.rn-card-value {
  font-size: 2.2rem;
  font-weight: 800;
  color: var(--text-primary);
  margin-bottom: 1rem;
  letter-spacing: -0.5px;
}

.rn-card-desc {
  font-size: 0.85rem;
  color: var(--text-secondary);
  line-height: 1.4;
  margin: 0;
}

.rn-card-breakdown {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  background-color: rgba(0, 0, 0, 0.2);
  padding: 1rem;
  border-radius: 12px;
  margin-top: auto;
}

.rn-breakdown-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.rn-breakdown-item strong {
  color: var(--text-primary);
  font-weight: 600;
}
`;

if (!css.includes('rn-card')) {
  fs.appendFileSync('src/index.css', '\n' + rnCss);
  console.log("CSS appended to index.css");
} else {
  console.log("CSS already exists");
}
