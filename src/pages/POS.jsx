import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { collection, getDocs, addDoc, doc, getDoc, setDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { logAuditAction } from '../utils/auditLogger';
import { printInvoice } from '../utils/printService';
import { 
  ShoppingCart, Send, UserPlus, FileEdit, Search } from 'lucide-react';
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
  const [summaryOrder, setSummaryOrder] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('EFECTIVO');
  const [paymentBank, setPaymentBank] = useState('Bac Antony');
  const [amountReceived, setAmountReceived] = useState('');
  const [modalDeliveryFee, setModalDeliveryFee] = useState(0);
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
  const [dmSize, setDmSize] = useState('COMPLETO');
  const [dmSelectedCarne, setDmSelectedCarne] = useState(null);
  const [dmSelectedSides, setDmSelectedSides] = useState([]);
  const [showSopaModal, setShowSopaModal] = useState(false);
  const [activeCategoryFilter, setActiveCategoryFilter] = useState('Todos');
  const [menuSearchTerm, setMenuSearchTerm] = useState('');

  // Order Scheduling
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [deliveryTime, setDeliveryTime] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  
  // Stock de Sopas
  const [soldSoups, setSoldSoups] = useState({});
  
  // Customer Management
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [showNewCustomerForm, setShowNewCustomerForm] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '', direccion: '', rtn: '', razonSocial: '' });
  
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
        if (o.estadoEntrega !== 'ENTREGADO' || o.estadoPago !== 'PAGADO') return true;
        // Si está entregada y pagada, checar si es de hoy
        if (o.createdAt?.toDate) {
           return o.createdAt.toDate().getTime() >= hoy.getTime();
        }
        return false;
      }));

      // Calcular inventario de sopas vendidas hoy
      const sold = {};
      data.forEach(o => {
        if (o.createdAt?.toDate && o.createdAt.toDate().getTime() >= hoy.getTime() && o.estadoCocina !== 'BORRADOR') {
          (o.items || []).forEach(item => {
            if (item.type === 'sopa' || item.name.toLowerCase().includes('sopa')) {
              sold[item.id] = (sold[item.id] || 0) + item.qty;
            }
          });
        }
      });
      setSoldSoups(sold);

    } catch(e) { console.error(e); }
  };

  const updateOrderStatus = async (orderId, field, value) => {
    try {
      await updateDoc(doc(db, 'orders', orderId), { [field]: value });
      loadOrders();
    } catch(e) { console.error(e); }
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

  const handleConfirmPayment = async () => {
    if (!paymentModalOrder) return;
    const isCredit = paymentMethod === 'CREDITO';
    const received = Number(amountReceived);
    
    if (paymentMethod === 'EFECTIVO' && received < paymentModalOrder.total) {
      return toast.error('El monto recibido es menor al total');
    }

    try {
      // 1. Get next invoice number
      const metaRef = doc(db, 'metadata', 'invoices');
      const metaSnap = await getDoc(metaRef);
      let nextNum = 1;
      if (metaSnap.exists()) {
        nextNum = metaSnap.data().lastCorrelative + 1;
      }
      const invoiceId = `FAC-${String(nextNum).padStart(4, '0')}`;
      
      const finalTotal = paymentModalOrder.total + (paymentModalOrder.orderType === 'ENVIO_COBRADO' ? modalDeliveryFee : 0);
      
      const cust = customers.find(c => c.id === paymentModalOrder.clienteId);

      // 2. Create invoice
      const newInvoice = {
        id: invoiceId, // Store as field too just in case
        orderId: paymentModalOrder.id,
        clienteId: paymentModalOrder.clienteId,
        clientName: cust?.razonSocial || paymentModalOrder.clientName,
        rtn: cust?.rtn || null,
        razonSocial: cust?.razonSocial || null,
        total: finalTotal, // include delivery if applicable
        foodTotal: paymentModalOrder.total, // keep base food cost separate for dashboard
        deliveryFee: paymentModalOrder.orderType === 'ENVIO_COBRADO' ? modalDeliveryFee : 0,
        includeDeliveryInInvoice,
        items: paymentModalOrder.items,
        metodoPago: paymentMethod,
        banco: paymentMethod === 'TRANSFERENCIA' ? paymentBank : null,
        estado: isCredit ? 'CRÉDITO' : 'PAGADA',
        createdBy: currentUser.uid,
        createdAt: serverTimestamp()
      };
      await setDoc(doc(db, 'invoices', invoiceId), newInvoice);
      await setDoc(metaRef, { lastCorrelative: nextNum });

      // 3. Update Order
      const updateData = {
        estadoPago: isCredit ? 'CREDITO' : 'PAGADO',
        metodoPago: paymentMethod,
        total: finalTotal,
        deliveryFee: paymentModalOrder.orderType === 'ENVIO_COBRADO' ? modalDeliveryFee : 0,
        includeDeliveryInInvoice,
        invoiceId,
        banco: paymentMethod === 'TRANSFERENCIA' ? paymentBank : null,
        deliveryPaidByTransfer: paymentMethod === 'TRANSFERENCIA' && paymentModalOrder.orderType === 'ENVIO_COBRADO' ? deliveryPaidByTransfer : false
      };
      
      if (paymentMethod === 'EFECTIVO') {
        let expectedCollection = finalTotal;
        if (paymentModalOrder.orderType === 'ENVIO_COBRADO') {
           expectedCollection = paymentModalOrder.total;
        }
        
        if (received < expectedCollection) {
          toast.error(`El monto recibido (L. ${received}) es menor al total a cobrar en caja (L. ${expectedCollection}).`);
          return;
        }

        updateData.montoRecibido = received;
        updateData.vuelto = received - expectedCollection;
      }

      await updateDoc(doc(db, 'orders', paymentModalOrder.id), updateData);
      
      // 4. Update Customer if credit
      if (isCredit && paymentModalOrder.clienteId !== 'generico') {
        const custRef = doc(db, 'clients', paymentModalOrder.clienteId);
        const custSnap = await getDoc(custRef);
        if (custSnap.exists()) {
          const currentBalance = custSnap.data().creditBalance || 0;
          await updateDoc(custRef, { creditBalance: currentBalance + finalTotal });
        }
      }

      await logAuditAction('COBRO_ORDEN', 'POS', `Orden cobrada con ${paymentMethod} por L.${finalTotal}. Fac: ${invoiceId}`, currentUser);
      
      const v = paymentMethod === 'EFECTIVO' ? updateData.vuelto : null;
      setPaymentModalOrder(null);
      setPaymentMethod('EFECTIVO');
      setPaymentBank('Bac Antony');
      setAmountReceived('');
      loadOrders();
      
      let msg = v !== null ? `Cobro exitoso.\nFactura generada: ${invoiceId}\n\nVuelto a entregar: L. ${v.toFixed(2)}` : `Cobro registrado.\nFactura generada: ${invoiceId}`;
      
      if (window.confirm(`${msg}\n\n¿Deseas imprimir la factura ahora?`)) {
        printInvoice({
          ...newInvoice,
          orderType: paymentModalOrder.orderType,
          createdAt: { toDate: () => new Date() }
        });
      }
    } catch(e) { console.error(e); }
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
      setSelectedVariation(item.variations && item.variations.length > 0 ? item.variations[0] : null);
      setVariationQtys({});
      setModalGlobalQty(1);
      setSelectedSauces([]);
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

  const handleConfirmVariation = () => {
    if (selectedItem.type === 'alitas') {
      if (!selectedVariation) return toast.error("Debes seleccionar un tamaño de alitas");
      if (modalGlobalQty < 1) return toast.error("La cantidad debe ser al menos 1");
      
      let maxSauces = 1;
      const name = selectedVariation.name || '';
      if (name.includes('6')) maxSauces = 1;
      else if (name.includes('8') || name.includes('12')) maxSauces = 2;
      else if (name.includes('18')) maxSauces = 3;
      else if (name.includes('24')) maxSauces = 4;

      if (selectedSauces.length === 0) {
        return toast.error("Debes seleccionar al menos una salsa para las alitas");
      }

      addToCartDirect(selectedItem, selectedVariation, selectedSauces, modalGlobalQty);
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
        const name = selectedVariation?.name || '';
        if (name.includes('6')) maxSauces = 1;
        else if (name.includes('8') || name.includes('12')) maxSauces = 2;
        else if (name.includes('18')) maxSauces = 3;
        else if (name.includes('24')) maxSauces = 4;
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
    setDmSize('COMPLETO');
    setDmSelectedCarne(null);
    setDmSelectedSides([]);
    setDmQuantity(1);
    setShowDailyMenuModal(true);
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
      addedExtras
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
            {activeOrders.filter(o => o.estadoCocina === 'BORRADOR').map(o => (
              <div key={o.id} style={{backgroundColor: 'var(--bg-secondary)', padding: '1rem', borderRadius: '8px', borderLeft: '4px solid var(--text-secondary)'}}>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'}}>
                  <strong>{o.clientName}</strong>
                  <div style={{display: 'flex', flexDirection: 'column', alignItems: 'flex-end'}}>
                    <span className="badge">{o.orderType}</span>
                    {o.deliveryTime && <span className="badge" style={{backgroundColor: '#673AB7', fontSize: '0.7rem', marginTop: '4px'}}>🕒 Entrega: {o.deliveryTime}</span>}
                    {o.scheduledTime && <span className="badge" style={{backgroundColor: '#FF5722', fontSize: '0.7rem', marginTop: '4px'}}>⏱ Cocina: {o.scheduledTime}</span>}
                  </div>
                </div>
                <div style={{fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0.5rem 0'}}>
                  L. {o.total.toFixed(2)} - {o.items?.length || 0} items
                </div>
                <div style={{display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1rem'}}>
                  <button className="btn-secondary" onClick={() => setSummaryOrder(o)}>👁️ Ver Resumen de Pedido</button>
                  <button className="btn-primary" onClick={() => updateOrderStatus(o.id, 'estadoCocina', 'PENDIENTE')}>Mandar a Cocina</button>
                  <div style={{display: 'flex', gap: '0.5rem'}}>
                    <button className="btn-secondary" style={{flex: 1, padding: '0.4rem'}} onClick={() => handleEditOrder(o)} title="Editar"><FileEdit size={16}/></button>
                    <button className="btn-secondary del-btn" style={{flex: 1, padding: '0.4rem', border: '1px solid var(--secondary-color)', fontSize: '0.85rem'}} onClick={() => handleCancelOrder(o)}>🗑️ Cancelar</button>
                  </div>
                </div>
              </div>
            ))}
            {activeOrders.filter(o => o.estadoCocina === 'BORRADOR').length === 0 && <p style={{color: 'var(--text-secondary)', textAlign: 'center', fontSize: '0.9rem'}}>No hay borradores.</p>}
          </div>
        </div>

        {/* COLUMNA 2: En Cocina */}
        <div className="kanban-col card" style={{minWidth: '320px', flex: 1, backgroundColor: 'rgba(255,255,255,0.02)'}}>
          <h3 style={{borderBottom: '2px solid var(--primary-color)', paddingBottom: '0.5rem', marginBottom: '1rem'}}>🔥 En Cocina</h3>
          <div style={{display: 'flex', flexDirection: 'column', gap: '1rem'}}>
            {activeOrders.filter(o => o.estadoCocina === 'PENDIENTE').map(o => (
              <div key={o.id} style={{backgroundColor: 'var(--bg-secondary)', padding: '1rem', borderRadius: '8px', borderLeft: '4px solid var(--primary-color)'}}>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'}}>
                  <strong>{o.clientName}</strong>
                  <div style={{display: 'flex', flexDirection: 'column', alignItems: 'flex-end'}}>
                    <span className="badge">{o.orderType}</span>
                    {o.deliveryTime && <span className="badge" style={{backgroundColor: '#673AB7', fontSize: '0.7rem', marginTop: '4px'}}>🕒 Entrega: {o.deliveryTime}</span>}
                    {o.scheduledTime && <span className="badge" style={{backgroundColor: '#FF5722', fontSize: '0.7rem', marginTop: '4px'}}>⏱ Cocina: {o.scheduledTime}</span>}
                  </div>
                </div>
                <div style={{fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0.5rem 0'}}>
                  L. {o.total.toFixed(2)} - {o.items?.length || 0} items
                </div>
                <div style={{display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1rem'}}>
                  <button className="btn-secondary" onClick={() => setSummaryOrder(o)}>👁️ Ver Resumen de Pedido</button>
                  <button className="btn-primary" onClick={() => updateOrderStatus(o.id, 'estadoCocina', 'LISTO')}>Marcar Listo</button>
                  {o.estadoPago === 'PENDIENTE' ? (
                    <button className="btn-primary" style={{backgroundColor: '#FF9800', color: 'white'}} onClick={() => { setPaymentMethod('EFECTIVO'); setAmountReceived(''); setModalDeliveryFee(0); setIncludeDeliveryInInvoice(true); setPaymentModalOrder(o); }}>Cobrar</button>
                  ) : (
                    <button className="btn-secondary" style={{padding: '0.4rem', border: '1px solid #4CAF50', color: '#4CAF50'}} onClick={() => handleReprintInvoice(o)}>🖨️ Imprimir Factura</button>
                  )}
                  <div style={{display: 'flex', gap: '0.5rem'}}>
                    <button className="btn-secondary" style={{flex: 1, padding: '0.4rem'}} onClick={() => handleEditOrder(o)} title="Editar"><FileEdit size={16}/></button>
                    <button className="btn-secondary del-btn" style={{flex: 1, padding: '0.4rem', border: '1px solid var(--secondary-color)', fontSize: '0.85rem'}} onClick={() => handleCancelOrder(o)}>🗑️ Cancelar</button>
                  </div>
                </div>
              </div>
            ))}
            {activeOrders.filter(o => o.estadoCocina === 'PENDIENTE').length === 0 && <p style={{color: 'var(--text-secondary)', textAlign: 'center', fontSize: '0.9rem'}}>No hay órdenes en cocina.</p>}
          </div>
        </div>

        {/* COLUMNA 3: Listos (Para entregar o Enviar a ruta) */}
        <div className="kanban-col card" style={{minWidth: '320px', flex: 1, backgroundColor: 'rgba(255,255,255,0.02)'}}>
          <h3 style={{borderBottom: '2px solid #FF9800', paddingBottom: '0.5rem', marginBottom: '1rem'}}>✅ Listos</h3>
          <div style={{display: 'flex', flexDirection: 'column', gap: '1rem'}}>
            {activeOrders.filter(o => o.estadoCocina === 'LISTO' && o.estadoEntrega === 'EN_LOCAL').map(o => (
              <div key={o.id} style={{backgroundColor: 'var(--bg-secondary)', padding: '1rem', borderRadius: '8px', borderLeft: '4px solid #FF9800'}}>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'}}>
                  <strong>{o.clientName}</strong>
                  <span className="badge" style={{backgroundColor: '#FF9800', color: 'black'}}>{o.orderType}</span>
                </div>
                <div style={{fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0.5rem 0'}}>
                  L. {o.total.toFixed(2)} | Pago: <strong style={{color: o.estadoPago === 'PENDIENTE' ? '#FF9800' : '#4CAF50'}}>{o.estadoPago}</strong>
                </div>
                <div style={{display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1rem'}}>
                  <button className="btn-secondary" onClick={() => setSummaryOrder(o)}>👁️ Ver Resumen de Pedido</button>
                  {o.orderType.includes('ENVIO') ? (
                    <button className="btn-secondary" onClick={() => { setDispatchOrder(o); setDriverName(''); setDriverPhone(''); setPayDriverFromRegister(true); setShowDispatchModal(true); }}>Enviar en Ruta</button>
                  ) : (
                    <button className="btn-primary" onClick={() => handleMarkDelivered(o)}>Entregar en Local</button>
                  )}
                  {o.estadoPago === 'PENDIENTE' ? (
                    <button className="btn-primary" style={{backgroundColor: '#FF9800', color: 'white'}} onClick={() => { setPaymentMethod('EFECTIVO'); setAmountReceived(''); setModalDeliveryFee(0); setIncludeDeliveryInInvoice(true); setPaymentModalOrder(o); }}>Cobrar</button>
                  ) : (
                    <button className="btn-secondary" style={{padding: '0.4rem', border: '1px solid #4CAF50', color: '#4CAF50'}} onClick={() => handleReprintInvoice(o)}>🖨️ Imprimir Factura</button>
                  )}
                  <div style={{display: 'flex', gap: '0.5rem'}}>
                    <button className="btn-secondary" style={{flex: 1, padding: '0.4rem'}} onClick={() => handleEditOrder(o)} title="Editar"><FileEdit size={16}/></button>
                    <button className="btn-secondary del-btn" style={{flex: 1, padding: '0.4rem', border: '1px solid var(--secondary-color)', fontSize: '0.85rem'}} onClick={() => handleCancelOrder(o)}>🗑️ Cancelar</button>
                  </div>
                </div>
              </div>
            ))}
            {activeOrders.filter(o => o.estadoCocina === 'LISTO' && o.estadoEntrega === 'EN_LOCAL').length === 0 && <p style={{color: 'var(--text-secondary)', textAlign: 'center', fontSize: '0.9rem'}}>No hay órdenes listas en local.</p>}
          </div>
        </div>

        {/* COLUMNA 4: Pendientes de Pago */}
        <div className="kanban-col card" style={{minWidth: '320px', flex: 1, backgroundColor: 'rgba(255,255,255,0.02)'}}>
          <h3 style={{borderBottom: '2px solid #FF9800', paddingBottom: '0.5rem', marginBottom: '1rem'}}>⏳ Pendientes de Pago</h3>
          <div style={{display: 'flex', flexDirection: 'column', gap: '1rem'}}>
            {activeOrders.filter(o => o.estadoPago === 'PENDIENTE' && o.estadoEntrega === 'ENTREGADO').map(o => (
              <div key={o.id} style={{backgroundColor: 'var(--bg-secondary)', padding: '1rem', borderRadius: '8px', borderLeft: '4px solid #FF9800'}}>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'}}>
                  <strong>{o.clientName}</strong>
                  <span className="badge" style={{backgroundColor: '#FF9800', color: 'white'}}>{o.orderType}</span>
                </div>
                {o.driverName && (
                  <div style={{fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem'}}>🛵 {o.driverName}</div>
                )}
                <div style={{fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0.5rem 0'}}>
                  L. {o.total.toFixed(2)} | Pago: <strong style={{color: '#FF9800'}}>{o.estadoPago}</strong>
                </div>
                <div style={{display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1rem'}}>
                  <button className="btn-primary" style={{backgroundColor: '#FF9800', color: 'white'}} onClick={() => { setPaymentMethod('EFECTIVO'); setAmountReceived(''); setModalDeliveryFee(0); setIncludeDeliveryInInvoice(true); setPaymentModalOrder(o); }}>Cobrar Ahora</button>
                  <button className="btn-secondary" style={{padding: '0.4rem', border: '1px solid #4CAF50', color: '#4CAF50'}} onClick={() => handleReprintInvoice(o)}>🖨️ Imprimir Factura</button>
                  <button className="btn-secondary del-btn" style={{padding: '0.4rem', border: '1px solid var(--secondary-color)', fontSize: '0.85rem'}} onClick={() => handleCancelOrder(o)}>🗑️ Cancelar Orden</button>
                </div>
              </div>
            ))}
            {activeOrders.filter(o => o.estadoPago === 'PENDIENTE' && o.estadoEntrega === 'ENTREGADO').length === 0 && <p style={{color: 'var(--text-secondary)', textAlign: 'center', fontSize: '0.9rem'}}>No hay órdenes pendientes de pago.</p>}
          </div>
        </div>

        {/* COLUMNA 5: Entregados Hoy */}
        <div className="kanban-col card" style={{minWidth: '320px', flex: 1, backgroundColor: 'rgba(255,255,255,0.02)', opacity: 0.8}}>
          <h3 style={{borderBottom: '2px solid #4CAF50', paddingBottom: '0.5rem', marginBottom: '1rem'}}>✅ Finalizados Hoy</h3>
          <div style={{display: 'flex', flexDirection: 'column', gap: '1rem'}}>
            {activeOrders.filter(o => o.estadoEntrega === 'ENTREGADO' && (o.estadoPago === 'PAGADO' || o.estadoPago === 'CREDITO')).map(o => (
              <div key={o.id} style={{backgroundColor: 'var(--bg-secondary)', padding: '1rem', borderRadius: '8px', borderLeft: '4px solid #4CAF50', opacity: 0.7}}>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'}}>
                  <strong style={{textDecoration: 'line-through'}}>{o.clientName}</strong>
                  <span className="badge" style={{backgroundColor: '#4CAF50', color: 'white'}}>{o.orderType}</span>
                </div>
                <div style={{fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0.5rem 0'}}>
                  L. {o.total.toFixed(2)} | Pago: <strong>{o.estadoPago}</strong>
                </div>
                {o.invoiceId && <div style={{fontSize: '0.8rem', color: 'var(--text-secondary)'}}>Fac: {o.invoiceId}</div>}
              </div>
            ))}
            {activeOrders.filter(o => o.estadoEntrega === 'ENTREGADO').length === 0 && <p style={{color: 'var(--text-secondary)', textAlign: 'center', fontSize: '0.9rem'}}>Sin entregas hoy.</p>}
          </div>
        </div>

      </div>

      {/* MODAL / DRAWER DE NUEVA ORDEN */}
      {isCreatingOrder && (
        <div className="modal-overlay" style={{backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 100, display: 'flex', justifyContent: 'flex-end'}}>
          <div className="modal-card" style={{width: '95%', maxWidth: '1200px', height: '95vh', margin: '2.5vh', display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden'}}>
            
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.5rem', backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)'}}>
              <h2 style={{margin: 0}}>📝 {editingOrderId ? 'Editando Orden' : 'Armar Nueva Orden'}</h2>
              <button className="icon-btn" style={{fontSize: '1.5rem'}} onClick={() => {
                setIsCreatingOrder(false);
                setEditingOrderId(null);
                setCart([]);
                setSelectedCustomer(null);
              }}>✕</button>
            </div>

            <div className="pos-container" style={{flex: 1, overflow: 'hidden'}}>
              
              {/* PESTAÑAS MÓVILES */}
              <div className="mobile-tabs-container">
                <button 
                  className={`mobile-tab-btn ${mobileTab === 'menu' ? 'active' : ''}`}
                  onClick={() => setMobileTab('menu')}
                >
                  Menú
                </button>
                <button 
                  className={`mobile-tab-btn ${mobileTab === 'ticket' ? 'active' : ''}`}
                  onClick={() => setMobileTab('ticket')}
                >
                  Ticket ({cart.reduce((sum, item) => sum + item.qty, 0)})
                </button>
              </div>

              {/* SECCIÓN IZQUIERDA: MENÚ */}
      <div className={`pos-menu-section ${mobileTab !== 'menu' ? 'mobile-hidden' : ''}`}>
        <div className="pos-header" style={{flexDirection: 'column', alignItems: 'flex-start'}}>
          <div style={{display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center', marginBottom: '1rem'}}>
            <h2 className="hide-title-mobile">Menú</h2>
            {dailyMenuConfig && (
              <div style={{display: 'flex', gap: '0.5rem'}}>
                <button className="btn-primary highlight-btn" onClick={openDailyMenuModal}>
                  🍲 Plato del Día
                </button>
                <button className="btn-primary highlight-btn" style={{backgroundColor: '#FF9800'}} onClick={() => setShowSopaModal(true)}>
                  🥣 Vender Sopa
                </button>
              </div>
            )}
          </div>

          {outOfStockItems.length > 0 && (
            <div style={{width: '100%', marginBottom: '1rem', padding: '0.5rem 0.75rem', backgroundColor: 'rgba(255, 82, 82, 0.1)', border: '1px solid #FF5252', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '0.5rem', overflowX: 'auto'}}>
              <strong style={{color: '#FF5252', whiteSpace: 'nowrap', fontSize: '0.9rem'}}>⚠️ Agotados:</strong>
              <div style={{display: 'flex', gap: '0.4rem'}}>
                {outOfStockItems.map(item => (
                  <span key={item.id} style={{fontSize: '0.8rem', color: '#FF5252', backgroundColor: 'rgba(255, 82, 82, 0.15)', padding: '0.1rem 0.4rem', borderRadius: '4px', whiteSpace: 'nowrap'}}>
                    {item.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div style={{display: 'flex', gap: '0.5rem', marginBottom: '1rem', width: '100%'}}>
            <div style={{flex: 1, position: 'relative'}}>
              <Search size={18} style={{position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)'}} />
              <input 
                type="text" 
                placeholder="Buscar platillo por nombre..." 
                value={menuSearchTerm}
                onChange={(e) => setMenuSearchTerm(e.target.value)}
                style={{width: '100%', padding: '0.6rem 1rem 0.6rem 2.2rem', borderRadius: '6px', border: '1px solid var(--border-color)', backgroundColor: 'rgba(0,0,0,0.2)', color: 'var(--text-primary)'}}
              />
            </div>
          </div>

          <div style={{display: 'flex', gap: '0.5rem', overflowX: 'auto', width: '100%', paddingBottom: '0.5rem'}}>
            {['Todos', 'platillo', 'pollo_frito', 'tacos', 'alitas', 'combo', 'bebida', 'extra'].map(cat => (
              <button 
                key={cat}
                className={`btn-secondary ${activeCategoryFilter === cat ? 'btn-primary' : ''}`}
                style={{padding: '0.4rem 0.8rem', fontSize: '0.85rem', textTransform: 'capitalize', whiteSpace: 'nowrap'}}
                onClick={() => setActiveCategoryFilter(cat)}
              >
                {cat.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        <div className="pos-grid">
          {items.filter(item => {
            const matchesCategory = activeCategoryFilter === 'Todos' || item.type === activeCategoryFilter;
            const matchesSearch = item.name.toLowerCase().includes(menuSearchTerm.toLowerCase());
            return matchesCategory && matchesSearch;
          }).map(item => {
            let stockDisplay = null;
            if (item.type === 'sopa' || item.name.toLowerCase().includes('sopa')) {
               if (dailyMenuConfig && dailyMenuConfig.sopasInventario && dailyMenuConfig.sopasInventario[item.id] !== undefined) {
                  const total = dailyMenuConfig.sopasInventario[item.id];
                  const sold = soldSoups[item.id] || 0;
                  const available = total - sold;
                  stockDisplay = <span className="badge" style={{backgroundColor: available <= 3 ? '#FF5252' : 'var(--primary-color)', fontSize: '0.75rem', padding: '0.2rem 0.4rem'}}>Quedan {available}</span>;
               }
            }

            return (
              <div key={item.id} className="pos-item-card card" onClick={() => handleItemClick(item)}>
                <h3 style={{display: 'flex', flexDirection: 'column', gap: '0.25rem'}}>
                  {item.name}
                  {stockDisplay && <div style={{marginTop: '0.25rem'}}>{stockDisplay}</div>}
                </h3>
                {item.hasVariations ? (
                   <p className="item-price" style={{fontSize: '0.85rem'}}>Varios precios</p>
                ) : (
                   <p className="item-price">L. {item.price.toFixed(2)}</p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* SECCIÓN DERECHA: TICKET/CARRITO */}
      <div className={`pos-ticket-section card ${mobileTab !== 'ticket' ? 'mobile-hidden' : ''}`}>
        <div className="ticket-header hide-title-mobile">
          <h2><ShoppingCart size={24} /> Ticket</h2>
        </div>

        <div className="client-info" style={{padding: '0.5rem 1rem', borderBottom: '1px solid var(--border-color)', backgroundColor: 'rgba(255,255,255,0.02)'}}>
           <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
             <span style={{color: 'var(--text-secondary)', fontSize: '0.9rem'}}>Cliente seleccionado:</span>
             <strong style={{color: selectedCustomer ? 'var(--text-primary)' : 'var(--accent-color)'}}>
               {selectedCustomer ? `👤 ${selectedCustomer.name}` : 'Ninguno (Asignar al Procesar)'}
             </strong>
           </div>
        </div>

        <div className="ticket-items">
          {cart.length === 0 && <p className="empty-cart">No hay artículos seleccionados</p>}
          {cart.map(item => {
            const extraCost = (item.addedExtras || []).reduce((sum, e) => sum + e.price, 0);
            return (
              <div key={item.cartId} className="ticket-item">
                <div className="ticket-item-info">
                  <strong>{item.name}</strong>
                  <span>L. {((item.price + extraCost) * item.qty).toFixed(2)} {item.qty > 1 && <small style={{color:'var(--text-secondary)'}}> (L.{(item.price + extraCost).toFixed(2)} c/u)</small>}</span>
                  {item.comment && <div style={{fontSize: '0.8rem', color: 'var(--accent-color)', fontStyle: 'italic'}}>"{item.comment}"</div>}
                  {item.addedExtras && item.addedExtras.length > 0 && (
                    <div style={{fontSize: '0.8rem', color: 'var(--text-secondary)'}}>
                      + {item.addedExtras.map(e => `${e.name} (L.${e.price})`).join(', ')}
                    </div>
                  )}
                </div>
                <div className="ticket-item-actions" style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                  <div style={{display: 'flex', alignItems: 'center', gap: '0.25rem', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '4px', padding: '2px'}}>
                    <button className="icon-btn" style={{padding: '2px 6px', fontSize: '1rem'}} onClick={() => updateCartItemQty(item.cartId, -1)} disabled={item.qty <= 1}>-</button>
                    <span style={{fontWeight: 'bold', width: '20px', textAlign: 'center'}}>{item.qty}</span>
                    <button className="icon-btn" style={{padding: '2px 6px', fontSize: '1rem'}} onClick={() => updateCartItemQty(item.cartId, 1)}>+</button>
                  </div>
                  <button className="icon-btn" title="Editar/Comentario" onClick={() => openEditCartItem(item)}><FileEdit size={16}/></button>
                  <button className="icon-btn del-btn" onClick={() => removeFromCart(item.cartId)}>✕</button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="ticket-footer">
          <div className="ticket-totals">
            <h3>Subtotal Productos: <span>L. {subtotalItems.toFixed(2)}</span></h3>
            <h2 className="total">Total: <span>L. {total.toFixed(2)}</span></h2>
          </div>
          
          <div style={{display: 'flex', gap: '0.5rem', marginTop: '1rem'}}>
            <button className="btn-primary send-btn" onClick={() => {
              if (cart.length === 0) return toast.error('El carrito está vacío');
              setShowCheckoutModal(true);
            }}>
              Procesar Pedido ➔
            </button>
          </div>
          {editingOrderId && (
            <button className="btn-secondary" style={{width: '100%', marginTop: '0.5rem'}} onClick={() => {
              setEditingOrderId(null);
              setCart([]);
              setSelectedCustomer(null);
            }}>Cancelar Edición</button>
          )}
        </div>
      </div>

      {showSopaModal && dailyMenuData && (
        <div className="modal-overlay">
          <div className="modal-card card" style={{maxWidth: '600px'}}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem'}}>
              <h2>🥣 Sopas del Día</h2>
              <button className="icon-btn" onClick={() => setShowSopaModal(false)}>✕</button>
            </div>
            
            <div className="pos-grid">
              {dailyMenuData.sopas.map(item => {
                const total = (dailyMenuConfig.sopasInventario || {})[item.id] || 0;
                const sold = soldSoups[item.id] || 0;
                const available = total - sold;
                const stockDisplay = <span className="badge" style={{backgroundColor: available <= 3 ? '#FF5252' : 'var(--primary-color)', fontSize: '0.75rem', padding: '0.2rem 0.4rem'}}>Quedan {available}</span>;

                return (
                  <div key={item.id} className="pos-item-card card" onClick={() => { addToCartDirect(item); setShowSopaModal(false); }}>
                    <h3 style={{display: 'flex', flexDirection: 'column', gap: '0.25rem'}}>
                      {item.name}
                      <div style={{marginTop: '0.25rem'}}>{stockDisplay}</div>
                    </h3>
                    <p className="item-price">L. {item.price.toFixed(2)}</p>
                  </div>
                );
              })}
              {dailyMenuData.sopas.length === 0 && <p style={{gridColumn: '1 / -1', color: 'var(--text-secondary)'}}>No hay sopas configuradas para hoy.</p>}
            </div>
          </div>
        </div>
      )}

      {showVariationModal && selectedItem && (
        <div className="modal-overlay" style={{padding: '1rem'}}>
          <div className="modal-card card" style={{maxWidth: '500px', maxHeight: '95vh', overflowY: 'auto', display: 'flex', flexDirection: 'column'}}>
            <h2>Configurar: {selectedItem.name}</h2>
            <div style={{overflowY: 'auto', flex: 1, paddingRight: '0.5rem', marginTop: '1rem'}}>
            
            {selectedItem.hasVariations && selectedItem.type !== 'alitas' && (
              <div style={{marginTop: '1rem'}}>
                <h3 style={{fontSize: '1rem', marginBottom: '0.5rem', color: 'var(--text-secondary)'}}>Añadir Variaciones (Cantidades):</h3>
                <div style={{display: 'flex', flexDirection: 'column', gap: '0.5rem'}}>
                  {selectedItem.variations.map(v => {
                    const qty = variationQtys[v.id] || 0;
                    return (
                      <div key={v.id} style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '8px', border: qty > 0 ? '1px solid var(--accent-color)' : '1px solid transparent'}}>
                        <div style={{display: 'flex', flexDirection: 'column'}}>
                          <span style={{fontSize: '1.1rem'}}>{v.name}</span>
                          <strong style={{color: 'var(--accent-color)', fontSize: '1.1rem'}}>L. {v.price}</strong>
                        </div>
                        <div style={{display: 'flex', alignItems: 'center', gap: '1rem'}}>
                           <button className="icon-btn" style={{padding: '0.5rem 1rem', fontSize: '1.2rem'}} onClick={() => setVariationQtys({...variationQtys, [v.id]: Math.max(0, qty - 1)})}>-</button>
                           <span style={{fontWeight: 'bold', fontSize: '1.4rem', minWidth: '30px', textAlign: 'center'}}>{qty}</span>
                           <button className="icon-btn" style={{padding: '0.5rem 1rem', fontSize: '1.2rem'}} onClick={() => setVariationQtys({...variationQtys, [v.id]: qty + 1})}>+</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {selectedItem.hasVariations && selectedItem.type === 'alitas' && (
              <div style={{marginTop: '1rem'}}>
                <h3 style={{fontSize: '1rem', marginBottom: '0.5rem', color: 'var(--text-secondary)'}}>1. Selecciona el Tamaño:</h3>
                <div style={{display: 'flex', flexDirection: 'column', gap: '0.5rem'}}>
                  {selectedItem.variations.map(v => {
                    const isSelected = selectedVariation?.id === v.id;
                    return (
                      <div key={v.id} onClick={() => { setSelectedVariation(v); setSelectedSauces([]); }} style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '8px', border: isSelected ? '2px solid var(--primary-color)' : '1px solid transparent', cursor: 'pointer'}}>
                        <div style={{display: 'flex', flexDirection: 'column'}}>
                          <span style={{fontSize: '1.1rem'}}>{v.name}</span>
                          <strong style={{color: 'var(--primary-color)', fontSize: '1.1rem'}}>L. {v.price}</strong>
                        </div>
                        {isSelected && <div style={{color: 'var(--primary-color)', fontSize: '1.5rem', fontWeight: 'bold'}}>✓</div>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            
            {selectedItem.type === 'alitas' && (
              <div style={{marginTop: '1.5rem'}}>
                <h3 style={{fontSize: '1rem', marginBottom: '0.5rem', color: 'var(--text-secondary)'}}>
                  2. Salsas (Max {
                    (() => {
                      const n = selectedVariation?.name || '';
                      if (n.includes('6')) return 1;
                      if (n.includes('8') || n.includes('12')) return 2;
                      if (n.includes('18')) return 3;
                      if (n.includes('24')) return 4;
                      return 1;
                    })()
                  }):
                </h3>
                <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem'}}>
                  {salsasDisponibles.map(s => (
                    <label key={s.id} style={{display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '4px', cursor: 'pointer'}}>
                      <input 
                        type="checkbox" 
                        checked={!!selectedSauces.find(x => x.id === s.id)}
                        onChange={() => toggleSauce(s)}
                      />
                      <span>{s.name}</span>
                    </label>
                  ))}
                  {salsasDisponibles.length === 0 && <p style={{gridColumn: '1 / -1', fontSize: '0.9rem'}}>No hay salsas disponibles.</p>}
                </div>
              </div>
            )}
            
            {(!selectedItem.hasVariations || selectedItem.type === 'alitas') && (
              <div style={{marginTop: '1.5rem'}}>
                <h3 style={{fontSize: '1rem', marginBottom: '0.5rem', color: 'var(--text-secondary)'}}>{selectedItem.type === 'alitas' ? '3. Cantidad de Órdenes:' : 'Cantidad:'}</h3>
                <div style={{display: 'flex', alignItems: 'center', gap: '1rem'}}>
                  <button className="icon-btn" style={{padding: '0.5rem 1rem', fontSize: '1.5rem'}} onClick={() => setModalGlobalQty(Math.max(1, modalGlobalQty - 1))}>-</button>
                  <span style={{fontWeight: 'bold', fontSize: '1.5rem', minWidth: '40px', textAlign: 'center'}}>{modalGlobalQty}</span>
                  <button className="icon-btn" style={{padding: '0.5rem 1rem', fontSize: '1.5rem'}} onClick={() => setModalGlobalQty(modalGlobalQty + 1)}>+</button>
                </div>
              </div>
            )}

            </div>
            <div className="form-actions" style={{marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)'}}>
              <button className="btn-secondary" onClick={() => setShowVariationModal(false)}>Cancelar</button>
              <button className="btn-primary" onClick={handleConfirmVariation}>Confirmar y Añadir</button>
            </div>
          </div>
        </div>
      )}

      {editingCartItem && (
        <div className="modal-overlay">
          <div className="modal-card card" style={{maxWidth: '450px'}}>
            <h2>Personalizar: {editingCartItem.name}</h2>
            
            <div className="form-group" style={{marginTop: '1rem'}}>
              <label>Precio Manual (L.):</label>
              <input type="number" step="0.01" className="input-field" value={cartItemPrice} onChange={e => setCartItemPrice(e.target.value)} />
            </div>

            <div className="form-group">
              <label>Comentario para Cocina (ej. "Sin cebolla", "Para llevar")</label>
              <input type="text" className="input-field" value={cartItemComment} onChange={e => setCartItemComment(e.target.value)} placeholder="Opcional..." />
            </div>

            <div style={{marginTop: '1.5rem'}}>
              <h3 style={{fontSize: '1rem', marginBottom: '0.5rem', color: 'var(--text-secondary)'}}>Agregar Extras:</h3>
              <div style={{display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '200px', overflowY: 'auto'}}>
                {availableExtras.map(extra => (
                  <label key={extra.id} style={{display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '4px', cursor: 'pointer'}}>
                    <input 
                      type="checkbox" 
                      checked={!!cartItemExtras.find(x => x.id === extra.id)}
                      onChange={() => toggleCartItemExtra(extra)}
                    />
                    <span style={{flex: 1}}>{extra.name}</span>
                    <strong style={{color: 'var(--accent-color)'}}>+ L. {extra.price}</strong>
                  </label>
                ))}
                {availableExtras.length === 0 && <p style={{fontSize: '0.9rem', color: 'var(--text-secondary)'}}>No hay extras configurados en el sistema.</p>}
              </div>
            </div>

            <div className="form-actions" style={{marginTop: '2rem'}}>
              <button className="btn-secondary" onClick={() => setEditingCartItem(null)}>Cancelar</button>
              <button className="btn-primary" onClick={handleSaveCartItemEdits}>Guardar Cambios</button>
            </div>
          </div>
        </div>
      )}

      {showDailyMenuModal && dailyMenuConfig && (
        <div className="modal-overlay" style={{zIndex: 110}}>
          <div className="modal-card card" style={{maxWidth: '600px', width: '90%', maxHeight: '90vh', overflowY: 'auto'}}>
            <h2 style={{borderBottom: '2px solid var(--accent-color)', paddingBottom: '0.5rem', marginBottom: '1rem'}}>🍽️ Armar Plato del Día</h2>
            
            <div style={{display: 'flex', gap: '1rem', marginBottom: '1.5rem'}}>
              <label style={{flex: 1, display: 'flex', flexDirection: 'column', padding: '1rem', backgroundColor: dmSize === 'COMPLETO' ? 'rgba(255,152,0,0.1)' : 'rgba(255,255,255,0.05)', border: dmSize === 'COMPLETO' ? '2px solid var(--accent-color)' : '2px solid transparent', borderRadius: '8px', cursor: 'pointer', textAlign: 'center'}}>
                <input type="radio" name="dmsize" checked={dmSize === 'COMPLETO'} onChange={() => { setDmSize('COMPLETO'); setDmSelectedSides([]); }} style={{display: 'none'}} />
                <strong style={{fontSize: '1.2rem', color: dmSize === 'COMPLETO' ? 'var(--accent-color)' : 'inherit'}}>COMPLETO</strong>
                <span style={{fontSize: '1.1rem', fontWeight: 'bold'}}>L. {dailyMenuConfig.precioCompleto}</span>
                <span style={{fontSize: '0.85rem', color: 'var(--text-secondary)'}}>{dailyMenuConfig.acompanantesCompleto} Acompañantes + {dailyMenuConfig.tortillasCompleto} Tortillas</span>
              </label>

              <label style={{flex: 1, display: 'flex', flexDirection: 'column', padding: '1rem', backgroundColor: dmSize === 'MEDIO' ? 'rgba(255,152,0,0.1)' : 'rgba(255,255,255,0.05)', border: dmSize === 'MEDIO' ? '2px solid var(--accent-color)' : '2px solid transparent', borderRadius: '8px', cursor: 'pointer', textAlign: 'center'}}>
                <input type="radio" name="dmsize" checked={dmSize === 'MEDIO'} onChange={() => { setDmSize('MEDIO'); setDmSelectedSides([]); }} style={{display: 'none'}} />
                <strong style={{fontSize: '1.2rem', color: dmSize === 'MEDIO' ? 'var(--accent-color)' : 'inherit'}}>MEDIO (1/2)</strong>
                <span style={{fontSize: '1.1rem', fontWeight: 'bold'}}>L. {dailyMenuConfig.precioMedio}</span>
                <span style={{fontSize: '0.85rem', color: 'var(--text-secondary)'}}>{dailyMenuConfig.acompanantesMedio} Acompañantes + {dailyMenuConfig.tortillasMedio} Tortillas</span>
              </label>
            </div>

            <div style={{marginBottom: '1.5rem'}}>
              <h3 style={{fontSize: '1.1rem', marginBottom: '0.5rem'}}>1. Selecciona la Carne (Elige 1)</h3>
              <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.5rem'}}>
                {dailyMenuData.carnes.map(carne => (
                  <label key={carne.id} style={{display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '4px', cursor: 'pointer', border: dmSelectedCarne?.id === carne.id ? '1px solid var(--accent-color)' : '1px solid transparent'}}>
                    <input type="radio" name="dmcarne" checked={dmSelectedCarne?.id === carne.id} onChange={() => setDmSelectedCarne(carne)} />
                    <span>{carne.name}</span>
                  </label>
                ))}
              </div>
            </div>

            <div style={{marginBottom: '1.5rem'}}>
              <h3 style={{fontSize: '1.1rem', marginBottom: '0.5rem'}}>2. Selecciona Acompañantes (Máx sin costo: {dmSize === 'COMPLETO' ? dailyMenuConfig.acompanantesCompleto : dailyMenuConfig.acompanantesMedio})</h3>
              <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.5rem'}}>
                {dailyMenuData.acompanantes.map(side => {
                  const selection = dmSelectedSides.find(s => s.side.id === side.id);
                  const qty = selection ? selection.qty : 0;
                  return (
                    <div key={side.id} style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '4px', border: qty > 0 ? '1px solid var(--accent-color)' : '1px solid transparent'}}>
                      <span>{side.name}</span>
                      <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                        <button className="icon-btn" style={{padding: '2px 8px'}} onClick={() => updateDmSideQty(side, -1)} disabled={qty === 0}>-</button>
                        <span style={{fontWeight: 'bold', width: '20px', textAlign: 'center'}}>{qty}</span>
                        <button className="icon-btn" style={{padding: '2px 8px'}} onClick={() => updateDmSideQty(side, 1)}>+</button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            <div style={{marginBottom: '1.5rem'}}>
              <h3 style={{fontSize: '1.1rem', marginBottom: '0.5rem'}}>3. Cantidad de Platos Idénticos</h3>
              <div style={{display: 'flex', alignItems: 'center', gap: '1rem'}}>
                <button className="btn-secondary" style={{fontSize: '1.5rem', padding: '0.5rem 1rem'}} onClick={() => setDmQuantity(Math.max(1, dmQuantity - 1))}>-</button>
                <span style={{fontSize: '1.5rem', fontWeight: 'bold'}}>{dmQuantity}</span>
                <button className="btn-secondary" style={{fontSize: '1.5rem', padding: '0.5rem 1rem'}} onClick={() => setDmQuantity(dmQuantity + 1)}>+</button>
              </div>
              <p style={{fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.5rem'}}>Si necesitas platos con diferentes carnes o acompañantes, agrégalos por separado al carrito.</p>
            </div>

            <div className="form-actions">
              <button className="btn-secondary" onClick={() => setShowDailyMenuModal(false)}>Cancelar</button>
              <button className="btn-primary" onClick={handleAddDailyMenuToCart}>Añadir al Carrito ({dmQuantity})</button>
            </div>
          </div>
        </div>
      )}


            </div>
          </div>
        </div>
      )}

      {paymentModalOrder && (
        <div className="modal-overlay">
          <div className="modal-card card" style={{maxWidth: '400px'}}>
            <h2>Cobrar Orden</h2>
            
            {paymentModalOrder.orderType === 'ENVIO_COBRADO' && (
              <div style={{backgroundColor: 'rgba(59, 130, 246, 0.1)', padding: '1rem', borderRadius: '8px', marginBottom: '1rem', border: '1px solid rgba(59, 130, 246, 0.3)'}}>
                <div className="form-group" style={{marginBottom: '0.5rem'}}>
                  <label>Costo del Envío (L.)</label>
                  <input type="number" className="input-field" min="0" value={modalDeliveryFee} onChange={e => setModalDeliveryFee(Number(e.target.value))} />
                </div>
                <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                  <input type="checkbox" id="includeDelivery" checked={includeDeliveryInInvoice} onChange={e => setIncludeDeliveryInInvoice(e.target.checked)} />
                  <label htmlFor="includeDelivery" style={{cursor: 'pointer', fontSize: '0.9rem'}}>Mostrar costo de envío en la factura (como cargo de tercero)</label>
                </div>
              </div>
            )}
            
            {(() => {
              const baseTotal = paymentModalOrder.total;
              const hasDelivery = paymentModalOrder.orderType === 'ENVIO_COBRADO';
              
              const invoiceTotal = baseTotal + (hasDelivery && includeDeliveryInInvoice ? modalDeliveryFee : 0);
              const finalTotal = baseTotal + (hasDelivery ? modalDeliveryFee : 0);
              
              let expectedToCollect = finalTotal;
              let label = "Total a Cobrar en Caja:";
              
              if (hasDelivery) {
                 if (paymentMethod === 'EFECTIVO') {
                    expectedToCollect = baseTotal;
                 } else if (paymentMethod === 'TRANSFERENCIA' && !deliveryPaidByTransfer) {
                    expectedToCollect = baseTotal;
                 }
              }
              
              if (paymentMethod === 'TRANSFERENCIA') label = "Total a Recibir en Banco:";
              if (paymentMethod === 'CREDITO') label = "Total a Cargar a Cuenta:";

              return (
                <div style={{fontSize: '1.5rem', fontWeight: 'bold', margin: '1rem 0', color: 'var(--accent-color)', textAlign: 'center'}}>
                  <div style={{fontSize: '1.1rem', color: 'var(--text-secondary)'}}>
                     Total Factura: L. {invoiceTotal.toFixed(2)}
                  </div>
                  {label} L. {expectedToCollect.toFixed(2)}
                </div>
              );
            })()}
            
            <div className="form-group">
              <label>Método de Pago</label>
              <select className="input-field" value={paymentMethod} onChange={e => { setPaymentMethod(e.target.value); setAmountReceived(''); }}>
                <option value="EFECTIVO">Efectivo</option>
                <option value="TRANSFERENCIA">Transferencia</option>
                <option value="CREDITO">Crédito (Cuenta Cliente)</option>
              </select>
            </div>

            {paymentMethod === 'TRANSFERENCIA' && (
              <div className="form-group">
                <label>Banco de Destino</label>
                <select className="input-field" value={paymentBank} onChange={e => setPaymentBank(e.target.value)}>
                  <option value="Bac Antony">Bac Antony</option>
                  <option value="Bac Delmy">Bac Delmy</option>
                  <option value="Bac Elmer">Bac Elmer</option>
                  <option value="Banpais">Banpais</option>
                  <option value="Atlantida">Atlantida</option>
                  <option value="Ficohsa">Ficohsa</option>
                  <option value="Davivienda">Davivienda</option>
                  <option value="Occidente">Occidente</option>
                </select>
                {paymentModalOrder.orderType === 'ENVIO_COBRADO' && (
                  <div style={{marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.8rem', backgroundColor: 'rgba(246, 167, 75, 0.1)', borderRadius: '8px', border: '1px solid rgba(246, 167, 75, 0.3)'}}>
                    <input 
                      type="checkbox" 
                      id="deliveryPaidByTransfer" 
                      checked={deliveryPaidByTransfer} 
                      onChange={e => setDeliveryPaidByTransfer(e.target.checked)} 
                    />
                    <label htmlFor="deliveryPaidByTransfer" style={{cursor: 'pointer', fontSize: '0.9rem', margin: 0}}>El cliente depositó/transfirió también el cobro de envío (L. {modalDeliveryFee})</label>
                  </div>
                )}
              </div>
            )}

            {paymentMethod === 'EFECTIVO' && (
              <div className="form-group">
                <label>Monto Recibido L.</label>
                <input type="number" className="input-field" value={amountReceived} onChange={e => setAmountReceived(e.target.value)} autoFocus />
                {(() => {
                  const hasDelivery = paymentModalOrder.orderType === 'ENVIO_COBRADO';
                  let expectedToCollect = paymentModalOrder.total + (hasDelivery ? modalDeliveryFee : 0);
                  if (hasDelivery) expectedToCollect = paymentModalOrder.total;

                  return amountReceived && Number(amountReceived) >= expectedToCollect && (
                    <div style={{marginTop: '0.5rem', fontSize: '1.2rem', color: '#4CAF50', fontWeight: 'bold', textAlign: 'center'}}>
                      Vuelto: L. {(Number(amountReceived) - expectedToCollect).toFixed(2)}
                    </div>
                  );
                })()}
              </div>
            )}

            <div className="form-actions" style={{marginTop: '2rem'}}>
              <button className="btn-secondary" onClick={() => setPaymentModalOrder(null)}>Cancelar</button>
              <button className="btn-primary" onClick={handleConfirmPayment}>Confirmar Cobro</button>
            </div>
          </div>
        </div>
      )}
      
      {unpaidWarningOrder && (
        <div className="modal-overlay" style={{zIndex: 120}}>
          <div className="modal-card card" style={{maxWidth: '400px', textAlign: 'center'}}>
            <h2 style={{color: '#FF9800', marginBottom: '1rem'}}>⚠️ Pedido sin cobrar</h2>
            <p style={{marginBottom: '1.5rem'}}>Este pedido (<strong>{unpaidWarningOrder.clientName}</strong>) no ha sido pagado. ¿Qué deseas hacer?</p>
            <div style={{display: 'flex', flexDirection: 'column', gap: '1rem'}}>
              <button className="btn-secondary" onClick={() => {
                updateOrderStatus(unpaidWarningOrder.id, 'estadoEntrega', 'ENTREGADO');
                setUnpaidWarningOrder(null);
              }}>Dejar como Pendiente de Pago</button>
              <button className="btn-primary" style={{backgroundColor: '#FF9800'}} onClick={() => {
                setPaymentMethod('EFECTIVO'); 
                setAmountReceived(''); 
                setModalDeliveryFee(0); 
                setIncludeDeliveryInInvoice(true); 
                setPaymentModalOrder(unpaidWarningOrder);
                setUnpaidWarningOrder(null);
              }}>Cobrar Ahora</button>
            </div>
            <button className="btn-secondary" style={{marginTop: '1.5rem', width: '100%'}} onClick={() => setUnpaidWarningOrder(null)}>Cancelar</button>
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
          <div className="modal-card card" style={{maxWidth: '400px'}}>
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
                  driverPhone
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
          <div className="modal-card card" style={{maxWidth: '600px', width: '90%'}}>
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

      {showNewCustomerForm && (
        <div className="modal-overlay" style={{zIndex: 9999}}>
          <div className="modal-card card" style={{maxWidth: '400px'}}>
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
