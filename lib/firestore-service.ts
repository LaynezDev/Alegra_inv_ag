import { adminDb } from "@/lib/firebase-admin";
import { Timestamp, FieldValue } from "firebase-admin/firestore";
import { calculateCostByWeight } from "@/lib/utils";

export interface FirestoreDepartment {
  id: string;
  name: string;
  municipalities: string[];
}

export interface FirestorePackage {
  id: string;
  code: string;
  packageType: string;
  costPrice: number;
  invoiceNumber: string;
  totalWeight: number | null;
  status: string; // recibido, en_desglose, agotado
  notes: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface FirestoreProduct {
  id: string;
  packageId: string;
  packageCode?: string;
  barcode: string;
  name: string;
  weight: number | null;
  calculatedCost: number;
  salePrice: number;
  photos: string[];
  status: "disponible" | "apartado" | "vendido" | "dado_de_baja";
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface FirestoreCustomer {
  id: string;
  barcode: string;
  fullName: string;
  tiktokUsername: string | null;
  instagramUsername: string | null;
  facebookUsername: string | null;
  phonePrimary: string;
  phoneSecondary: string | null;
  fullAddress: string;
  addressReference: string | null;
  departmentId?: string;
  departmentName: string;
  municipalityId?: string;
  municipalityName: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface FirestoreOrderItem {
  productId: string;
  barcode: string;
  name: string;
  originalPrice: number;
  discountAmount: number;
  finalPrice: number;
  photos?: string[];
}

export interface FirestoreOrderPayment {
  id: string;
  referenceNumber: string;
  paymentMethod: string;
  amount: number;
  paymentDate: Date | string;
  notes?: string | null;
}

export interface FirestoreOrder {
  id: string;
  orderNumber: string;
  customerId: string;
  customer: {
    fullName: string;
    phonePrimary: string;
    tiktokUsername?: string | null;
    instagramUsername?: string | null;
    fullAddress: string;
    department: { name: string };
    municipality: { name: string };
  };
  status: "pendiente_pago" | "pagado" | "enviado" | "entregado" | "cancelado";
  subtotal: number;
  totalDiscount: number;
  totalAmount: number;
  items: FirestoreOrderItem[];
  payments: FirestoreOrderPayment[];
  notes?: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

// -----------------------------------------------------------
// DEPARTAMENTOS Y MUNICIPIOS
// -----------------------------------------------------------
export async function getFirestoreDepartments(): Promise<any[]> {
  if (!adminDb) return [];
  const snapshot = await adminDb.collection("departments").orderBy("name", "asc").get();
  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      name: data.name,
      municipalities: (data.municipalities || []).map((m: any, idx: number) => ({
        id: idx + 1,
        name: typeof m === "string" ? m : m.name,
      })),
    };
  });
}

// -----------------------------------------------------------
// PAQUETES
// -----------------------------------------------------------
export async function getFirestorePackages(): Promise<any[]> {
  if (!adminDb) return [];
  const snapshot = await adminDb.collection("packages").orderBy("createdAt", "desc").get();
  
  // Obtenemos todos los productos para computar métricas
  const productsSnap = await adminDb.collection("products").get();
  const allProducts = productsSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as FirestoreProduct[];

  return snapshot.docs.map((doc) => {
    const data = doc.data();
    const pkgProducts = allProducts.filter((p) => p.packageId === doc.id || p.packageId === String(data.id));

    const totalProducts = pkgProducts.length;
    const soldProducts = pkgProducts.filter((p) => p.status === "vendido").length;
    const reservedProducts = pkgProducts.filter((p) => p.status === "apartado").length;
    const availableProducts = pkgProducts.filter((p) => p.status === "disponible").length;

    // Total vendido
    let totalSold = 0;
    pkgProducts.forEach((p) => {
      if (p.status === "vendido") {
        totalSold += Number(p.salePrice);
      }
    });

    const cost = Number(data.costPrice || 0);
    const isRecovered = totalSold >= cost && cost > 0;
    const profit = Math.max(0, totalSold - cost);
    const recoveryPercent = cost > 0 ? Math.min(100, Math.round((totalSold / cost) * 100)) : 100;

    return {
      id: doc.id,
      code: data.code,
      packageType: data.packageType,
      costPrice: cost,
      invoiceNumber: data.invoiceNumber,
      totalWeight: data.totalWeight ? Number(data.totalWeight) : null,
      status: data.status,
      notes: data.notes || null,
      createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt,
      totalProducts,
      soldProducts,
      reservedProducts,
      availableProducts,
      totalSold,
      isRecovered,
      profit,
      recoveryPercent,
    };
  });
}

export async function getFirestorePackageById(id: string): Promise<any | null> {
  if (!adminDb) return null;
  const doc = await adminDb.collection("packages").doc(id).get();
  if (!doc.exists) return null;

  const data = doc.data()!;
  
  // Obtener productos de este paquete
  const productsSnap = await adminDb
    .collection("products")
    .where("packageId", "in", [id, doc.id])
    .get();

  const products = productsSnap.docs.map((d) => {
    const pData = d.data();
    return {
      id: d.id,
      ...pData,
      photos: typeof pData.photos === "string" ? pData.photos : JSON.stringify(pData.photos || []),
      createdAt: pData.createdAt?.toDate ? pData.createdAt.toDate().toISOString() : pData.createdAt,
    };
  });

  let totalSold = 0;
  products.forEach((p: any) => {
    if (p.status === "vendido") {
      totalSold += Number(p.salePrice);
    }
  });

  const cost = Number(data.costPrice || 0);
  const isRecovered = totalSold >= cost && cost > 0;
  const profit = Math.max(0, totalSold - cost);
  const recoveryPercent = cost > 0 ? Math.min(100, Math.round((totalSold / cost) * 100)) : 100;

  return {
    id: doc.id,
    ...data,
    costPrice: cost,
    totalWeight: data.totalWeight ? Number(data.totalWeight) : null,
    createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt,
    products,
    totalSold,
    isRecovered,
    profit,
    recoveryPercent,
  };
}

export async function createFirestorePackage(pkgData: {
  packageType: string;
  costPrice: number;
  invoiceNumber: string;
  totalWeight?: number | null;
  notes?: string | null;
}): Promise<any> {
  if (!adminDb) throw new Error("Firestore no configurado");

  const countSnap = await adminDb.collection("packages").count().get();
  const count = countSnap.data().count;
  const code = `PKG-${new Date().getFullYear()}-${String(count + 1).padStart(3, "0")}`;

  const docRef = await adminDb.collection("packages").add({
    code,
    packageType: pkgData.packageType,
    costPrice: Number(pkgData.costPrice),
    invoiceNumber: pkgData.invoiceNumber,
    totalWeight: pkgData.totalWeight ? Number(pkgData.totalWeight) : null,
    status: "recibido",
    notes: pkgData.notes || null,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  const created = await docRef.get();
  return { id: docRef.id, ...created.data() };
}

// -----------------------------------------------------------
// PRODUCTOS
// -----------------------------------------------------------
export async function createFirestoreProduct(
  packageId: string,
  prodData: {
    name: string;
    weight?: number | null;
    salePrice: number;
    photos?: string[] | null;
    customBarcode?: string | null;
  }
): Promise<any> {
  if (!adminDb) throw new Error("Firestore no configurado");

  const pkgDoc = await adminDb.collection("packages").doc(packageId).get();
  if (!pkgDoc.exists) throw new Error("Paquete no encontrado");
  const pkgData = pkgDoc.data()!;

  // Costo por peso
  let calculatedCost = 0;
  const itemWeight = prodData.weight ? Number(prodData.weight) : null;
  const pkgWeight = pkgData.totalWeight ? Number(pkgData.totalWeight) : null;
  const pkgCost = Number(pkgData.costPrice);

  if (itemWeight && pkgWeight && pkgWeight > 0) {
    calculatedCost = calculateCostByWeight(itemWeight, pkgWeight, pkgCost);
  }

  // Código de barras
  let barcode = prodData.customBarcode?.trim();
  if (!barcode) {
    const productsCount = await adminDb
      .collection("products")
      .where("packageId", "==", packageId)
      .count()
      .get();
    const nextIdx = productsCount.data().count + 1;
    barcode = `PRD-${packageId.slice(-3).toUpperCase()}-${String(nextIdx).padStart(3, "0")}`;
  }

  const newDoc = await adminDb.collection("products").add({
    packageId,
    packageCode: pkgData.code,
    barcode,
    name: prodData.name.trim(),
    weight: itemWeight,
    calculatedCost,
    salePrice: Number(prodData.salePrice),
    photos: prodData.photos || [],
    status: "disponible",
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  // Actualizar estado de paquete a 'en_desglose' si estaba 'recibido'
  if (pkgData.status === "recibido") {
    await pkgDoc.ref.update({ status: "en_desglose", updatedAt: FieldValue.serverTimestamp() });
  }

  const snap = await newDoc.get();
  return { id: newDoc.id, ...snap.data() };
}

export async function searchFirestoreProducts(query?: string, barcode?: string): Promise<any[]> {
  if (!adminDb) return [];

  if (barcode) {
    const snap = await adminDb.collection("products").where("barcode", "==", barcode.trim()).limit(1).get();
    if (snap.empty) return [];
    const doc = snap.docs[0];
    const data = doc.data();
    return [
      {
        id: doc.id,
        ...data,
        photos: typeof data.photos === "string" ? data.photos : JSON.stringify(data.photos || []),
        package: { code: data.packageCode || "PKG", packageType: "lote" },
      },
    ];
  }

  const snap = await adminDb.collection("products").where("status", "==", "disponible").limit(50).get();
  let results: any[] = snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      ...data,
      photos: typeof data.photos === "string" ? data.photos : JSON.stringify(data.photos || []),
      package: { code: data.packageCode || "PKG", packageType: "lote" },
    };
  });

  if (query) {
    const q = query.toLowerCase();
    results = results.filter(
      (p: any) =>
        (p.name && p.name.toLowerCase().includes(q)) ||
        (p.barcode && p.barcode.toLowerCase().includes(q))
    );
  }

  return results;
}

export async function updateFirestoreProduct(id: string, updateData: any): Promise<any> {
  if (!adminDb) throw new Error("Firestore no configurado");
  const docRef = adminDb.collection("products").doc(id);
  const doc = await docRef.get();
  if (!doc.exists) throw new Error("Producto no encontrado");

  const current = doc.data()!;
  let calculatedCost = current.calculatedCost;

  if (updateData.weight !== undefined) {
    const itemWeight = updateData.weight ? Number(updateData.weight) : null;
    const pkgDoc = await adminDb.collection("packages").doc(current.packageId).get();
    if (pkgDoc.exists) {
      const pkgData = pkgDoc.data()!;
      const pkgWeight = pkgData.totalWeight ? Number(pkgData.totalWeight) : null;
      if (itemWeight && pkgWeight && pkgWeight > 0) {
        calculatedCost = calculateCostByWeight(itemWeight, pkgWeight, Number(pkgData.costPrice));
      } else {
        calculatedCost = 0;
      }
    }
  }

  const payload: any = {
    ...updateData,
    calculatedCost,
    updatedAt: FieldValue.serverTimestamp(),
  };

  await docRef.update(payload);
  const updatedSnap = await docRef.get();
  return { id: docRef.id, ...updatedSnap.data() };
}

// -----------------------------------------------------------
// CLIENTES
// -----------------------------------------------------------
export async function getFirestoreCustomers(search?: string): Promise<any[]> {
  if (!adminDb) return [];
  const snap = await adminDb.collection("customers").orderBy("createdAt", "desc").get();
  let list: any[] = snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      ...data,
      department: { id: 1, name: data.departmentName },
      municipality: { id: 1, name: data.municipalityName },
      createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt,
    };
  });

  if (search) {
    const q = search.toLowerCase();
    list = list.filter(
      (c: any) =>
        (c.fullName && c.fullName.toLowerCase().includes(q)) ||
        (c.tiktokUsername && c.tiktokUsername.toLowerCase().includes(q)) ||
        (c.instagramUsername && c.instagramUsername.toLowerCase().includes(q)) ||
        (c.facebookUsername && c.facebookUsername.toLowerCase().includes(q)) ||
        (c.phonePrimary && c.phonePrimary.includes(q)) ||
        (c.barcode && c.barcode.toLowerCase().includes(q))
    );
  }

  return list;
}

export async function createFirestoreCustomer(custData: any): Promise<any> {
  if (!adminDb) throw new Error("Firestore no configurado");

  const countSnap = await adminDb.collection("customers").count().get();
  const count = countSnap.data().count;
  const barcode = `CLI-${String(count + 1).padStart(5, "0")}`;

  const docRef = await adminDb.collection("customers").add({
    barcode,
    fullName: custData.fullName.trim(),
    tiktokUsername: custData.tiktokUsername?.trim() || null,
    instagramUsername: custData.instagramUsername?.trim() || null,
    facebookUsername: custData.facebookUsername?.trim() || null,
    phonePrimary: custData.phonePrimary.trim(),
    phoneSecondary: custData.phoneSecondary?.trim() || null,
    fullAddress: custData.fullAddress.trim(),
    addressReference: custData.addressReference?.trim() || null,
    departmentName: custData.departmentName || "Guatemala",
    municipalityName: custData.municipalityName || "Guatemala",
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  const snap = await docRef.get();
  const data = snap.data()!;
  return {
    id: docRef.id,
    ...data,
    department: { name: data.departmentName },
    municipality: { name: data.municipalityName },
  };
}

// -----------------------------------------------------------
// COMANDAS / ÓRDENES (CON TRANSACCIÓN ATÓMICA)
// -----------------------------------------------------------
export async function getFirestoreOrders(statusFilter?: string): Promise<any[]> {
  if (!adminDb) return [];
  let query: any = adminDb.collection("orders").orderBy("createdAt", "desc");
  if (statusFilter && statusFilter !== "todos") {
    query = query.where("status", "==", statusFilter);
  }

  const snap = await query.get();
  return snap.docs.map((doc: any) => {
    const data = doc.data();
    const payments = data.payments || [];
    const totalPaid = payments.reduce((acc: number, p: any) => acc + Number(p.amount || 0), 0);
    const balanceDue = Math.max(0, Number(data.totalAmount || 0) - totalPaid);

    return {
      id: doc.id,
      ...data,
      subtotal: Number(data.subtotal || 0),
      totalDiscount: Number(data.totalDiscount || 0),
      totalAmount: Number(data.totalAmount || 0),
      totalPaid,
      balanceDue,
      createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt,
      items: (data.items || []).map((i: any) => ({
        ...i,
        product: { id: i.productId, barcode: i.barcode, name: i.name, status: data.status === "pagado" ? "vendido" : "apartado" },
      })),
    };
  });
}

export async function createFirestoreOrder(orderData: {
  customerId: string;
  notes?: string;
  items: Array<{
    productId: string;
    originalPrice: number;
    discountAmount: number;
    finalPrice: number;
  }>;
}): Promise<any> {
  if (!adminDb) throw new Error("Firestore no configurado");

  return await adminDb.runTransaction(async (tx) => {
    // 1. Obtener cliente
    const custDoc = await tx.get(adminDb.collection("customers").doc(orderData.customerId));
    if (!custDoc.exists) throw new Error("Cliente no encontrado");
    const cust = custDoc.data()!;

    // 2. Validar que cada producto esté 'disponible'
    const productRefs = orderData.items.map((i) => adminDb.collection("products").doc(i.productId));
    const prodDocs = await Promise.all(productRefs.map((ref) => tx.get(ref)));

    const validatedItems: any[] = [];
    let subtotal = 0;
    let totalDiscount = 0;
    let totalAmount = 0;

    for (let idx = 0; idx < prodDocs.length; idx++) {
      const pDoc = prodDocs[idx];
      const reqItem = orderData.items[idx];

      if (!pDoc.exists) throw new Error(`El producto ${reqItem.productId} no existe`);
      const pData = pDoc.data()!;

      if (pData.status !== "disponible") {
        throw new Error(`La prenda '${pData.name}' (${pData.barcode}) ya no está disponible (Estado: ${pData.status})`);
      }

      const origPrice = Number(reqItem.originalPrice);
      const disc = Math.max(0, Number(reqItem.discountAmount || 0));
      const finalP = Math.max(0, origPrice - disc);

      subtotal += origPrice;
      totalDiscount += disc;
      totalAmount += finalP;

      validatedItems.push({
        productId: pDoc.id,
        barcode: pData.barcode,
        name: pData.name,
        originalPrice: origPrice,
        discountAmount: disc,
        finalPrice: finalP,
        photos: pData.photos || [],
      });
    }

    // 3. Crear orden
    const countSnap = await adminDb.collection("orders").count().get();
    const count = countSnap.data().count;
    const orderNumber = `CMD-${new Date().getFullYear()}-${String(count + 1).padStart(4, "0")}`;

    const newOrderRef = adminDb.collection("orders").doc();
    const orderPayload = {
      orderNumber,
      customerId: orderData.customerId,
      customer: {
        fullName: cust.fullName,
        phonePrimary: cust.phonePrimary,
        tiktokUsername: cust.tiktokUsername || null,
        instagramUsername: cust.instagramUsername || null,
        fullAddress: cust.fullAddress,
        department: { name: cust.departmentName },
        municipality: { name: cust.municipalityName },
      },
      status: "pendiente_pago",
      subtotal,
      totalDiscount,
      totalAmount,
      items: validatedItems,
      payments: [],
      notes: orderData.notes || null,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    tx.set(newOrderRef, orderPayload);

    // 4. Marcar los productos como 'apartado'
    for (const pRef of productRefs) {
      tx.update(pRef, { status: "apartado", updatedAt: FieldValue.serverTimestamp() });
    }

    return {
      id: newOrderRef.id,
      ...orderPayload,
      createdAt: new Date().toISOString(),
      items: validatedItems.map((i) => ({ ...i, product: { name: i.name, barcode: i.barcode } })),
    };
  });
}

// Registrar pago con referencia
export async function addFirestoreOrderPayment(
  orderId: string,
  paymentData: {
    referenceNumber: string;
    paymentMethod: string;
    amount: number;
    notes?: string;
    markAsPaid?: boolean;
  }
): Promise<any> {
  if (!adminDb) throw new Error("Firestore no configurado");

  return await adminDb.runTransaction(async (tx) => {
    const orderRef = adminDb.collection("orders").doc(orderId);
    const orderDoc = await tx.get(orderRef);
    if (!orderDoc.exists) throw new Error("Orden no encontrada");

    const order = orderDoc.data()!;
    if (order.status === "cancelado") throw new Error("No se pueden registrar pagos en una orden cancelada");

    const newPayment = {
      id: `pay_${Date.now()}`,
      referenceNumber: paymentData.referenceNumber.trim(),
      paymentMethod: paymentData.paymentMethod || "transferencia",
      amount: Number(paymentData.amount),
      paymentDate: new Date().toISOString(),
      notes: paymentData.notes?.trim() || null,
    };

    const currentPayments = order.payments || [];
    const updatedPayments = [...currentPayments, newPayment];
    const totalPaid = updatedPayments.reduce((acc: number, p: any) => acc + Number(p.amount), 0);
    const shouldMarkPaid = paymentData.markAsPaid || totalPaid >= Number(order.totalAmount);

    const updatePayload: any = {
      payments: updatedPayments,
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (shouldMarkPaid && order.status === "pendiente_pago") {
      updatePayload.status = "pagado";
    }

    tx.update(orderRef, updatePayload);

    // Si pasa a pagado, actualizar productos a 'vendido'
    if (shouldMarkPaid) {
      for (const item of order.items || []) {
        const prodRef = adminDb.collection("products").doc(item.productId);
        tx.update(prodRef, { status: "vendido", updatedAt: FieldValue.serverTimestamp() });
      }
    }

    return newPayment;
  });
}

// Cancelar orden y liberar productos
export async function cancelFirestoreOrder(orderId: string): Promise<any> {
  if (!adminDb) throw new Error("Firestore no configurado");

  return await adminDb.runTransaction(async (tx) => {
    const orderRef = adminDb.collection("orders").doc(orderId);
    const orderDoc = await tx.get(orderRef);
    if (!orderDoc.exists) throw new Error("Orden no encontrada");

    const order = orderDoc.data()!;
    if (["enviado", "entregado"].includes(order.status)) {
      throw new Error("No se puede cancelar una orden ya enviada o entregada");
    }

    tx.update(orderRef, {
      status: "cancelado",
      updatedAt: FieldValue.serverTimestamp(),
    });

    // Liberar productos a disponible
    for (const item of order.items || []) {
      const prodRef = adminDb.collection("products").doc(item.productId);
      tx.update(prodRef, { status: "disponible", updatedAt: FieldValue.serverTimestamp() });
    }

    return { id: orderId, status: "cancelado" };
  });
}

// Agregar producto a orden existente
export async function addFirestoreOrderItem(
  orderId: string,
  itemData: { productId: string; discountAmount?: number }
): Promise<any> {
  if (!adminDb) throw new Error("Firestore no configurado");

  return await adminDb.runTransaction(async (tx) => {
    const orderRef = adminDb.collection("orders").doc(orderId);
    const orderDoc = await tx.get(orderRef);
    if (!orderDoc.exists) throw new Error("Orden no encontrada");
    const order = orderDoc.data()!;

    if (["enviado", "entregado", "cancelado"].includes(order.status)) {
      throw new Error(`No se pueden agregar productos en estado '${order.status}'`);
    }

    const prodRef = adminDb.collection("products").doc(itemData.productId);
    const prodDoc = await tx.get(prodRef);
    if (!prodDoc.exists) throw new Error("Producto no encontrado");
    const prod = prodDoc.data()!;

    if (prod.status !== "disponible") {
      throw new Error(`El producto no está disponible (Estado: ${prod.status})`);
    }

    const origPrice = Number(prod.salePrice);
    const disc = Math.max(0, Number(itemData.discountAmount || 0));
    const finalP = Math.max(0, origPrice - disc);

    const newItem = {
      productId: prodDoc.id,
      barcode: prod.barcode,
      name: prod.name,
      originalPrice: origPrice,
      discountAmount: disc,
      finalPrice: finalP,
      photos: prod.photos || [],
    };

    const currentItems = order.items || [];
    const newItems = [...currentItems, newItem];

    const newSubtotal = Number(order.subtotal || 0) + origPrice;
    const newTotalDiscount = Number(order.totalDiscount || 0) + disc;
    const newTotalAmount = Number(order.totalAmount || 0) + finalP;

    tx.update(orderRef, {
      items: newItems,
      subtotal: newSubtotal,
      totalDiscount: newTotalDiscount,
      totalAmount: newTotalAmount,
      updatedAt: FieldValue.serverTimestamp(),
    });

    tx.update(prodRef, {
      status: order.status === "pagado" ? "apartado" : "apartado",
      updatedAt: FieldValue.serverTimestamp(),
    });

    return newItem;
  });
}

// Actualizar estado de orden
export async function updateFirestoreOrderStatus(orderId: string, nextStatus: string): Promise<any> {
  if (!adminDb) throw new Error("Firestore no configurado");
  const orderRef = adminDb.collection("orders").doc(orderId);
  const orderDoc = await orderRef.get();
  if (!orderDoc.exists) throw new Error("Orden no encontrada");

  const order = orderDoc.data()!;
  await orderRef.update({
    status: nextStatus,
    updatedAt: FieldValue.serverTimestamp(),
  });

  // Si pasa a enviado o entregado, confirmar que los productos estén en vendido
  if (["enviado", "entregado"].includes(nextStatus)) {
    for (const item of order.items || []) {
      const prodRef = adminDb.collection("products").doc(item.productId);
      await prodRef.update({ status: "vendido", updatedAt: FieldValue.serverTimestamp() });
    }
  }

  return { id: orderId, status: nextStatus };
}

// -----------------------------------------------------------
// REPORTES ROI EN FIRESTORE
// -----------------------------------------------------------
export async function getFirestoreRoiReport(): Promise<any> {
  if (!adminDb) return { summary: {}, packages: [] };

  const [packagesSnap, productsSnap, ordersSnap] = await Promise.all([
    adminDb.collection("packages").orderBy("createdAt", "desc").get(),
    adminDb.collection("products").get(),
    adminDb.collection("orders").get(),
  ]);

  const packages = packagesSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as any[];
  const products = productsSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as FirestoreProduct[];
  const orders = ordersSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as any[];

  let globalInvested = 0;
  let globalSold = 0;

  const packageReports = packages.map((pkg) => {
    const cost = Number(pkg.costPrice || 0);
    globalInvested += cost;

    const pkgProducts = products.filter((p) => p.packageId === pkg.id || p.packageId === String(pkg.id));

    let packageSoldAmount = 0;
    let soldCount = 0;
    let availableCount = 0;
    let reservedCount = 0;
    let potentialRemainingValue = 0;

    pkgProducts.forEach((prod) => {
      if (prod.status === "disponible") {
        availableCount++;
        potentialRemainingValue += Number(prod.salePrice);
      } else if (prod.status === "apartado") {
        reservedCount++;
      } else if (prod.status === "vendido") {
        soldCount++;
        packageSoldAmount += Number(prod.salePrice);
      }
    });

    globalSold += packageSoldAmount;

    const isRecovered = packageSoldAmount >= cost && cost > 0;
    const profit = Math.max(0, packageSoldAmount - cost);
    const deficit = Math.max(0, cost - packageSoldAmount);
    const recoveryPercentage = cost > 0 ? Math.round((packageSoldAmount / cost) * 100) : 100;

    return {
      id: pkg.id,
      code: pkg.code,
      packageType: pkg.packageType,
      invoiceNumber: pkg.invoiceNumber,
      costPrice: cost,
      totalWeight: pkg.totalWeight ? Number(pkg.totalWeight) : null,
      createdAt: pkg.createdAt?.toDate ? pkg.createdAt.toDate().toISOString() : pkg.createdAt,
      totalItems: pkgProducts.length,
      soldCount,
      availableCount,
      reservedCount,
      packageSoldAmount,
      isRecovered,
      recoveryPercentage,
      profit,
      deficit,
      potentialRemainingValue,
    };
  });

  const globalProfit = Math.max(0, globalSold - globalInvested);
  const globalDeficit = Math.max(0, globalInvested - globalSold);
  const globalRecoveryPercentage =
    globalInvested > 0 ? Math.round((globalSold / globalInvested) * 100) : 100;

  return {
    summary: {
      globalInvested,
      globalSold,
      globalProfit,
      globalDeficit,
      globalRecoveryPercentage,
      totalPackages: packages.length,
    },
    packages: packageReports,
  };
}
