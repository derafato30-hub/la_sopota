import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import { toast } from 'sonner';
import { Plus, Edit2, Trash2, Check, RefreshCw, Palette } from 'lucide-react';

const PRESET_COLORS = [
  { name: 'Ámbar Intenso', bg: '#E65100' },
  { name: 'Rojo Fuego', bg: '#C62828' },
  { name: 'Verde Esmeralda', bg: '#2E7D32' },
  { name: 'Azul Real', bg: '#1565C0' },
  { name: 'Púrpura Profundo', bg: '#6A1B9A' },
  { name: 'Teal Caribeño', bg: '#00897B' },
  { name: 'Vino Tinto', bg: '#880E4F' },
  { name: 'Café Caldo', bg: '#4E342E' },
  { name: 'Naranja Dorado', bg: '#F57C00' },
  { name: 'Azul Petróleo', bg: '#006064' },
  { name: 'Carbón Elegante', bg: '#263238' },
  { name: 'Mostaza Caliente', bg: '#C49000' }
];

export const DEFAULT_SOUPS_SEED = [
  { name: 'Sopa de Res', price: 160, bgColor: '#E65100', active: true },
  { name: 'Sopa de Mariscos', price: 220, bgColor: '#1565C0', active: true },
  { name: 'Sopa Marinera', price: 230, bgColor: '#00897B', active: true },
  { name: 'Sopa de Mondongo', price: 170, bgColor: '#C62828', active: true },
  { name: 'Sopa de Gallina India', price: 160, bgColor: '#2E7D32', active: true },
  { name: 'Sopa de Frijoles con Chicharrón', price: 140, bgColor: '#4E342E', active: true }
];

export default function ExpressConfigSopas({ onSoupsChanged }) {
  const [soups, setSoups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);

  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [bgColor, setBgColor] = useState('#E65100');
  const [active, setActive] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSoups();
  }, []);

  const fetchSoups = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'express_soups'));
      const list = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() }));

      if (list.length === 0) {
        // Sembrar sopas predeterminadas automáticamente para conveniencia del usuario
        for (const item of DEFAULT_SOUPS_SEED) {
          const docRef = await addDoc(collection(db, 'express_soups'), {
            ...item,
            createdAt: serverTimestamp()
          });
          list.push({ id: docRef.id, ...item });
        }
        toast.info('Se han configurado las sopas iniciales predeterminadas.');
      }

      list.sort((a, b) => a.name.localeCompare(b.name));
      setSoups(list);
      if (onSoupsChanged) onSoupsChanged(list);
    } catch (err) {
      console.error('Error cargando sopas:', err);
      toast.error('Error al cargar catálogo de sopas');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (soup) => {
    setEditingId(soup.id);
    setName(soup.name);
    setPrice(soup.price.toString());
    setBgColor(soup.bgColor || '#E65100');
    setActive(soup.active !== false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancel = () => {
    setEditingId(null);
    setName('');
    setPrice('');
    setBgColor('#E65100');
    setActive(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return toast.error('Ingresa el nombre de la sopa');
    const numPrice = parseFloat(price);
    if (isNaN(numPrice) || numPrice <= 0) return toast.error('Ingresa un precio válido mayor a 0');

    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        price: numPrice,
        bgColor: bgColor || '#E65100',
        active: active,
        updatedAt: serverTimestamp()
      };

      if (editingId) {
        await updateDoc(doc(db, 'express_soups', editingId), payload);
        toast.success(`Sopa "${name}" actualizada con éxito.`);
      } else {
        await addDoc(collection(db, 'express_soups'), {
          ...payload,
          createdAt: serverTimestamp()
        });
        toast.success(`Sopa "${name}" agregada con éxito.`);
      }

      handleCancel();
      fetchSoups();
    } catch (err) {
      console.error(err);
      toast.error('Error al guardar sopa');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id, sName) => {
    if (!confirm(`¿Estás seguro de eliminar la sopa "${sName}"?`)) return;
    try {
      await deleteDoc(doc(db, 'express_soups', id));
      toast.success('Sopa eliminada');
      fetchSoups();
    } catch (err) {
      console.error(err);
      toast.error('Error al eliminar');
    }
  };

  const handleToggleActive = async (soup) => {
    try {
      await updateDoc(doc(db, 'express_soups', soup.id), {
        active: !soup.active,
        updatedAt: serverTimestamp()
      });
      fetchSoups();
      toast.success(`Sopa ${!soup.active ? 'activada' : 'desactivada'}`);
    } catch (err) {
      console.error(err);
      toast.error('Error al cambiar estado');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ margin: 0, color: 'var(--primary-color)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Palette size={26} /> Configuración de Sopas y Colores
          </h2>
          <p style={{ margin: '4px 0 0 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Personaliza el nombre, precio y el color de fondo de cada sopa para que los cajeros las identifiquen al instante en el móvil.
          </p>
        </div>
        <button className="btn-secondary" onClick={fetchSoups} title="Recargar">
          <RefreshCw size={18} />
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', alignItems: 'flex-start' }}>
        {/* FORMULARIO AGREGAR / EDITAR */}
        <div className="card" style={{ background: 'var(--surface-color)', border: 'var(--glass-border)', borderRadius: 'var(--border-radius-lg)', padding: '1.25rem' }}>
          <h3 style={{ margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem', color: editingId ? '#38bdf8' : '#22c55e' }}>
            {editingId ? <Edit2 size={20} /> : <Plus size={20} />}
            {editingId ? 'Editar Sopa' : 'Nueva Sopa'}
          </h3>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
                Nombre de la Sopa *
              </label>
              <input
                type="text"
                className="input-field"
                placeholder="Ej. Sopa de Res Grande"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                style={{ width: '100%' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
                Precio de Venta (L.) *
              </label>
              <input
                type="number"
                step="0.01"
                className="input-field"
                placeholder="Ej. 160.00"
                value={price}
                onChange={e => setPrice(e.target.value)}
                required
                style={{ width: '100%' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
                Color de Fondo para el Botón Táctil
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <input
                  type="color"
                  value={bgColor}
                  onChange={e => setBgColor(e.target.value)}
                  style={{ width: '45px', height: '40px', border: 'none', borderRadius: '8px', cursor: 'pointer', background: 'transparent' }}
                />
                <input
                  type="text"
                  className="input-field"
                  value={bgColor}
                  onChange={e => setBgColor(e.target.value)}
                  style={{ width: '110px', textTransform: 'uppercase', fontWeight: 'bold' }}
                />
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Color personalizado o elige abajo:</span>
              </div>

              {/* PALETA DE ACCESO RÁPIDO */}
              <div className="express-color-swatches">
                {PRESET_COLORS.map(c => (
                  <button
                    key={c.bg}
                    type="button"
                    className={`express-color-swatch ${bgColor === c.bg ? 'selected' : ''}`}
                    style={{ backgroundColor: c.bg }}
                    onClick={() => setBgColor(c.bg)}
                    title={c.name}
                  />
                ))}
              </div>
            </div>

            {/* VISTA PREVIA DEL BOTÓN TÁCTIL */}
            <div>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
                Vista Previa del Botón en Teléfono:
              </label>
              <div
                className="express-soup-card"
                style={{
                  backgroundColor: bgColor,
                  maxWidth: '260px',
                  boxShadow: '0 8px 20px rgba(0,0,0,0.4)',
                  cursor: 'default'
                }}
              >
                <div className="express-soup-stock-badge">
                  <span>30 disp.</span>
                </div>
                <div className="express-soup-name">{name || 'Nombre de la Sopa'}</div>
                <div className="express-soup-price-tag">
                  L. {parseFloat(price || '0').toFixed(2)}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
              <button
                type="submit"
                className="btn-primary"
                style={{ flex: 1, padding: '0.8rem', fontWeight: 'bold' }}
                disabled={saving}
              >
                <Check size={18} />
                {saving ? 'Guardando...' : editingId ? 'Guardar Cambios' : 'Crear Sopa'}
              </button>
              {editingId && (
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={handleCancel}
                  style={{ padding: '0.8rem' }}
                >
                  Cancelar
                </button>
              )}
            </div>
          </form>
        </div>

        {/* LISTADO DE SOPAS */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-primary)' }}>
            Sopas Registradas ({soups.length})
          </h3>

          {loading ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Cargando catálogo...</div>
          ) : soups.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)', background: 'var(--surface-color)', borderRadius: '12px' }}>
              No hay sopas creadas. Usa el formulario de la izquierda para agregar la primera.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '0.75rem' }}>
              {soups.map(s => (
                <div
                  key={s.id}
                  style={{
                    backgroundColor: 'var(--surface-color)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '12px',
                    padding: '0.85rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem',
                    borderLeft: `6px solid ${s.bgColor || '#E65100'}`
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <strong style={{ fontSize: '1.05rem', color: 'var(--text-primary)', display: 'block' }}>{s.name}</strong>
                      <span style={{ fontSize: '1.15rem', fontWeight: 'bold', color: 'var(--primary-color)' }}>
                        L. {Number(s.price).toFixed(2)}
                      </span>
                    </div>
                    <div
                      style={{
                        width: '26px',
                        height: '26px',
                        borderRadius: '50%',
                        backgroundColor: s.bgColor || '#E65100',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.3)'
                      }}
                      title="Color asignado"
                    />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-color)', paddingTop: '0.5rem' }}>
                    <button
                      type="button"
                      onClick={() => handleToggleActive(s)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '0.75rem',
                        fontWeight: 'bold',
                        color: s.active !== false ? '#22c55e' : '#9ca3af'
                      }}
                    >
                      {s.active !== false ? '● Activa' : '○ Inactiva'}
                    </button>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        type="button"
                        className="btn-secondary"
                        style={{ padding: '0.35rem 0.6rem', fontSize: '0.8rem' }}
                        onClick={() => handleEdit(s)}
                        title="Editar"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        type="button"
                        className="btn-secondary"
                        style={{ padding: '0.35rem 0.6rem', fontSize: '0.8rem', color: '#ef4444' }}
                        onClick={() => handleDelete(s.id, s.name)}
                        title="Eliminar"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
