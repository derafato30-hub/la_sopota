import { collection, doc, deleteDoc, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import { toast } from 'sonner';

/**
 * Limpia y reinicia por completo el inventario y datos de prueba del día para una sucursal específica.
 * @param {Object} activeBranch Objeto de la sucursal activa ({ id, name, ... })
 * @param {Function} onSessionUpdate Callback para resetear el estado de sesión local
 * @returns {Promise<boolean>} Retorna true si se limpió exitosamente
 */
export async function clearBranchInventoryAndTests(activeBranch, onSessionUpdate) {
  if (!activeBranch?.id) {
    toast.error('No hay una sucursal activa seleccionada.');
    return false;
  }

  const todayStr = new Date().toISOString().split('T')[0];
  const confirmMsg = `⚠️ ¿CONFIRMAR REINICIO DE PRUEBAS?\n\n¿Deseas limpiar y eliminar por completo el inventario y datos de prueba de HOY (${todayStr}) para la sucursal "${activeBranch.name}"?\n\nEsta acción:\n• Eliminará el inventario inicial y existencias de hoy\n• Eliminará los tickets y ventas de prueba de hoy\n• Eliminará los gastos de hoy de esta sucursal\n• Eliminará los traslados de hoy de esta sucursal\n• Eliminará el cierre de hoy (si ya se había cerrado)\n\nLa sucursal quedará limpia como al inicio del día para que puedas aperturarla desde cero.`;

  if (!window.confirm(confirmMsg)) {
    return false;
  }

  const toastId = toast.loading(`Limpiando inventario y pruebas de "${activeBranch.name}"...`);

  try {
    // 1. Borrar sesión de inventario de hoy
    const sessionId = `${activeBranch.id}_${todayStr}`;
    await deleteDoc(doc(db, 'express_sessions', sessionId));

    // 2. Borrar ventas de prueba de hoy para esta sucursal
    const qSales = query(
      collection(db, 'express_sales'),
      where('branchId', '==', activeBranch.id),
      where('dateStr', '==', todayStr)
    );
    const snapSales = await getDocs(qSales);
    for (const d of snapSales.docs) {
      await deleteDoc(doc(db, 'express_sales', d.id));
    }

    // 3. Borrar gastos de hoy de esta sucursal
    const qExp = query(
      collection(db, 'express_expenses'),
      where('branchId', '==', activeBranch.id),
      where('dateStr', '==', todayStr)
    );
    const snapExp = await getDocs(qExp);
    for (const d of snapExp.docs) {
      await deleteDoc(doc(db, 'express_expenses', d.id));
    }

    // 4. Borrar traslados de hoy que involucren a esta sucursal (como origen o destino)
    const qTr = query(
      collection(db, 'express_transfers'),
      where('dateStr', '==', todayStr)
    );
    const snapTr = await getDocs(qTr);
    for (const d of snapTr.docs) {
      const data = d.data();
      if (data.originBranchId === activeBranch.id || data.destinationBranchId === activeBranch.id) {
        await deleteDoc(doc(db, 'express_transfers', d.id));
      }
    }

    // 5. Borrar cierre de hoy si existía
    await deleteDoc(doc(db, 'express_closures', `${activeBranch.id}_${todayStr}`));

    // 6. Actualizar sesión local a null para reflejar el estado no iniciado de inmediato
    if (onSessionUpdate) {
      onSessionUpdate(null);
    }

    toast.success(`¡Inventario y pruebas de "${activeBranch.name}" limpiados con éxito!`, {
      id: toastId,
      description: 'El punto de venta está listo para ser aperturado desde cero.'
    });

    return true;
  } catch (err) {
    console.error('Error al limpiar inventario de la sucursal:', err);
    toast.error('Ocurrió un error al limpiar los datos de prueba.', { id: toastId });
    return false;
  }
}
