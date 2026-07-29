import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Registra una acción en la bitácora de auditoría.
 * @param {string} action - El tipo de acción (Ej: 'NUEVA_VENTA', 'MODIFICACION_MENU', 'CIERRE_CAJA')
 * @param {string} module - El módulo donde ocurrió (Ej: 'POS', 'INVENTARIO')
 * @param {string} details - Descripción detallada (Ej: 'Pedido #123 cobrado en efectivo')
 * @param {object} user - Objeto del usuario actual (del AuthContext)
 */
export const logAuditAction = async (action, module, details, user) => {
  if (!user || !user.uid) {
    console.warn("Intento de auditoría sin usuario activo:", action);
    return;
  }

  try {
    await addDoc(collection(db, 'auditLogs'), {
      action,
      module,
      details,
      user: {
        uid: user.uid,
        email: user.email,
        name: user.displayName || user.email // Ideal si agregamos nombres
      },
      timestamp: serverTimestamp()
    });
  } catch (error) {
    console.error("Error al registrar en la bitácora de auditoría:", error);
    // Nota: Aunque falle el log por problemas de red, como tenemos offline cache,
    // Firebase intentará subirlo cuando vuelva la conexión.
  }
};
