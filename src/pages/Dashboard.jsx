import { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { generarPropuestaMenuIA } from '../utils/aiService';
import { TrendingUp, ShoppingBag, Clock, Sparkles } from 'lucide-react';
import './Dashboard.css';

export default function Dashboard() {
  const [stats, setStats] = useState({
    ventasHoy: 0,
    ordenesPendientes: 0,
    ordenesEntregadas: 0,
  });
  const [loading, setLoading] = useState(true);

  // Estados para la IA
  const [aiLoading, setAiLoading] = useState(false);
  const [aiProposal, setAiProposal] = useState('');
  const [aiError, setAiError] = useState('');

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      // Obtener el inicio del día para filtrar
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Traer órdenes de hoy (esto funcionará si createdAt > today, lo simplificamos trayendo todas en el MVP)
      const qOrders = collection(db, 'orders');
      const snapOrders = await getDocs(qOrders);
      
      let ventasHoy = 0;
      let pendientes = 0;
      let entregadas = 0;

      snapOrders.forEach(doc => {
        const data = doc.data();
        if (data.estadoCocina === 'CANCELADA') return; // Excluir órdenes canceladas
        
        // Filtro rudimentario por fecha
        if (data.createdAt && data.createdAt.toMillis() > today.getTime()) {
          const foodIncome = data.foodTotal !== undefined ? data.foodTotal : ((data.total || 0) - (data.deliveryFee || 0));
          ventasHoy += foodIncome;
          if (data.estadoCocina === 'PENDIENTE' || data.estadoCocina === 'PREPARANDO') pendientes++;
          if (data.estadoCocina === 'LISTO') entregadas++; // Simplificado: LISTO significa entregada
        }
      });

      setStats({
        ventasHoy,
        ordenesPendientes: pendientes,
        ordenesEntregadas: entregadas
      });

    } catch (error) {
      console.error("Error obteniendo estadísticas:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateAI = async () => {
    try {
      setAiLoading(true);
      setAiError('');
      
      // Data simulada que le enviaríamos a Gemini basada en analíticas previas
      const historialSimulado = [
        { acompanante: 'Tajadas con chimol', ventasUltimos15Dias: 145, rentabilidad: 'Alta' },
        { acompanante: 'Arroz blanco', ventasUltimos15Dias: 120, rentabilidad: 'Media' },
        { acompanante: 'Frijoles con queso', ventasUltimos15Dias: 180, rentabilidad: 'Alta' },
        { sopa: 'Sopa de Res', diasSinHacer: 5, peticionesCliente: 12 },
        { carne: 'Pollo frito', ventasUltimos15Dias: 200, rentabilidad: 'Muy Alta' }
      ];

      const propuesta = await generarPropuestaMenuIA(historialSimulado);
      setAiProposal(propuesta);
    } catch (error) {
      setAiError(error.message);
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>Resumen de Hoy</h1>
      </div>

      <div className="stats-grid">
        <div className="card stat-card border-primary">
          <div className="stat-icon primary-bg">
            <TrendingUp size={24} color="#fff" />
          </div>
          <div className="stat-info">
            <h3>Ventas Brutas</h3>
            <h2 className={loading ? "skeleton-box" : ""}>{loading ? "L. 0.00" : `L. ${stats.ventasHoy.toFixed(2)}`}</h2>
          </div>
        </div>

        <div className="card stat-card border-warning">
          <div className="stat-icon warning-bg">
            <Clock size={24} color="#fff" />
          </div>
          <div className="stat-info">
            <h3>Pedidos Pendientes</h3>
            <h2 className={loading ? "skeleton-box" : ""}>{loading ? "00" : stats.ordenesPendientes}</h2>
          </div>
        </div>

        <div className="card stat-card border-success">
          <div className="stat-icon success-bg">
            <ShoppingBag size={24} color="#fff" />
          </div>
          <div className="stat-info">
            <h3>Pedidos Completados</h3>
            <h2 className={loading ? "skeleton-box" : ""}>{loading ? "00" : stats.ordenesEntregadas}</h2>
          </div>
        </div>
      </div>

      {/* SECCIÓN IA (GEMINI) */}
      <div className="card ai-section">
        <div className="ai-header">
          <div className="ai-title">
            <Sparkles size={28} color="var(--accent-color)" />
            <h2>Asistente de Menú con IA (Gemini)</h2>
          </div>
          <button className="btn-primary highlight-btn" onClick={handleGenerateAI} disabled={aiLoading}>
            {aiLoading ? 'Analizando datos...' : 'Generar Propuesta de Menú'}
          </button>
        </div>

        <div className="ai-content">
          {aiError && (
            <div className="ai-error">
              <strong>Error:</strong> {aiError}
            </div>
          )}

          {!aiProposal && !aiLoading && !aiError && (
            <p className="ai-placeholder">
              Presiona el botón para analizar el historial de ventas y obtener una recomendación altamente rentable para el menú de mañana.
            </p>
          )}

          {aiLoading && (
            <div className="ai-loading">
              <div className="spinner"></div>
              <p>Procesando algoritmos de venta y tendencias gastronómicas...</p>
            </div>
          )}

          {aiProposal && !aiLoading && (
            <div className="ai-result">
              <pre>{aiProposal}</pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
