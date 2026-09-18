import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { collection, getDocs, addDoc, doc, getDoc, setDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { logAuditAction } from '../utils/auditLogger';
import { printInvoice } from '../utils/printService';
import { ShoppingCart, Send, UserPlus, FileEdit, Search, Edit, Save, Bell } from 'lucide-react';
import './POS.css';

export default function POS() {
  const { currentUser } = useAuth();
  const [items, setItems] = useState([]);
  const [outOfStockItems, setOutOfStockItems] = useState([]);
  const [dailyMenuConfig, setDailyMenuConfig] = useState(null);
  const [cart, setCart] = useState([]);
  const [orderType, setOrderType] = useState('LOCAL'); // LOCAL, LLEVAR, ENVIO_GRATIS, ENVIO_COBRADO
  const [deliveryFee, setDeliveryFee] = useState(0);

  // UI State
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const [activeOrders, setActiveOrders] = useState([]);
  
  // Estado para las pestañas móviles del POS
  const [mobileTab, setMobileTab] = useState('menu'); // 'menu' | 'ticket'
  const [editingOrderId, setEditingOrderId] = useState(null);

  // Payment State
  const [paymentModalOrder, setPaymentModalOrder] = useState(null);
  const [unpaidWarningOrder, setUnpaidWarningOrder] = useState(null);
  const [showDriverPaymentPrompt, setShowDriverPaymentPrompt] = useState(false);
  const [driverPaymentAmount, setDriverPaymentAmount] = useState('');
  const [summaryOrder, setSummaryOrder] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('EFECTIVO');
  const [paymentBank, setPaymentBank] = useState('Bac Antony');
  const [amountReceived, setAmountReceived] = useState('');
  const [splitPayments, setSplitPayments] = useState([]);
  const [isMultiplePayments, setIsMultiplePayments] = useState(false);
  const [currentPaymentAmount, setCurrentPaymentAmount] = useState('');
  const [modalDeliveryFee, setModalDeliveryFee] = useState(0);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [includeDeliveryInInvoice, setIncludeDeliveryInInvoice] = useState(true);
  const [deliveryPaidByTransfer, setDeliveryPaidByTransfer] = useState(true);

  const [showDispatchModal, setShowDispatchModal] = useState(false);
  const [dispatchOrder, setDispatchOrder] = useState(null);
  const [driverName, setDriverName] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
  const [payDriverFromRegister, setPayDriverFromRegister] = useState(true);


  // States for Customer handling State
  const [dailyMenuData, setDailyMenuData] = useState({ carnes: [], acompanantes: [], sopas: [] });
  const [showDailyMenuModal, setShowDailyMenuModal] = useState(false);
  const [dmSize, setDmSize] = useState(null);
  const [dmSelectedCarne, setDmSelectedCarne] = useState(null);
  const [dmSelectedSides, setDmSelectedSides] = useState([]);
  const [showSopaModal, setShowSopaModal] = useState(false);
  const [activeCategoryFilter, setActiveCategoryFilter] = useState('Todos');
  const [menuSearchTerm, setMenuSearchTerm] = useState('');
  const [alitasStep, setAlitasStep] = useState(1);

  // Order Scheduling
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [deliveryTime, setDeliveryTime] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  
  // Stock de Sopas
  const [soldSoups, setSoldSoups] = useState({});
  const [soldCarnes, setSoldCarnes] = useState({});
  
  // Customer Management
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [showNewCustomerForm, setShowNewCustomerForm] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '', direccion: '', rtn: '', razonSocial: '' });
  
  // Client Info Modal
  const [showClientInfoModal, setShowClientInfoModal] = useState(false);
  const [clientInfoData, setClientInfoData] = useState(null);
  const [editingClientField, setEditingClientField] = useState(null);
  const [clientEditValue, setClientEditValue] = useState('');
  // States for variations modal
  const [salsasDisponibles, setSalsasDisponibles] = useState([]);
  const [showVariationModal, setShowVariationModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedVariation, setSelectedVariation] = useState(null);
  const [variationQtys, setVariationQtys] = useState({});
  const [modalGlobalQty, setModalGlobalQty] = useState(1);
  const [selectedSauces, setSelectedSauces] = useState([]);

  // States for Cart Item editing (Extras & Comments)
  const [availableExtras, setAvailableExtras] = useState([]);
  const [editingCartItem, setEditingCartItem] = useState(null);
  const [cartItemComment, setCartItemComment] = useState('');
  const [cartItemExtras, setCartItemExtras] = useState([]);
  const [cartItemPrice, setCartItemPrice] = useState(0);

  useEffect(() => {
    fetchData();
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      const snap = await getDocs(collection(db, 'orders'));
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      
      const hoy = new Date();
      hoy.setHours(0,0,0,0);

      // Filtrar órdenes: activas o entregadas hoy
      setActiveOrders(data.filter(o => {
        const isSettled = o.estadoEntrega === 'ENTREGADO' && (o.estadoPago === 'PAGADO' || o.estadoPago === 'CREDITO' || o.estadoPago === 'CONSUMO_PROPIO');
        if (!isSettled) return true;
        // Si está entregada y resuelta, checar si es de hoy
        if (o.createdAt?.toDate) {
           return o.createdAt.toDate().getTime() >= hoy.getTime();
        }
        return false;
      }));

      // Calcular inventario de sopas y carnes vendidas hoy
      const sold = {};
      const soldC = {};
      data.forEach(o => {
        if (o.createdAt?.toDate && o.createdAt.toDate().getTime() >= hoy.getTime() && o.estadoCocina !== 'BORRADOR') {
          (o.items || []).forEach(item => {
            if (item.type === 'sopa' || item.name.toLowerCase().includes('sopa')) {
              sold[item.id] = (sold[item.id] || 0) + item.qty;
            }
            if (item.type === 'menu_dia' && item.carneId) {
              const qtyMedios = item.dmSize === 'COMPLETO' ? (item.qty * 1.5) : (item.qty * 1);
              soldC[item.carneId] = (soldC[item.carneId] || 0) + qtyMedios;
            }
          });
        }
      });
      setSoldSoups(sold);
      setSoldCarnes(soldC);

    } catch(e) { console.error(e); }
  };

  const updateOrderStatus = async (orderId, field, value) => {
    try {
      await updateDoc(doc(db, 'orders', orderId), { [field]: value });
      loadOrders();
    } catch(e) { console.error(e); }
  };

  const handlePingOrder = async (orderId) => {
    try {
      await updateDoc(doc(db, 'orders', orderId), { pingTimestamp: serverTimestamp() });
      toast.success("Notificación enviada a cocina.");
    } catch(e) {
      console.error(e);
      toast.error("Error al enviar notificación.");
    }
  };

  const openClientInfoModal = async (clienteId) => {
    try {
      if (!clienteId) return toast.error('Este pedido no tiene un ID de cliente válido.');
      const cDoc = await getDoc(doc(db, 'clients', clienteId));
      if (cDoc.exists()) {
        setClientInfoData({ id: cDoc.id, ...cDoc.data() });
        setShowClientInfoModal(true);
        setEditingClientField(null);
      } else {
        toast.error('Cliente no encontrado en la base de datos.');
      }
    } catch (error) {
      console.error(error);
      toast.error('Error al cargar la información del cliente.');
    }
  };

  const handleSaveClientField = async (field) => {
    try {
      await updateDoc(doc(db, 'clients', clientInfoData.id), {
        [field]: clientEditValue
      });
      // Actualizar vista local
      setClientInfoData(prev => ({ ...prev, [field]: clientEditValue }));
      // También podríamos actualizar la colección de customers global si está cargada
      setCustomers(prev => prev.map(c => c.id === clientInfoData.id ? { ...c, [field]: clientEditValue } : c));
      
      toast.success('Información actualizada');
      setEditingClientField(null);
    } catch (error) {
      console.error(error);
      toast.error('Error al actualizar');
    }
  };

  const handleMarkDelivered = (order) => {
    if (order.estadoPago === 'PENDIENTE') {
      setUnpaidWarningOrder(order);
    } else {
      updateOrderStatus(order.id, 'estadoEntrega', 'ENTREGADO');
    }
  };

  const handleEditOrder = (order) => {
    setCart(order.items);
    setOrderType(order.orderType);
    setDeliveryFee(order.deliveryFee || 0);
    const cust = customers.find(c => c.id === order.clienteId);
    setSelectedCustomer(cust || { id: order.clienteId, name: order.clientName });
    setEditingOrderId(order.id);
    setIsCreatingOrder(true);
  };

  const handleCancelOrder = async (order) => {
    if (!window.confirm(`¿Estás seguro de que deseas cancelar la orden de ${order.clientName}? Esta acción no se puede deshacer y no se sumará a tus ventas.`)) return;
    
    try {
      // 1. Update Order
      await updateDoc(doc(db, 'orders', order.id), {
        estadoCocina: 'CANCELADA',
        estadoEntrega: 'CANCELADO',
        estadoPago: 'CANCELADO'
      });

      // 2. Update Invoice if exists
      if (order.invoiceId) {
        await updateDoc(doc(db, 'invoices', order.invoiceId), {
          estado: 'CANCELADA'
        });
      }

      // 3. Reverse Credit if applicable
      if (order.estadoPago === 'CREDITO' && order.clienteId !== 'generico') {
        const custRef = doc(db, 'clients', order.clienteId);
        const custSnap = await getDoc(custRef);
        if (custSnap.exists()) {
           const currentBalance = custSnap.data().creditBalance || 0;
           await updateDoc(custRef, { creditBalance: currentBalance - order.total });
        }
      }

      await logAuditAction('CANCELAR_ORDEN', 'POS', `Orden cancelada para ${order.clientName} (Total: L.${order.total})`, currentUser);
      loadOrders();
      toast.success("La orden ha sido cancelada exitosamente.");
    } catch (e) {
      console.error(e);
      toast.error("Hubo un error al cancelar la orden.");
    }
  };

  const handleConfirmPayment = async (overrideSplitPayments = null) => {
    if (!paymentModalOrder) return;
    if (isProcessingPayment) return;
    setIsProcessingPayment(true);
    
    const hasDelivery = paymentModalOrder.orderType === 'ENVIO_COBRADO';
    const finalTotal = paymentModalOrder.total + (hasDelivery ? modalDeliveryFee : 0);
    
    let effectiveSplitPayments = overrideSplitPayments || [...splitPayments];

    const totalAdded = effectiveSplitPayments.reduce((acc, p) => acc + p.amount, 0);

    const isConsumo = effectiveSplitPayments.some(p => p.method === 'CONSUMO_PROPIO');
    const hasCredit = effectiveSplitPayments.some(p => p.method === 'CREDITO');
    
    const realPayments = effectiveSplitPayments.filter(p => p.method !== 'PAGO_REPARTIDOR');
    const primaryMethod = realPayments.length === 1 ? realPayments[0].method : (realPayments.length > 1 ? 'MULTIPLE' : 'EFECTIVO');
    const primaryBank = realPayments.length === 1 ? realPayments[0].bank : null;
    
    let estadoBase = 'PAGADA';
    if (isConsumo) estadoBase = 'CORTESÍA';
    if (hasCredit) estadoBase = 'CRÉDITO';

    try {
      const metaRef = doc(db, 'metadata', 'invoices');
      const metaSnap = await getDoc(metaRef);
      let nextNum = 1;
      if (metaSnap.exists()) {
        nextNum = metaSnap.data().lastCorrelative + 1;
      }
      const invoiceId = `FAC-${String(nextNum).padStart(4, '0')}`;
      
      const cust = customers.find(c => c.id === paymentModalOrder.clienteId);

      const newInvoice = {
        id: invoiceId, 
        orderId: paymentModalOrder.id,
        clienteId: paymentModalOrder.clienteId,
        clientName: cust?.razonSocial || paymentModalOrder.clientName,
        rtn: cust?.rtn || null,
        razonSocial: cust?.razonSocial || null,
        total: finalTotal,
        foodTotal: paymentModalOrder.total,
        deliveryFee: hasDelivery ? modalDeliveryFee : 0,
        includeDeliveryInInvoice,
        items: paymentModalOrder.items,
        metodoPago: primaryMethod,
        banco: primaryBank,
        pagosMultiples: effectiveSplitPayments,
        estado: estadoBase,
        createdBy: currentUser.uid,
        createdAt: serverTimestamp()
      };
      
      await setDoc(doc(db, 'invoices', invoiceId), newInvoice);
      await setDoc(metaRef, { lastCorrelative: nextNum });

      const updateData = {
        estadoPago: hasCredit ? 'CREDITO' : (isConsumo ? 'CONSUMO_PROPIO' : 'PAGADO'),
        metodoPago: primaryMethod,
        banco: primaryBank,
        pagosMultiples: effectiveSplitPayments,
        total: finalTotal,
        deliveryFee: hasDelivery ? modalDeliveryFee : 0,
        includeDeliveryInInvoice,
        invoiceId,
        deliveryPaidByTransfer: hasDelivery ? deliveryPaidByTransfer : false 
      };
      
      let vuelto = 0;
      const lastPayment = effectiveSplitPayments[effectiveSplitPayments.length - 1];
      if (totalAdded > finalTotal && lastPayment?.method === 'EFECTIVO') {
         vuelto = totalAdded - finalTotal;
         updateData.vuelto = vuelto;
         updateData.montoRecibido = lastPayment.amount;
      }

      await updateDoc(doc(db, 'orders', paymentModalOrder.id), updateData);
      
      if (hasCredit && paymentModalOrder.clienteId !== 'generico') {
        const creditTotal = effectiveSplitPayments.filter(p => p.method === 'CREDITO').reduce((acc, p) => acc + p.amount, 0);
        if (creditTotal > 0) {
          const custRef = doc(db, 'clients', paymentModalOrder.clienteId);
          const custSnap = await getDoc(custRef);
          if (custSnap.exists()) {
            const currentBalance = custSnap.data().creditBalance || 0;
            await updateDoc(custRef, { creditBalance: currentBalance + creditTotal });
          }
        }
      }

      await logAuditAction('COBRO_ORDEN', 'POS', `Orden cobrada por L.${finalTotal} (Metodo: ${primaryMethod}). Fac: ${invoiceId}`, currentUser);
      
      setPaymentModalOrder(null);
      setPaymentMethod('EFECTIVO');
      setPaymentBank('Bac Antony');
      setAmountReceived('');
      setSplitPayments([]);
      setCurrentPaymentAmount('');
      loadOrders();
      
      let msg = vuelto > 0 ? `Cobro exitoso.\nFactura generada: ${invoiceId}\n\nVuelto a entregar: L. ${vuelto.toFixed(2)}` : `Cobro registrado.\nFactura generada: ${invoiceId}`;
      
      if (window.confirm(`${msg}\n\n¿Deseas imprimir la factura ahora?`)) {
        printInvoice({
          ...newInvoice,
          orderType: paymentModalOrder.orderType,
          createdAt: { toDate: () => new Date() }
        });
      }
    } catch(e) { console.error(e); } finally { setIsProcessingPayment(false); }
  };

  const fetchData = async () => {
    try {
      // Traer menú general
      const snapshot = await getDocs(collection(db, 'menuItems'));
      const menuData = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      
      const salsas = menuData.filter(i => i.type === 'salsa_alitas' && i.available !== false);
      setSalsasDisponibles(salsas);

      const extrasList = menuData.filter(i => i.type === 'extra' && i.available !== false);
      setAvailableExtras(extrasList);

      // Traer configuración del menú del día de hoy
      const today = new Date();
      const dateStr = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
      const menuRef = doc(db, 'dailyMenus', dateStr);
      const menuSnap = await getDoc(menuRef);
      let cfg = null;
      if (menuSnap.exists()) {
        cfg = menuSnap.data();
        setDailyMenuConfig(cfg);
        setDailyMenuData({
          carnes: menuData.filter(i => cfg.carnesSeleccionadas?.includes(i.id) && i.available !== false),
          acompanantes: menuData.filter(i => cfg.acompanantesSeleccionados?.includes(i.id) && i.available !== false),
          sopas: menuData.filter(i => cfg.sopasSeleccionadas?.includes(i.id) && i.available !== false),
        });
      }

      // Filter standard items. Hide soups from the main grid (they have their own button now)
      setItems(menuData.filter(i => {
        if (i.available === false) return false;
        if (i.type === 'sopa' || (i.type === 'platillo' && i.name.toLowerCase().includes('sopa'))) {
          return false; // hide soups from general menu
        }
        return ['platillo', 'pollo_frito', 'tacos', 'alitas', 'combo', 'bebida', 'extra'].includes(i.type);
      }));
      
      const outOfStock = menuData.filter(i => i.available === false);
      setOutOfStockItems(outOfStock);

      // Traer clientes
      const custSnap = await getDocs(collection(db, 'clients'));
      setCustomers(custSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (error) {
      console.error("Error fetching POS data:", error);
    }
  };

  const handleItemClick = (item) => {
    if (item.hasVariations || item.type === 'alitas') {
      setSelectedItem(item);
      setSelectedVariation(item.type === 'alitas' ? null : (item.variations && item.variations.length > 0 ? item.variations[0] : null));
      setVariationQtys({});
      setModalGlobalQty(1);
      setSelectedSauces([]);
      setAlitasStep(1);
      setShowVariationModal(true);
    } else {
      addToCartDirect(item);
    }
  };

  const addToCartDirect = (item, variation = null, sauces = [], qty = 1) => {
    let finalName = item.name;
    let finalPrice = item.price;

    if (variation) {
      finalName = `${item.name} (${variation.name})`;
      finalPrice = variation.price;
    }
    
    if (sauces.length > 0) {
      finalName += ` [Salsas: ${sauces.map(s => s.name).join(', ')}]`;
    }

    const cartItem = {
      ...item,
      cartId: Date.now().toString() + Math.random().toString().substring(2, 6),
      name: finalName,
      price: finalPrice,
      qty: qty,
      comment: '',
      extras: sauces
    };
    
    setCart(prev => {
      const existing = prev.find(c => c.id === item.id && c.name === finalName && !c.comment && (!c.extras || c.extras.length === 0));
      if (existing) {
         return prev.map(c => c.cartId === existing.cartId ? {...c, qty: c.qty + qty} : c);
      } else {
         return [...prev, cartItem];
      }
    });
  };

  const handleConfirmVariation = (keepOpen = false) => {
    if (selectedItem.type === 'alitas') {
      if (!selectedVariation) return toast.error("Debes seleccionar un tamaño de alitas");
      if (modalGlobalQty < 1) return toast.error("La cantidad debe ser al menos 1");
      
      if (selectedSauces.length === 0) {
        return toast.error("Debes seleccionar al menos una salsa para las alitas");
      }

      addToCartDirect(selectedItem, selectedVariation, selectedSauces, modalGlobalQty);
      toast.success(`${selectedVariation.name} agregadas al ticket`);
      
      if (keepOpen === true) {
        setAlitasStep(1);
        setSelectedVariation(null);
        setSelectedSauces([]);
        setModalGlobalQty(1);
        return; // stay in modal
      }
    } else if (selectedItem.hasVariations) {
      const hasAnyQty = Object.values(variationQtys).some(q => q > 0);
      if (!hasAnyQty) {
        return toast.error("Debes agregar al menos una variación");
      }
      
      selectedItem.variations.forEach(v => {
        const qty = variationQtys[v.id] || 0;
        if (qty > 0) {
           addToCartDirect(selectedItem, v, selectedSauces, qty);
        }
      });
    } else {
      addToCartDirect(selectedItem, null, selectedSauces, modalGlobalQty);
    }
    setShowVariationModal(false);
  };

  const toggleSauce = (salsa) => {
    if (selectedSauces.find(s => s.id === salsa.id)) {
      setSelectedSauces(selectedSauces.filter(s => s.id !== salsa.id));
    } else {
      let maxSauces = 1;
      if (selectedItem?.type === 'alitas') {
        const name = ((selectedVariation?.name || '') + ' ' + (selectedItem?.name || '')).toLowerCase();
        if (name.includes('24')) maxSauces = 4;
        else if (name.includes('18')) maxSauces = 3;
        else if (name.includes('8') || name.includes('12')) maxSauces = 2;
        else if (name.includes('6')) maxSauces = 1;
      } else {
        maxSauces = 99; // no limit for other items if any
      }

      if (selectedSauces.length >= maxSauces) {
        toast.error(`Solo puedes elegir un máximo de ${maxSauces} salsa${maxSauces === 1 ? '' : 's'} para este tamaño.`);
        return;
      }
      setSelectedSauces([...selectedSauces, salsa]);
    }
  };

  const removeFromCart = (cartId) => {
    setCart(cart.filter(item => item.cartId !== cartId));
  };

  const openEditCartItem = (cartItem) => {
    setEditingCartItem(cartItem);
    setCartItemComment(cartItem.comment || '');
    setCartItemExtras(cartItem.addedExtras || []);
    setCartItemPrice(cartItem.price || 0);
  };

  const handleSaveCartItemEdits = () => {
    const parsedPrice = parseFloat(cartItemPrice);
    if (isNaN(parsedPrice) || parsedPrice < 0) return toast.error("Precio inválido");

    const updatedCart = cart.map(item => {
      if (item.cartId === editingCartItem.cartId) {
        return {
          ...item,
          comment: cartItemComment,
          addedExtras: cartItemExtras,
          price: parsedPrice
        };
      }
      return item;
    });
    setCart(updatedCart);
    setEditingCartItem(null);
  };

  const toggleCartItemExtra = (extra) => {
    if (cartItemExtras.find(e => e.id === extra.id)) {
      setCartItemExtras(cartItemExtras.filter(e => e.id !== extra.id));
    } else {
      setCartItemExtras([...cartItemExtras, extra]);
    }
  };

  const [dmQuantity, setDmQuantity] = useState(1);

  const openDailyMenuModal = () => {
    setDmSize(null);
    setDmSelectedCarne(null);
    setDmSelectedSides([]);
    setDmQuantity(1);
    setShowDailyMenuModal(true);
  };

  const handleSelectDmSize = (size) => {
    setDmSize(size);
    
    if (dailyMenuData.carnes.length === 1) {
       setDmSelectedCarne(dailyMenuData.carnes[0]);
    } else {
       setDmSelectedCarne(null);
    }

    if (size === 'COMPLETO') {
       if (dailyMenuData.acompanantes.length === (dailyMenuConfig?.acompanantesCompleto || 3)) {
          setDmSelectedSides(dailyMenuData.acompanantes.map(a => ({ side: a, qty: 1 })));
       } else {
          setDmSelectedSides([]);
       }
    } else if (size === 'MEDIO') {
       if (dailyMenuData.acompanantes.length === (dailyMenuConfig?.acompanantesMedio || 2)) {
          setDmSelectedSides(dailyMenuData.acompanantes.map(a => ({ side: a, qty: 1 })));
       } else {
          setDmSelectedSides([]);
       }
    }
  };

  const updateDmSideQty = (side, delta) => {
    const existing = dmSelectedSides.find(s => s.side.id === side.id);
    if (existing) {
       const newQty = existing.qty + delta;
       if (newQty <= 0) {
          setDmSelectedSides(dmSelectedSides.filter(s => s.side.id !== side.id));
       } else {
          setDmSelectedSides(dmSelectedSides.map(s => s.side.id === side.id ? { ...s, qty: newQty } : s));
       }
    } else if (delta > 0) {
       setDmSelectedSides([...dmSelectedSides, { side, qty: 1 }]);
    }
  };

  const handleAddDailyMenuToCart = () => {
    if (!dmSize) return toast.error("Debes seleccionar el tamaño (Completo o Medio)");
    if (!dmSelectedCarne) return toast.error("Debes seleccionar una carne");
    const maxSides = dmSize === 'COMPLETO' ? dailyMenuConfig.acompanantesCompleto : dailyMenuConfig.acompanantesMedio;
    // flatten sides with quantities
    const flatSides = [];
    dmSelectedSides.forEach(s => {
      for(let i = 0; i < s.qty; i++) flatSides.push(s.side);
    });

    if (flatSides.length < maxSides) {
       if(!window.confirm(`Solo has seleccionado ${flatSides.length} de ${maxSides} acompañantes. ¿Deseas continuar de todos modos?`)) return;
    }
    
    const basePrice = dmSize === 'COMPLETO' ? dailyMenuConfig.precioCompleto : dailyMenuConfig.precioMedio;
    const tortillas = dmSize === 'COMPLETO' ? dailyMenuConfig.tortillasCompleto : dailyMenuConfig.tortillasMedio;
    
    // Si seleccionó extras, cobrarlos
    let addedExtras = [];
    let includedSides = flatSides;
    
    if (flatSides.length > maxSides) {
       includedSides = flatSides.slice(0, maxSides);
       const extraSides = flatSides.slice(maxSides);
       extraSides.forEach(e => {
         addedExtras.push({ name: `Extra: ${e.name}`, price: e.price || 0 });
       });
    }

    const name = `Plato del Día (${dmSize}) - ${dmSelectedCarne.name} [${includedSides.map(s=>s.name).join(', ')}] + ${tortillas} Tortillas`;
    
    const cartItem = {
      id: `MENU_DIA_${Date.now()}`,
      cartId: Date.now().toString(),
      type: 'menu_dia',
      name,
      price: basePrice,
      qty: dmQuantity,
      comment: '',
      addedExtras,
      carneId: dmSelectedCarne.id,
      dmSize: dmSize
    };
    setCart([...cart, cartItem]);
    setShowDailyMenuModal(false);
  };

  const updateCartItemQty = (cartId, delta) => {
    setCart(cart.map(item => {
      if (item.cartId === cartId) {
        const newQty = item.qty + delta;
        return { ...item, qty: newQty > 0 ? newQty : 1 };
      }
      return item;
    }));
  };

  const subtotalItems = cart.reduce((acc, item) => {
    let itemTotal = item.price;
    if (item.addedExtras && item.addedExtras.length > 0) {
      itemTotal += item.addedExtras.reduce((sum, e) => sum + e.price, 0);
    }
    return acc + (itemTotal * item.qty);
  }, 0);
  
  const total = subtotalItems;

  const handleReprintInvoice = async (order) => {
    if (!order.invoiceId) return toast.error("Esta orden no tiene una factura asociada.");
    try {
      const invDoc = await getDoc(doc(db, 'invoices', order.invoiceId));
      if (invDoc.exists()) {
        const invData = invDoc.data();
        printInvoice({
          ...invData,
          orderType: order.orderType,
          deliveryFee: order.deliveryFee
        });
      } else {
        toast.error("No se encontró el registro de la factura.");
      }
    } catch(e) { console.error(e); }
  };

  const handleSendToKitchen = async (asDraft = false) => {
    if(cart.length === 0) return toast.error("El carrito está vacío");
    if(!selectedCustomer) return toast.error("Debes seleccionar o crear un cliente para la orden.");

    try {
      if (editingOrderId) {
        await updateDoc(doc(db, 'orders', editingOrderId), {
          clienteId: selectedCustomer.id,
          clientName: selectedCustomer.name || 'Cliente Genérico',
          orderType,
          items: cart,
          total,
          foodTotal: total,
          scheduledTime: scheduledTime || null
        });
        await logAuditAction('ACTUALIZAR_ORDEN', 'POS', `Orden actualizada para ${selectedCustomer.name}`, currentUser);
        toast.success(asDraft ? "¡Borrador guardado!" : "¡Orden actualizada!");
      } else {
        const order = {
          clienteId: selectedCustomer.id,
          clientName: selectedCustomer.name || 'Cliente Genérico',
          orderType,
          items: cart,
          total,
          foodTotal: total, // Initialize foodTotal as total
          deliveryFee: 0,
          includeDeliveryInInvoice: false,
          scheduledTime: scheduledTime || null,
          deliveryTime: deliveryTime || null,
          estadoCocina: asDraft ? 'BORRADOR' : 'PENDIENTE',
          estadoEntrega: 'EN_LOCAL',
          estadoPago: 'PENDIENTE',
          createdBy: currentUser.uid,
          createdAt: serverTimestamp()
        };

        await addDoc(collection(db, 'orders'), order);
        await logAuditAction(asDraft ? 'NUEVO_BORRADOR' : 'ENVIAR_ORDEN', 'POS', `Orden para ${order.clientName} por L. ${total}`, currentUser);
        toast.success(asDraft ? "¡Orden guardada como borrador!" : "¡Orden enviada a cocina!");
      }
      
      
      setCart([]);
      setSelectedCustomer(null);
      setEditingOrderId(null);
      setOrderType('LOCAL');
      setDeliveryFee(0);
      setScheduledTime('');
      setDeliveryTime('');
      setIsCreatingOrder(false);
      setShowCheckoutModal(false);
      loadOrders();
    } catch (error) {
      console.error("Error enviando orden:", error);
    }
  };

  return (
    <div style={{display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: 'var(--bg-color)'}}>
      
      {/* KANBAN BOARD COMO VISTA PRINCIPAL */}
      <div className="kanban-header" style={{display: 'flex', justifyContent: 'space-between', padding: '1rem', backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)', alignItems: 'center'}}>
        <h2 style={{margin: 0}}>📊 Tablero de Órdenes</h2>
        <button className="btn-primary" style={{padding: '0.75rem 1.5rem', fontSize: '1.1rem', backgroundColor: '#4CAF50'}} onClick={() => setIsCreatingOrder(true)}>
          + NUEVO PEDIDO
        </button>
      </div>

      <div className="kanban-board" style={{display: 'flex', gap: '1rem', padding: '1rem', flex: 1, overflowX: 'auto', alignItems: 'flex-start'}}>
        
        {/* COLUMNA 1: Borradores */}
        <div className="kanban-col card" style={{minWidth: '320px', flex: 1, backgroundColor: 'rgba(255,255,255,0.02)'}}>
          <h3 style={{borderBottom: '2px solid var(--text-secondary)', paddingBottom: '0.5rem', marginBottom: '1rem'}}>📝 Borradores</h3>
          <div style={{display: 'flex', flexDirection: 'column', gap: '1rem'}}>
              {!showDriverPaymentPrompt ? (
                <>
                  <button className="btn-secondary" onClick={() => {
                    if (unpaidWarningOrder.orderType === 'ENVIO_COBRADO') {
                      setShowDriverPaymentPrompt(true);
                    } else {
                      updateOrderStatus(unpaidWarningOrder.id, 'estadoEntrega', 'ENTREGADO');
                      setUnpaidWarningOrder(null);
                    }
                  }}>Dejar como Pendiente de Pago</button>
                  <button className="btn-primary" style={{backgroundColor: '#FF9800'}} onClick={() => {
                    setPaymentMethod('EFECTIVO'); 
                    setAmountReceived(''); 
                    setSplitPayments([]);
                    setCurrentPaymentAmount('');
                    setModalDeliveryFee(unpaidWarningOrder.deliveryFee || 0); 
                    setIncludeDeliveryInInvoice(true); 
                    setPaymentModalOrder(unpaidWarningOrder);
                  
                    setUnpaidWarningOrder(null);
                  }}>Cobrar Ahora</button>
                </>
              ) : (
                <div style={{textAlign: 'left', padding: '1rem', backgroundColor: 'rgba(246, 167, 75, 0.1)', borderRadius: '8px'}}>
                  <p style={{marginBottom: '0.5rem', fontSize: '0.9rem'}}>¿Le pagaste el envío al repartidor de la caja?</p>
                  <input 
                    type="number" 
                    className="input-field" 
                    placeholder="Monto pagado al repartidor" 
                    value={driverPaymentAmount}
                    onChange={e => setDriverPaymentAmount(e.target.value)}
                    style={{marginBottom: '1rem'}}
                  />
                  <div style={{display: 'flex', gap: '0.5rem'}}>
                    <button className="btn-primary" style={{flex: 1}} onClick={async () => {
                      const amount = Number(driverPaymentAmount);
                      if (amount > 0) {
                        try {
                          await addDoc(collection(db, 'expenses'), {
                            reason: `Pago a repartidor (Orden ${unpaidWarningOrder.clientName})`,
                            amount: amount,
                            date: new Date().toISOString().split('T')[0],
                            createdAt: serverTimestamp(),
                            isThirdParty: true,
                            invoiceNumber: '',
                            sellerName: unpaidWarningOrder.clientName
                          });
                          await updateDoc(doc(db, 'orders', unpaidWarningOrder.id), {
                            deliveryFee: amount,
                            deliveryPaidByTransfer: true,
                            includeDeliveryInInvoice: true,
                            estadoEntrega: 'ENTREGADO'
                          });
                          toast.success('Envío pagado y sumado a la deuda del cliente');
                        } catch (e) {
                          toast.error('Error al registrar el pago al repartidor');
                        }
                      } else {
                        await updateOrderStatus(unpaidWarningOrder.id, 'estadoEntrega', 'ENTREGADO');
                      }
                      setShowDriverPaymentPrompt(false);
                      setDriverPaymentAmount('');
                      setUnpaidWarningOrder(null);
                    }}>Confirmar</button>
                    <button className="btn-secondary" style={{flex: 1}} onClick={() => {
                      updateOrderStatus(unpaidWarningOrder.id, 'estadoEntrega', 'ENTREGADO');
                      setShowDriverPaymentPrompt(false);
                      setDriverPaymentAmount('');
                      setUnpaidWarningOrder(null);
                    }}>No pagué nada</button>
                  </div>
                </div>
              )}
            </div>
            {!showDriverPaymentPrompt && (
              <button className="btn-secondary" style={{marginTop: '1.5rem', width: '100%'}} onClick={() => setUnpaidWarningOrder(null)}>Cancelar</button>
            )}
          </div>
        </div>
      )}

      {summaryOrder && (
        <div className="modal-overlay" style={{zIndex: 130}}>
          <div className="modal-card card" style={{maxWidth: '500px', width: '90%'}}>
            <h2 style={{borderBottom: '2px solid var(--primary-color)', paddingBottom: '0.5rem', marginBottom: '1rem'}}>
              Resumen: {summaryOrder.clientName}
            </h2>
            <div style={{maxHeight: '40vh', overflowY: 'auto', marginBottom: '1rem'}}>
              <ul style={{listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem'}}>
                {summaryOrder.items.map((item, i) => (
                  <li key={i} style={{backgroundColor: 'rgba(255,255,255,0.05)', padding: '0.75rem', borderRadius: '4px'}}>
                    <div style={{display: 'flex', justifyContent: 'space-between'}}>
                      <strong>{item.qty}x {item.name}</strong>
                      <span>L. {(item.qty * item.price).toFixed(2)}</span>
                    </div>
                    {item.variation && <div style={{fontSize: '0.85rem', color: 'var(--text-secondary)'}}>{item.variation}</div>}
                    {item.notes && <div style={{fontSize: '0.85rem', color: '#FF9800', fontStyle: 'italic'}}>Nota: {item.notes}</div>}
                  </li>
                ))}
              </ul>
              <div style={{textAlign: 'right', marginTop: '1rem', fontSize: '1.2rem'}}>
                <strong>Total: L. {summaryOrder.total.toFixed(2)}</strong>
              </div>
            </div>
            <div style={{display: 'flex', flexDirection: 'column', gap: '0.75rem'}}>
               {summaryOrder.estadoCocina === 'BORRADOR' && (
                  <button className="btn-primary" onClick={() => { setSummaryOrder(null); updateOrderStatus(summaryOrder.id, 'estadoCocina', 'PENDIENTE'); }}>Mandar a Cocina</button>
               )}
               {summaryOrder.estadoCocina === 'PENDIENTE' && (
                  <button className="btn-primary" onClick={() => { setSummaryOrder(null); updateOrderStatus(summaryOrder.id, 'estadoCocina', 'LISTO'); }}>Marcar Listo</button>
               )}
               {summaryOrder.estadoCocina === 'LISTO' && (
                 summaryOrder.orderType.includes('ENVIO') ? (
                    <button className="btn-primary" onClick={() => { setSummaryOrder(null); setDispatchOrder(summaryOrder); setDriverName(''); setDriverPhone(''); setPayDriverFromRegister(true); setShowDispatchModal(true); }}>Enviar en Ruta</button>
                 ) : (
                    <button className="btn-primary" onClick={() => { setSummaryOrder(null); handleMarkDelivered(summaryOrder); }}>Entregar en Local</button>
                 )
               )}
               <button className="btn-secondary" onClick={() => { setSummaryOrder(null); handleEditOrder(summaryOrder); }}>✏️ Editar Orden</button>
               <button className="btn-secondary" onClick={() => setSummaryOrder(null)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {showDispatchModal && (
        <div className="modal-overlay" style={{zIndex: 110}}>
          <div className="modal-card card" style={{maxWidth: '400px', maxHeight: '90vh', overflowY: 'auto'}}>
            <h2>Despachar Orden en Ruta</h2>
            <div className="form-group" style={{marginTop: '1rem'}}>
              <label>Nombre del Repartidor (Opcional)</label>
              <input type="text" className="input-field" value={driverName} onChange={e => setDriverName(e.target.value)} autoFocus />
            </div>
            <div className="form-group">
              <label>Teléfono del Repartidor (Opcional)</label>
              <input type="text" className="input-field" value={driverPhone} onChange={e => setDriverPhone(e.target.value)} />
            </div>
            
            {dispatchOrder && dispatchOrder.deliveryFee > 0 && (
              <div style={{backgroundColor: 'rgba(255, 152, 0, 0.1)', padding: '1rem', borderRadius: '8px', marginTop: '1rem', border: '1px solid rgba(255, 152, 0, 0.3)'}}>
                <div style={{display: 'flex', alignItems: 'flex-start', gap: '0.75rem'}}>
                  <input type="checkbox" id="payDriver" checked={payDriverFromRegister} onChange={e => setPayDriverFromRegister(e.target.checked)} style={{marginTop: '0.2rem'}} />
                  <label htmlFor="payDriver" style={{cursor: 'pointer', fontSize: '0.95rem', margin: 0, fontWeight: 'bold', color: 'var(--text-color)'}}>
                    ¿Pagar L. {dispatchOrder.deliveryFee.toFixed(2)} al repartidor desde la caja de efectivo?
                    <p style={{fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem', fontWeight: 'normal'}}>
                      Esto creará automáticamente un registro de salida de dinero en los Gastos para que la caja cuadre perfectamente.
                    </p>
                  </label>
                </div>
              </div>
            )}
            
            <div className="form-actions" style={{marginTop: '1.5rem'}}>
              <button className="btn-secondary" onClick={() => setShowDispatchModal(false)}>Cancelar</button>
              <button className="btn-primary" onClick={async () => {
                await updateDoc(doc(db, 'orders', dispatchOrder.id), {
                  estadoEntrega: 'ENTREGADO',
                  driverName,
                  driverPhone,
                  driverPaidFromRegister: (dispatchOrder.deliveryFee > 0 && payDriverFromRegister)
                });
                
                // Si está marcado, generamos el gasto automático
                if (dispatchOrder.deliveryFee > 0 && payDriverFromRegister) {
                   await addDoc(collection(db, 'expenses'), {
                     amount: dispatchOrder.deliveryFee,
                     reason: `Pago a repartidor: ${driverName || 'No especificado'} - Fac: ${dispatchOrder.invoiceId || 'N/A'}`,
                     isThirdParty: true, // Etiqueta especial para identificar que no es un gasto operativo del restaurante
                     createdBy: currentUser.uid,
                     createdAt: serverTimestamp()
                   });
                   await logAuditAction('NUEVO_GASTO', 'POS', `L. ${dispatchOrder.deliveryFee} pagados a repartidor por envío.`, currentUser);
                }
                
                await logAuditAction('DESPACHAR_ORDEN', 'POS', `Orden despachada. Repartidor: ${driverName || 'No especificado'}`, currentUser);
                setShowDispatchModal(false);
                if (dispatchOrder.estadoPago === 'PENDIENTE') {
                  setUnpaidWarningOrder(dispatchOrder);
                } else {
                  loadOrders();
                }
                setDispatchOrder(null);
                loadOrders();
              }}>Confirmar Despacho</button>
            </div>
          </div>
        </div>
      )}

      {showScheduleModal && (
        <div className="modal-overlay" style={{zIndex: 120}}>
          <div className="modal-card card" style={{maxWidth: '400px'}}>
            <h2>Programar Orden</h2>
            
            <div className="form-group" style={{marginTop: '1rem'}}>
              <label>Hora de entrega al cliente</label>
              <input type="time" className="input-field" value={deliveryTime} onChange={e => setDeliveryTime(e.target.value)} />
              <p style={{fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0.25rem 0'}}>A esta hora el cliente espera recibir la orden.</p>
            </div>

            <div className="form-group" style={{marginTop: '1rem'}}>
              <label>Recordatorio en Cocina (KDS)</label>
              <input type="time" className="input-field" value={scheduledTime} onChange={e => setScheduledTime(e.target.value)} />
              <p style={{fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0.25rem 0'}}>A esta hora la orden saltará como urgente en la pantalla de cocina.</p>
            </div>

            <div className="form-actions" style={{marginTop: '2rem'}}>
              <button className="btn-secondary" onClick={() => { setDeliveryTime(''); setScheduledTime(''); setShowScheduleModal(false); }}>Borrar Tiempos</button>
              <button className="btn-primary" onClick={() => setShowScheduleModal(false)}>Aceptar</button>
            </div>
          </div>
        </div>
      )}

      {showCheckoutModal && (
        <div className="modal-overlay" style={{zIndex: 110}}>
          <div className="modal-card card" style={{maxWidth: '600px', width: '90%', maxHeight: '90vh', overflowY: 'auto'}}>
            <h2 style={{borderBottom: '2px solid var(--accent-color)', paddingBottom: '0.5rem', marginBottom: '1.5rem'}}>
              🛒 Checkout de la Orden
            </h2>
            
            <div style={{display: 'flex', flexDirection: 'column', gap: '1.5rem'}}>
              
              {/* Asignación de Cliente */}
              <div>
                <h3 style={{fontSize: '1.1rem', marginBottom: '0.75rem'}}>1. Asignar Cliente (Requerido)</h3>
                {!selectedCustomer ? (
                  <div style={{position: 'relative', width: '100%'}}>
                    <input 
                      type="text" 
                      className="input-field" 
                      style={{padding: '0.75rem', fontSize: '1rem'}}
                      value={customerSearch} 
                      onChange={e => setCustomerSearch(e.target.value)}
                      placeholder="🔍 Buscar cliente (Nombre o Teléfono)"
                    />
                    {customerSearch && (
                      <div style={{position: 'absolute', top: '100%', left: 0, right: 0, backgroundColor: 'var(--bg-color)', border: '1px solid var(--border-color)', zIndex: 10, maxHeight: '200px', overflowY: 'auto', borderRadius: '0 0 4px 4px', boxShadow: '0 4px 12px rgba(0,0,0,0.5)'}}>
                        {customers.filter(c => (c.name || '').toLowerCase().includes(customerSearch.toLowerCase()) || (c.phone && c.phone.includes(customerSearch))).map(c => (
                           <div key={c.id} onClick={() => { setSelectedCustomer(c); setCustomerSearch(''); }} style={{padding: '1rem', cursor: 'pointer', borderBottom: '1px solid var(--border-color)', transition: 'background 0.2s'}}>
                             <strong style={{fontSize: '1.1rem'}}>{c.name}</strong> {c.phone && <span style={{color: 'var(--text-secondary)', fontSize: '0.9rem'}}> - {c.phone}</span>}
                           </div>
                        ))}
                        <div onClick={() => { setShowNewCustomerForm(true); setNewCustomer({...newCustomer, name: customerSearch}); setCustomerSearch(''); }} style={{padding: '1rem', cursor: 'pointer', color: 'var(--accent-color)', fontWeight: 'bold', backgroundColor: 'rgba(255,152,0,0.1)'}}>
                           + Crear nuevo cliente: "{customerSearch}"
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(76, 175, 80, 0.1)', border: '1px solid #4CAF50', padding: '1rem', borderRadius: '4px'}}>
                     <div>
                       <strong style={{fontSize: '1.2rem', color: '#4CAF50'}}>👤 {selectedCustomer.name}</strong> 
                       {selectedCustomer.hasCredit && <span className="badge badge-combo" style={{marginLeft: '0.5rem'}}>Crédito Aprobado</span>}
                       {selectedCustomer.phone && <div style={{fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '4px'}}>{selectedCustomer.phone}</div>}
                       {selectedCustomer.rtn && <div style={{fontSize: '0.85rem', color: 'var(--text-secondary)'}}>RTN: {selectedCustomer.rtn}</div>}
                     </div>
                     <button className="btn-secondary" style={{padding: '0.4rem 0.8rem', fontSize: '0.85rem'}} onClick={() => setSelectedCustomer(null)}>Cambiar</button>
                  </div>
                )}
              </div>

              {/* Tipo de Orden y Envíos */}
              <div>
                <h3 style={{fontSize: '1.1rem', marginBottom: '0.75rem'}}>2. Tipo de Entrega</h3>
                <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem'}}>
                  <button className="btn-secondary" style={{border: orderType === 'LOCAL' ? '2px solid var(--primary-color)' : '1px solid var(--border-color)', backgroundColor: orderType === 'LOCAL' ? 'rgba(249, 115, 22, 0.15)' : 'transparent', fontWeight: orderType === 'LOCAL' ? 'bold' : 'normal'}} onClick={() => setOrderType('LOCAL')}>
                    {orderType === 'LOCAL' ? '✓ Local' : 'Local'}
                  </button>
                  <button className="btn-secondary" style={{border: orderType === 'LLEVAR' ? '2px solid var(--primary-color)' : '1px solid var(--border-color)', backgroundColor: orderType === 'LLEVAR' ? 'rgba(249, 115, 22, 0.15)' : 'transparent', fontWeight: orderType === 'LLEVAR' ? 'bold' : 'normal'}} onClick={() => setOrderType('LLEVAR')}>
                    {orderType === 'LLEVAR' ? '✓ Para Llevar' : 'Para Llevar'}
                  </button>
                  <button className="btn-secondary" style={{border: orderType === 'ENVIO_GRATIS' ? '2px solid var(--primary-color)' : '1px solid var(--border-color)', backgroundColor: orderType === 'ENVIO_GRATIS' ? 'rgba(249, 115, 22, 0.15)' : 'transparent', fontWeight: orderType === 'ENVIO_GRATIS' ? 'bold' : 'normal'}} onClick={() => setOrderType('ENVIO_GRATIS')}>
                    {orderType === 'ENVIO_GRATIS' ? '✓ Envío Gratis' : 'Envío Gratis'}
                  </button>
                  <button className="btn-secondary" style={{border: orderType === 'ENVIO_COBRADO' ? '2px solid #3B82F6' : '1px solid var(--border-color)', backgroundColor: orderType === 'ENVIO_COBRADO' ? 'rgba(59, 130, 246, 0.15)' : 'transparent', fontWeight: orderType === 'ENVIO_COBRADO' ? 'bold' : 'normal'}} onClick={() => setOrderType('ENVIO_COBRADO')}>
                    {orderType === 'ENVIO_COBRADO' ? '✓ Envío Cobrado' : 'Envío Cobrado'}
                  </button>
                </div>
              </div>

              {/* Programar Orden */}
              <div>
                <h3 style={{fontSize: '1.1rem', marginBottom: '0.75rem'}}>3. Tiempos y Programación (Opcional)</h3>
                <button 
                  className="btn-secondary" 
                  style={{width: '100%', padding: '0.75rem', fontSize: '1rem', backgroundColor: scheduledTime || deliveryTime ? 'rgba(103, 58, 183, 0.2)' : undefined, border: scheduledTime || deliveryTime ? '1px solid #673AB7' : undefined}} 
                  onClick={() => setShowScheduleModal(true)}
                >
                   ⏱ {scheduledTime || deliveryTime ? 'Orden Programada (Clic para cambiar)' : 'Configurar Horas de Entrega y Cocina'}
                </button>
                {(scheduledTime || deliveryTime) && (
                   <div style={{display: 'flex', justifyContent: 'space-between', backgroundColor: 'rgba(103, 58, 183, 0.1)', padding: '0.75rem', borderRadius: '4px', marginTop: '0.5rem'}}>
                     {deliveryTime && <span style={{fontSize: '0.9rem', color: '#B39DDB'}}><strong>Entrega:</strong> {deliveryTime}</span>}
                     {scheduledTime && <span style={{fontSize: '0.9rem', color: '#FFAB91'}}><strong>Cocina:</strong> {scheduledTime}</span>}
                   </div>
                )}
              </div>
              
              {/* Resumen Final */}
              <div style={{marginTop: '0.5rem', padding: '1rem', backgroundColor: 'var(--bg-color)', borderRadius: '8px', border: '1px solid var(--border-color)'}}>
                <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--primary-color)'}}>
                  <span>TOTAL:</span>
                  <span>L. {total.toFixed(2)}</span>
                </div>
              </div>

              <div style={{display: 'flex', gap: '0.5rem', marginTop: '0.5rem'}}>
                <button className="btn-secondary" style={{flex: 1, padding: '1rem'}} onClick={() => handleSendToKitchen(true)}>
                  📝 Guardar Borrador
                </button>
                <button className="btn-primary send-btn" style={{flex: 2, padding: '1rem'}} onClick={() => {
                   if (!selectedCustomer) {
                     toast.error("⚠️ Por favor, busca y selecciona un cliente primero (Paso 1).");
                     return;
                   }
                   handleSendToKitchen(false);
                }}>
                  <Send size={20} /> {editingOrderId ? 'Actualizar Orden' : 'Confirmar y Enviar a Cocina'}
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {showClientInfoModal && clientInfoData && (
        <div className="modal-overlay" style={{zIndex: 9999}}>
          <div className="modal-card card" style={{maxWidth: '450px', maxHeight: '90vh', overflowY: 'auto'}}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem'}}>
              <h2 style={{margin: 0}}>👤 Información del Cliente</h2>
              <button className="icon-btn" onClick={() => setShowClientInfoModal(false)}>✕</button>
            </div>
            
            <div style={{display: 'flex', flexDirection: 'column', gap: '1rem'}}>
              {[
                { label: 'Nombre', field: 'name' },
                { label: 'Teléfono', field: 'phone' },
                { label: 'RTN', field: 'rtn' },
                { label: 'Razón Social', field: 'razonSocial' },
                { label: 'Dirección', field: 'direccion' },
                { label: 'Cumpleaños', field: 'cumpleanios', type: 'date' }
              ].map(item => (
                <div key={item.field} style={{backgroundColor: 'var(--bg-secondary)', padding: '0.75rem', borderRadius: '6px'}}>
                  <div style={{fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.25rem'}}>{item.label}</div>
                  
                  {editingClientField === item.field ? (
                    <div style={{display: 'flex', gap: '0.5rem'}}>
                      <input 
                        type={item.type || 'text'} 
                        className="input-field" 
                        style={{padding: '0.4rem', flex: 1}}
                        value={clientEditValue} 
                        onChange={e => setClientEditValue(e.target.value)} 
                        autoFocus
                      />
                      <button className="btn-primary" style={{padding: '0.4rem'}} onClick={() => handleSaveClientField(item.field)}>
                        <Save size={16} />
                      </button>
                      <button className="btn-secondary" style={{padding: '0.4rem'}} onClick={() => setEditingClientField(null)}>
                        ✕
                      </button>
                    </div>
                  ) : (
                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                      <span style={{fontWeight: 'bold', fontSize: '1.1rem'}}>{clientInfoData[item.field] || <span style={{color: '#777', fontWeight: 'normal'}}>N/A</span>}</span>
                      <button className="icon-btn" style={{color: 'var(--text-secondary)'}} onClick={() => {
                        setEditingClientField(item.field);
                        setClientEditValue(clientInfoData[item.field] || '');
                      }}>
                        <Edit size={16} />
                      </button>
                    </div>
                  )}
                </div>
              ))}
              
              <div style={{backgroundColor: 'rgba(249, 115, 22, 0.1)', border: '1px solid var(--primary-color)', padding: '0.75rem', borderRadius: '6px', marginTop: '0.5rem'}}>
                 <div style={{fontSize: '0.85rem', color: 'var(--primary-color)'}}>Saldo de Crédito Actual</div>
                 <strong style={{fontSize: '1.2rem', color: 'var(--primary-color)'}}>L. {(clientInfoData.creditBalance || 0).toFixed(2)}</strong>
              </div>
            </div>
          </div>
        </div>
      )}

      {showNewCustomerForm && (
        <div className="modal-overlay" style={{zIndex: 9999}}>
          <div className="modal-card card" style={{maxWidth: '400px', maxHeight: '90vh', overflowY: 'auto'}}>
            <h2>Registrar Cliente Rápido</h2>
            <div className="form-group" style={{marginTop: '1rem'}}>
              <label>Nombre del Cliente</label>
              <input type="text" className="input-field" value={newCustomer.name} onChange={e => setNewCustomer({...newCustomer, name: e.target.value})} autoFocus />
            </div>
            <div className="form-group">
              <label>Teléfono (Opcional)</label>
              <input type="text" className="input-field" value={newCustomer.phone} onChange={e => setNewCustomer({...newCustomer, phone: e.target.value})} />
            </div>
            <div className="form-group">
              <label>Dirección / Referencia (Opcional)</label>
              <textarea className="input-field" value={newCustomer.direccion} onChange={e => setNewCustomer({...newCustomer, direccion: e.target.value})} rows="2" />
            </div>
            <div className="form-group">
              <label>RTN (Opcional)</label>
              <input type="text" className="input-field" value={newCustomer.rtn} onChange={e => setNewCustomer({...newCustomer, rtn: e.target.value})} />
            </div>
            <div className="form-group">
              <label>Razón Social (Opcional)</label>
              <input type="text" className="input-field" value={newCustomer.razonSocial} onChange={e => setNewCustomer({...newCustomer, razonSocial: e.target.value})} />
            </div>
            <div className="form-actions" style={{marginTop: '1.5rem'}}>
              <button className="btn-secondary" onClick={() => setShowNewCustomerForm(false)}>Cancelar</button>
              <button className="btn-primary" onClick={async () => {
                if (!newCustomer.name.trim()) return toast.error("El nombre es obligatorio");
                try {
                  const custDoc = await addDoc(collection(db, 'clients'), { ...newCustomer, hasCredit: false, creditBalance: 0 });
                  const finalCust = { id: custDoc.id, ...newCustomer, hasCredit: false, creditBalance: 0 };
                  setCustomers([...customers, finalCust]);
                  setSelectedCustomer(finalCust);
                  setShowNewCustomerForm(false);
                  setNewCustomer({ name: '', phone: '', direccion: '', rtn: '', razonSocial: '' });
                } catch(e) { console.error(e); }
              }}>Guardar Cliente</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
