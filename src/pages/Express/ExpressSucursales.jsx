import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import { toast } from 'sonner';
import { Store, Plus, Edit2, Trash2, CheckCircle2, MapPin, RefreshCw } from 'lucide-react';

export const DEFAULT_BRANCHES_SEED = [
  { name: 'Punto Principal - Express', code: 'EXP-01', location: 'Local Central', active: true },
  { name: 'Punto Parque Central', code: 'EXP-02', location: 'Parque Central', active: true },
  { name: 'Móvil Boulevard', code: 'EXP-03', location: 'Boulevard Principal', active: true }
];

export default function ExpressSucursales({ activeBranch, onSelectBranch, onBranchesChanged }) {
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [location, setLocation] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchBranches();
  }, []);

  const fetchBranches = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'express_branches'));
      const list = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() }));

      if (list.length === 0) {
        // Sembrar sucursales por defecto
        for (const b of DEFAULT_BRANCHES_SEED) {
          const docRef = await addDoc(collection(db, 'express_branches'), {
            ...b,
            createdAt: serverTimestamp()
          });
          list.push({ id: docRef.id, ...b });
        }
        toast.info('Se han creado puntos de venta iniciales.');
      }

      list.sort((a, b) => a.name.localeCompare(b.name));
      setBranches(list);

      // Si no hay branch activo, seleccionar el primero
      if (!activeBranch && list.length > 0) {
        onSelectBranch(list[0]);
      }
      if (onBranchesChanged) onBranchesChanged(list);
    } catch (err) {
      console.error('Error cargando sucursales:', err);
      toast.error('Error al cargar puntos de venta');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (b) => {
    setEditingId(b.id);
    setName(b.name);
    setCode(b.code || '');
    setLocation(b.location || '');
  };

  const handleCancel = () => {
    setEditingId(null);
    setName('');
    setCode('');
    setLocation('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return toast.error('Ingresa el nombre del punto de venta');

    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        code: (code || name.substring(0, 4)).trim().toUpperCase(),
        location: location.trim(),
        active: true,
        updatedAt: serverTimestamp()
      };

      if (editingId) {
        await updateDoc(doc(db, 'express_branches', editingId), payload);
        toast.success(`Punto "${name}" actualizado con éxito.`);
      } else {
        const docRef = await addDoc(collection(db, 'express_branches'), {
          ...payload,
          createdAt: serverTimestamp()
        });
        toast.success(`Punto "${name}" creado.`);
        if (!activeBranch) onSelectBranch({ id: docRef.id, ...payload });
      }

      handleCancel();
      fetchBranches();
    } catch (err) {
      console.error(err);
      toast.error('Error al guardar sucursal');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id, bName) => {
    if (branches.length <= 1) return toast.error('Debes mantener al menos un punto de venta activo.');
    if (!confirm(`¿Estás seguro de eliminar el punto "${bName}"?`)) return;

    try {
      await deleteDoc(doc(db, 'express_branches', id));
      toast.success('Punto de venta eliminado');
      fetchBranches();
    } catch (err) {
      console.error(err);
      toast.error('Error al eliminar');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ margin: 0, color: 'var(--primary-color)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Store size={26} /> Puntos de Venta y Sucursales
          </h2>
          <p style={{ margin: '4px 0 0 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Cada punto de venta tiene su propio inventario diario, ventas y cierre financiero 100% independiente.
          </p>
        </div>
        <button className="btn-secondary" onClick={fetchBranches} title="Recargar">
          <RefreshCw size={18} />
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', alignItems: 'flex-start' }}>
        {/* FORMULARIO */}
        <div className="card" style={{ background: 'var(--surface-color)', border: 'var(--glass-border)', borderRadius: 'var(--border-radius-lg)', padding: '1.25rem' }}>
          <h3 style={{ margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem', color: editingId ? '#38bdf8' : '#22c55e' }}>
            {editingId ? <Edit2 size={20} /> : <Plus size={20} />}
            {editingId ? 'Editar Punto de Venta' : 'Nuevo Punto de Venta'}
          </h3>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
                Nombre del Punto o Sucursal *
              </label>
              <input
                type="text"
                className="input-field"
                placeholder="Ej. Carretón Parque Central"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                style={{ width: '100%' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
                Código Corto
              </label>
              <input
                type="text"
                className="input-field"
                placeholder="Ej. EXP-04"
                value={code}
                onChange={e => setCode(e.target.value)}
                style={{ width: '100%', textTransform: 'uppercase' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
                Ubicación / Referencia
              </label>
              <input
                type="text"
                className="input-field"
                placeholder="Ej. Frente al kiosco central"
                value={location}
                onChange={e => setLocation(e.target.value)}
                style={{ width: '100%' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
              <button
                type="submit"
                className="btn-primary"
                style={{ flex: 1, padding: '0.8rem', fontWeight: 'bold' }}
                disabled={saving}
              >
                {saving ? 'Guardando...' : editingId ? 'Guardar Cambios' : 'Crear Sucursal'}
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

        {/* LISTADO DE PUNTOS */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-primary)' }}>
            Sucursales Disponibles ({branches.length})
          </h3>

          {loading ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Cargando sucursales...</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {branches.map(b => {
                const isSelected = activeBranch?.id === b.id;
                return (
                  <div
                    key={b.id}
                    style={{
                      backgroundColor: isSelected ? 'rgba(246, 167, 75, 0.12)' : 'var(--surface-color)',
                      border: isSelected ? '2px solid var(--primary-color)' : '1px solid var(--border-color)',
                      borderRadius: '12px',
                      padding: '1rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '1rem',
                      transition: 'all 0.2s'
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <strong style={{ fontSize: '1.1rem', color: isSelected ? 'var(--primary-color)' : 'var(--text-primary)' }}>
                          {b.name}
                        </strong>
                        {b.code && (
                          <span style={{ fontSize: '0.7rem', background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: '4px' }}>
                            {b.code}
                          </span>
                        )}
                        {isSelected && (
                          <span style={{ fontSize: '0.75rem', color: '#22c55e', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '2px' }}>
                            <CheckCircle2 size={14} /> Seleccionado Activo
                          </span>
                        )}
                      </div>
                      {b.location && (
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                          <MapPin size={14} /> {b.location}
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {!isSelected && (
                        <button
                          type="button"
                          className="btn-primary"
                          style={{ padding: '0.45rem 0.85rem', fontSize: '0.85rem' }}
                          onClick={() => {
                            onSelectBranch(b);
                            toast.success(`Cambiado a punto: ${b.name}`);
                          }}
                        >
                          Usar este Punto
                        </button>
                      )}
                      <button
                        type="button"
                        className="btn-secondary"
                        style={{ padding: '0.45rem 0.6rem' }}
                        onClick={() => handleEdit(b)}
                        title="Editar"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        type="button"
                        className="btn-secondary"
                        style={{ padding: '0.45rem 0.6rem', color: '#ef4444' }}
                        onClick={() => handleDelete(b.id, b.name)}
                        title="Eliminar"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
