export const printInvoice = (invoice) => {
  if (!invoice) return;

  const date = invoice.createdAt?.toDate ? invoice.createdAt.toDate().toLocaleString() : new Date().toLocaleString();
  
  let itemsHtml = '';
  (invoice.items || []).forEach(item => {
    const extraCost = (item.addedExtras || []).reduce((sum, e) => sum + e.price, 0);
    const itemTotal = (item.price + extraCost) * (item.qty || 1);
    
    let extrasHtml = '';
    if (item.addedExtras && item.addedExtras.length > 0) {
      extrasHtml = `<div style="font-size: 10px; color: #555;">+ ${item.addedExtras.map(e => e.name).join(', ')}</div>`;
    }
    
    itemsHtml += `
      <tr>
        <td style="vertical-align: top; padding-top: 5px; border-bottom: 1px dashed #ccc;">${item.qty || 1}</td>
        <td style="padding-top: 5px; padding-right: 5px; border-bottom: 1px dashed #ccc;">
          ${item.name}
          ${extrasHtml}
        </td>
        <td style="text-align: right; vertical-align: top; padding-top: 5px; border-bottom: 1px dashed #ccc;">L. ${itemTotal.toFixed(2)}</td>
      </tr>
    `;
  });

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Factura ${invoice.id}</title>
      <style>
        body {
          font-family: monospace;
          font-size: 12px;
          margin: 0;
          padding: 10px;
          color: black;
          background: white;
          width: 80mm; /* Standard thermal receipt width */
        }
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .font-bold { font-weight: bold; }
        table { width: 100%; border-collapse: collapse; }
        hr { border: none; border-top: 1px dashed black; margin: 10px 0; }
        p { margin: 2px 0; }
        h2 { margin: 0 0 5px 0; font-size: 16px; }
        h3 { margin: 5px 0; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="text-center" style="margin-bottom: 15px;">
        <h2>Restaurante La Sopota</h2>
        <p>Barrio El Centro, Honduras</p>
        <p>Tel: +504 9956-2568</p>
        <p>RTN: 00000000000000</p>
        <hr />
        <h3>FACTURA ${invoice.id}</h3>
      </div>
      
      <div style="margin-bottom: 10px;">
        <p><strong>Fecha:</strong> ${date}</p>
        <p><strong>Cliente:</strong> ${invoice.razonSocial || invoice.clientName || 'Consumidor Final'}</p>
        ${invoice.rtn ? `<p><strong>RTN:</strong> ${invoice.rtn}</p>` : ''}
        <p><strong>Pago:</strong> ${invoice.metodoPago} ${invoice.banco ? `(${invoice.banco})` : ''}</p>
        ${invoice.orderType ? `<p><strong>Tipo:</strong> ${invoice.orderType}</p>` : ''}
      </div>
      
      <hr />
      
      <table style="margin-bottom: 10px;">
        <thead>
          <tr>
            <th style="text-align: left; border-bottom: 1px solid black; padding-bottom: 5px;">Cant</th>
            <th style="text-align: left; border-bottom: 1px solid black; padding-bottom: 5px;">Desc</th>
            <th style="text-align: right; border-bottom: 1px solid black; padding-bottom: 5px;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>

      ${(invoice.deliveryFee && invoice.includeDeliveryInInvoice) ? `
        <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
          <span>Subtotal Consumo:</span>
          <span>L. ${(invoice.foodTotal || (invoice.total - invoice.deliveryFee)).toFixed(2)}</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
          <span>Servicio de Delivery:</span>
          <span>L. ${invoice.deliveryFee.toFixed(2)}</span>
        </div>
      ` : ''}

      <hr />
      
      <div class="text-right font-bold" style="font-size: 14px;">
        TOTAL: L. ${Number((!invoice.includeDeliveryInInvoice && invoice.deliveryFee) ? invoice.foodTotal || (invoice.total - invoice.deliveryFee) : invoice.total || 0).toFixed(2)}
      </div>

      <div class="text-center" style="margin-top: 20px; font-size: 11px;">
        <p>Estado: ${invoice.estado || 'PAGADA'}</p>
        <p style="margin: 10px 0;">¡Gracias por su compra!</p>
        <p>Las mejores sopas de la ciudad.</p>
      </div>
    </body>
    </html>
  `;

  triggerPrint(html);
};

export const printReceipt = (receipt) => {
  if (!receipt) return;

  const date = receipt.createdAt?.toDate ? receipt.createdAt.toDate().toLocaleString() : new Date().toLocaleString();

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Recibo ${receipt.id}</title>
      <style>
        body {
          font-family: monospace;
          font-size: 12px;
          margin: 0;
          padding: 10px;
          color: black;
          background: white;
          width: 80mm;
        }
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .font-bold { font-weight: bold; }
        hr { border: none; border-top: 1px dashed black; margin: 10px 0; }
        p { margin: 4px 0; }
        h2 { margin: 0 0 5px 0; font-size: 16px; }
        h3 { margin: 5px 0; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="text-center" style="margin-bottom: 15px;">
        <h2>Restaurante La Sopota</h2>
        <p>Barrio El Centro, Honduras</p>
        <hr />
        <h3>COMPROBANTE DE PAGO</h3>
        <h3>${receipt.id}</h3>
      </div>
      
      <div style="margin-bottom: 15px;">
        <p><strong>Fecha:</strong> ${date}</p>
        <p><strong>Cliente:</strong> ${receipt.clientName}</p>
        <p><strong>Atendido por:</strong> Caja</p>
      </div>
      
      <hr />
      
      <div style="margin-bottom: 15px;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
          <span>Saldo Anterior:</span>
          <span>L. ${Number(receipt.oldBalance || 0).toFixed(2)}</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 5px; font-weight: bold;">
          <span>Abono Recibido:</span>
          <span>- L. ${Number(receipt.amount || 0).toFixed(2)}</span>
        </div>
        <hr style="border-top: 1px solid black;" />
        <div style="display: flex; justify-content: space-between; margin-top: 5px; font-size: 14px;" class="font-bold">
          <span>Nuevo Saldo:</span>
          <span>L. ${Number(receipt.newBalance || 0).toFixed(2)}</span>
        </div>
      </div>

      <div class="text-center" style="margin-top: 30px; font-size: 11px;">
        <p>Firma Cliente: _________________</p>
        <p style="margin-top: 15px;">¡Gracias por su pago!</p>
      </div>
    </body>
    </html>
  `;

  triggerPrint(html);
};

// Helper function to handle the actual printing popup
const triggerPrint = (htmlContent) => {
  // Create a hidden iframe for printing
  const iframe = document.createElement('iframe');
  iframe.style.position = 'absolute';
  iframe.style.width = '0px';
  iframe.style.height = '0px';
  iframe.style.border = 'none';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow.document;
  doc.open();
  doc.write(htmlContent);
  doc.close();

  // Wait for content to load and print
  setTimeout(() => {
    iframe.contentWindow.focus();
    iframe.contentWindow.print();
    
    // Remove iframe after printing is done (or cancelled)
    setTimeout(() => {
      document.body.removeChild(iframe);
    }, 1000);
  }, 250);
};
