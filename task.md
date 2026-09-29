# Módulo de Finanzas (V3)

- `[x]` Actualizar `Gastos.jsx` para forzar la categoría `CAJA_CHICA` al guardar en la colección `expenses` para que no se mezcle con las finanzas del Backoffice.
- `[x]` Crear y construir `Finanzas.jsx`:
  - `[x]` Implementar el layout principal con 3 pestañas: `Dashboard`, `Registrar Egreso`, `Cuentas por Cobrar`.
  - `[x]` Tab 2: Formulario `Registrar Egreso` (con fecha, responsable, cuenta de origen, categoría (INVENTARIO, NOMINA, ADMINISTRATIVO, INVERSION, PERSONAL), monto, motivo). Guarda en `expenses`.
  - `[x]` Tab 1: P&L Dashboard (Filtros de fecha)
    - `[x]` Ingresos Reales: Sumar facturas donde `metodoPago !== 'CREDITO'` + Recibos de Abono (`creditPayments`).
    - `[x]` Egresos de Caja Chica: `expenses` con `category === 'CAJA_CHICA'`.
    - `[x]` Gastos Operativos (Inventario + Nómina + Administrativos).
    - `[x]` Cálculo de Flujo Neto = Ingresos Reales - (Caja Chica + Gastos Operativos).
    - `[x]` Mostrar panel de Inversión y Gastos Personales abajo (No afectan el flujo operativo, pero se reportan).
  - `[x]` Tab 3: Cuentas por Cobrar (Importar lógica básica de tabla de clientes con `creditBalance > 0` para tener todo a la mano).
- `[x]` Probar y validar cálculos de caja con fechas locales (UTC-6).
