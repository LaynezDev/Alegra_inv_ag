import { adminDb } from "@/lib/firebase-admin";
import { Timestamp, FieldValue } from "firebase-admin/firestore";
import { calculateCostByWeight } from "@/lib/utils";
import { StoreSettings, DEFAULT_STORE_SETTINGS } from "@/lib/settings";

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

    // Total vendido y Total teórico (suma de precios de todos los productos)
    let totalSold = 0;
    let totalTheoretical = 0;
    pkgProducts.forEach((p) => {
      const price = Number(p.salePrice || 0);
      totalTheoretical += price;
      if (p.status === "vendido") {
        totalSold += price;
      }
    });

    const cost = Number(data.costPrice || 0);
    const isRecovered = totalSold >= cost && cost > 0;
    const profit = Math.max(0, totalSold - cost);
    const recoveryPercent = cost > 0 ? Math.min(100, Math.round((totalSold / cost) * 100)) : 100;

    return {
      id: doc.id,
      code: data.code,
      name: data.name || data.reference || data.title || null,
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
      totalTheoretical,
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
      ...pData,
      id: d.id,
      photos: typeof pData.photos === "string" ? pData.photos : JSON.stringify(pData.photos || []),
      createdAt: pData.createdAt?.toDate ? pData.createdAt.toDate().toISOString() : pData.createdAt,
    };
  });

  let totalSold = 0;
  let totalTheoretical = 0;
  products.forEach((p: any) => {
    const price = Number(p.salePrice || 0);
    totalTheoretical += price;
    if (p.status === "vendido") {
      totalSold += price;
    }
  });

  const cost = Number(data.costPrice || 0);
  const isRecovered = totalSold >= cost && cost > 0;
  const profit = Math.max(0, totalSold - cost);
  const recoveryPercent = cost > 0 ? Math.min(100, Math.round((totalSold / cost) * 100)) : 100;

  return {
    id: doc.id,
    ...data,
    name: data.name || data.reference || data.title || null,
    costPrice: cost,
    totalWeight: data.totalWeight ? Number(data.totalWeight) : null,
    createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt,
    products,
    totalSold,
    totalTheoretical,
    isRecovered,
    profit,
    recoveryPercent,
  };
}

export async function createFirestorePackage(pkgData: {
  name?: string | null;
  reference?: string | null;
  title?: string | null;
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
  const name = (pkgData.name || pkgData.reference || pkgData.title || "").trim();

  const docRef = await adminDb.collection("packages").add({
    code,
    name: name || null,
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

export async function updateFirestorePackage(
  id: string,
  pkgData: {
    name?: string | null;
    reference?: string | null;
    title?: string | null;
    packageType?: string;
    costPrice?: number;
    invoiceNumber?: string;
    totalWeight?: number | null;
    notes?: string | null;
  }
): Promise<any> {
  if (!adminDb) throw new Error("Firestore no configurado");
  const docRef = adminDb.collection("packages").doc(id);
  const snap = await docRef.get();
  if (!snap.exists) throw new Error("Paquete no encontrado");

  const updateData: any = {
    updatedAt: FieldValue.serverTimestamp(),
  };

  if (pkgData.name !== undefined || pkgData.reference !== undefined || pkgData.title !== undefined) {
    updateData.name = (pkgData.name || pkgData.reference || pkgData.title || "").trim() || null;
  }
  if (pkgData.packageType !== undefined) updateData.packageType = pkgData.packageType;
  if (pkgData.costPrice !== undefined) updateData.costPrice = Number(pkgData.costPrice);
  if (pkgData.invoiceNumber !== undefined) updateData.invoiceNumber = pkgData.invoiceNumber;
  if (pkgData.totalWeight !== undefined) updateData.totalWeight = pkgData.totalWeight ? Number(pkgData.totalWeight) : null;
  if (pkgData.notes !== undefined) updateData.notes = pkgData.notes || null;

  await docRef.update(updateData);
  const updated = await docRef.get();
  return { id: docRef.id, ...updated.data() };
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
        ...data,
        id: doc.id,
        photos: typeof data.photos === "string" ? data.photos : JSON.stringify(data.photos || []),
        package: { code: data.packageCode || "PKG", packageType: "lote" },
      },
    ];
  }

  const snap = await adminDb.collection("products").where("status", "==", "disponible").limit(50).get();
  let results: any[] = snap.docs.map((d) => {
    const data = d.data();
    return {
      ...data,
      id: d.id,
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
    calculatedCost,
    updatedAt: FieldValue.serverTimestamp(),
  };

  for (const [key, value] of Object.entries(updateData)) {
    if (value !== undefined) {
      payload[key] = value;
    }
  }

  await docRef.update(payload);
  const updatedSnap = await docRef.get();
  return { id: docRef.id, ...updatedSnap.data() };
}

export async function deleteFirestoreProduct(id: string): Promise<any> {
  if (!adminDb) throw new Error("Firestore no configurado");
  const docRef = adminDb.collection("products").doc(id);
  const doc = await docRef.get();
  if (!doc.exists) throw new Error("Producto no encontrado");

  const data = doc.data()!;
  if (data.status === "apartado" || data.status === "vendido") {
    throw new Error("No se puede eliminar una prenda que está apartada o vendida en una orden");
  }

  await docRef.delete();
  return { success: true, message: "Producto eliminado correctamente" };
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

export async function updateFirestoreCustomer(
  customerId: string | number,
  custData: any
): Promise<any> {
  if (!adminDb) throw new Error("Firestore no configurado");
  const custRef = await resolveCustomerDocRef(customerId);

  const updatePayload: any = {
    updatedAt: FieldValue.serverTimestamp(),
  };

  if (custData.fullName !== undefined) updatePayload.fullName = custData.fullName.trim();
  if (custData.phonePrimary !== undefined) updatePayload.phonePrimary = custData.phonePrimary.trim();
  if (custData.phoneSecondary !== undefined) updatePayload.phoneSecondary = custData.phoneSecondary ? custData.phoneSecondary.trim() : null;
  if (custData.tiktokUsername !== undefined) updatePayload.tiktokUsername = custData.tiktokUsername ? custData.tiktokUsername.trim() : null;
  if (custData.instagramUsername !== undefined) updatePayload.instagramUsername = custData.instagramUsername ? custData.instagramUsername.trim() : null;
  if (custData.facebookUsername !== undefined) updatePayload.facebookUsername = custData.facebookUsername ? custData.facebookUsername.trim() : null;
  if (custData.fullAddress !== undefined) updatePayload.fullAddress = custData.fullAddress.trim();
  if (custData.addressReference !== undefined) updatePayload.addressReference = custData.addressReference ? custData.addressReference.trim() : null;
  if (custData.departmentName !== undefined) updatePayload.departmentName = custData.departmentName;
  if (custData.municipalityName !== undefined) updatePayload.municipalityName = custData.municipalityName;

  await custRef.update(updatePayload);

  const snap = await custRef.get();
  const data = snap.data()!;
  return {
    id: custRef.id,
    ...data,
    department: { name: data.departmentName },
    municipality: { name: data.municipalityName },
    updatedAt: new Date().toISOString(),
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
      shareToken: data.shareToken || doc.id,
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

// -----------------------------------------------------------
// RESOLUTORES INTELIGENTES DE REFERENCIAS (PRODUCTO Y CLIENTE)
// -----------------------------------------------------------
export async function resolveCustomerDocRef(customerId: string | number) {
  if (!adminDb) throw new Error("Firestore no configurado");
  const rawId = String(customerId ?? "").trim();
  if (!rawId) throw new Error("ID de cliente requerido");

  // 1. Probar directamente (ej: ID de documento generado por Firestore)
  const directRef = adminDb.collection("customers").doc(rawId);
  const directSnap = await directRef.get();
  if (directSnap.exists) return directRef;

  // 2. Probar con prefijo "cust_" (para datos migrados)
  if (!rawId.startsWith("cust_")) {
    const prefixedRef = adminDb.collection("customers").doc(`cust_${rawId}`);
    const prefixedSnap = await prefixedRef.get();
    if (prefixedSnap.exists) return prefixedRef;
  }

  // 3. Buscar por campo id numérico
  const numId = Number(rawId);
  if (!isNaN(numId)) {
    const byIdSnap = await adminDb.collection("customers").where("id", "==", numId).limit(1).get();
    if (!byIdSnap.empty) return byIdSnap.docs[0].ref;
  }

  throw new Error(`El cliente con identificador '${rawId}' no existe en el sistema`);
}

export async function resolveProductDocRef(productId: string | number) {
  if (!adminDb) throw new Error("Firestore no configurado");
  const rawId = String(productId ?? "").trim();
  if (!rawId) throw new Error("ID de producto inválido o vacío");

  // 1. Probar directamente con rawId (ej: "prod_6" o auto-id de Firestore)
  const directRef = adminDb.collection("products").doc(rawId);
  const directSnap = await directRef.get();
  if (directSnap.exists) return directRef;

  // 2. Probar con prefijo "prod_" (para IDs migrados de MySQL ej: 6 -> prod_6)
  if (!rawId.startsWith("prod_")) {
    const prefixedRef = adminDb.collection("products").doc(`prod_${rawId}`);
    const prefixedSnap = await prefixedRef.get();
    if (prefixedSnap.exists) return prefixedRef;
  }

  // 3. Buscar por campo numérico id
  const numId = Number(rawId);
  if (!isNaN(numId)) {
    const byIdSnap = await adminDb.collection("products").where("id", "==", numId).limit(1).get();
    if (!byIdSnap.empty) return byIdSnap.docs[0].ref;
  }

  // 4. Buscar por código de barras
  const byBarcodeSnap = await adminDb.collection("products").where("barcode", "==", rawId).limit(1).get();
  if (!byBarcodeSnap.empty) return byBarcodeSnap.docs[0].ref;

  throw new Error(`El producto con identificador '${rawId}' no existe en el inventario`);
}

export async function createFirestoreOrder(orderData: {
  customerId: string | number;
  notes?: string;
  items: Array<{
    productId: string | number;
    originalPrice: number;
    discountAmount: number;
    finalPrice: number;
  }>;
}): Promise<any> {
  if (!adminDb) throw new Error("Firestore no configurado");

  // Resolver referencias documentales antes de iniciar la transacción
  const custRef = await resolveCustomerDocRef(orderData.customerId);
  const productRefs = await Promise.all(
    orderData.items.map((i) => resolveProductDocRef(i.productId))
  );

  return await adminDb.runTransaction(async (tx) => {
    // 1. Obtener cliente dentro de la transacción
    const custDoc = await tx.get(custRef);
    if (!custDoc.exists) throw new Error("Cliente no encontrado");
    const cust = custDoc.data()!;

    // 2. Validar que cada producto esté 'disponible'
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
    const shareToken = Math.random().toString(36).substring(2, 10);

    const newOrderRef = adminDb.collection("orders").doc();
    const orderPayload = {
      orderNumber,
      shareToken,
      customerId: custRef.id,
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

  const orderRef = adminDb.collection("orders").doc(String(orderId));
  const orderDoc = await orderRef.get();
  if (!orderDoc.exists) throw new Error("Orden no encontrada");
  const order = orderDoc.data()!;
  if (order.status === "cancelado") throw new Error("No se pueden registrar pagos en una orden cancelada");

  const productRefs: any[] = [];
  for (const item of order.items || []) {
    try {
      const pRef = await resolveProductDocRef(item.productId);
      productRefs.push(pRef);
    } catch (e) {
      console.warn(`No se pudo resolver producto ${item.productId}:`, e);
    }
  }

  return await adminDb.runTransaction(async (tx) => {
    const oDoc = await tx.get(orderRef);
    if (!oDoc.exists) throw new Error("Orden no encontrada");
    const oData = oDoc.data()!;

    const newPayment = {
      id: `pay_${Date.now()}`,
      referenceNumber: paymentData.referenceNumber.trim(),
      paymentMethod: paymentData.paymentMethod || "transferencia",
      amount: Number(paymentData.amount),
      paymentDate: new Date().toISOString(),
      notes: paymentData.notes?.trim() || null,
    };

    const currentPayments = oData.payments || [];
    const updatedPayments = [...currentPayments, newPayment];
    const totalPaid = updatedPayments.reduce((acc: number, p: any) => acc + Number(p.amount || 0), 0);
    const shouldMarkPaid = paymentData.markAsPaid || totalPaid >= Number(oData.totalAmount || 0);

    const updatePayload: any = {
      payments: updatedPayments,
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (shouldMarkPaid && oData.status === "pendiente_pago") {
      updatePayload.status = "pagado";
    }

    tx.update(orderRef, updatePayload);

    // Si pasa a pagado, actualizar productos a 'vendido'
    if (shouldMarkPaid) {
      for (const pRef of productRefs) {
        tx.update(pRef, { status: "vendido", updatedAt: FieldValue.serverTimestamp() });
      }
    }

    return newPayment;
  });
}

// Cancelar orden y liberar productos
export async function cancelFirestoreOrder(orderId: string): Promise<any> {
  if (!adminDb) throw new Error("Firestore no configurado");

  const orderRef = adminDb.collection("orders").doc(String(orderId));
  const orderDoc = await orderRef.get();
  if (!orderDoc.exists) throw new Error("Orden no encontrada");

  const order = orderDoc.data()!;
  if (["enviado", "entregado"].includes(order.status)) {
    throw new Error("No se puede cancelar una orden ya enviada o entregada");
  }

  const productRefs: any[] = [];
  for (const item of order.items || []) {
    try {
      const pRef = await resolveProductDocRef(item.productId);
      productRefs.push(pRef);
    } catch (e) {
      console.warn(`No se pudo resolver producto ${item.productId}:`, e);
    }
  }

  return await adminDb.runTransaction(async (tx) => {
    const oDoc = await tx.get(orderRef);
    if (!oDoc.exists) throw new Error("Orden no encontrada");
    const oData = oDoc.data()!;

    if (["enviado", "entregado"].includes(oData.status)) {
      throw new Error("No se puede cancelar una orden ya enviada o entregada");
    }

    tx.update(orderRef, {
      status: "cancelado",
      updatedAt: FieldValue.serverTimestamp(),
    });

    // Liberar productos a disponible
    for (const pRef of productRefs) {
      tx.update(pRef, { status: "disponible", updatedAt: FieldValue.serverTimestamp() });
    }

    return { id: orderId, status: "cancelado" };
  });
}

// Agregar producto a orden existente
export async function addFirestoreOrderItem(
  orderId: string,
  itemData: { productId: string | number; discountAmount?: number }
): Promise<any> {
  if (!adminDb) throw new Error("Firestore no configurado");
  const prodRef = await resolveProductDocRef(itemData.productId);

  return await adminDb.runTransaction(async (tx) => {
    const orderRef = adminDb.collection("orders").doc(String(orderId));
    const orderDoc = await tx.get(orderRef);
    if (!orderDoc.exists) throw new Error("Orden no encontrada");
    const order = orderDoc.data()!;

    if (["enviado", "entregado", "cancelado"].includes(order.status)) {
      throw new Error(`No se pueden agregar productos en estado '${order.status}'`);
    }

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
  const orderRef = adminDb.collection("orders").doc(String(orderId));
  const orderDoc = await orderRef.get();
  if (!orderDoc.exists) throw new Error("Orden no encontrada");

  const order = orderDoc.data()!;
  await orderRef.update({
    status: nextStatus,
    updatedAt: FieldValue.serverTimestamp(),
  });

  // Si pasa a pagado, enviado o entregado, confirmar que los productos estén en vendido
  if (["pagado", "enviado", "entregado"].includes(nextStatus)) {
    for (const item of order.items || []) {
      try {
        const prodRef = await resolveProductDocRef(item.productId);
        await prodRef.update({ status: "vendido", updatedAt: FieldValue.serverTimestamp() });
      } catch (e) {
        console.warn(`No se pudo actualizar estado de producto ${item.productId}:`, e);
      }
    }
  } else if (nextStatus === "cancelado") {
    for (const item of order.items || []) {
      try {
        const prodRef = await resolveProductDocRef(item.productId);
        await prodRef.update({ status: "disponible", updatedAt: FieldValue.serverTimestamp() });
      } catch (e) {
        console.warn(`No se pudo actualizar estado de producto ${item.productId}:`, e);
      }
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
    let totalTheoretical = 0;

    pkgProducts.forEach((prod) => {
      const price = Number(prod.salePrice || 0);
      totalTheoretical += price;
      if (prod.status === "disponible") {
        availableCount++;
        potentialRemainingValue += price;
      } else if (prod.status === "apartado") {
        reservedCount++;
      } else if (prod.status === "vendido") {
        soldCount++;
        packageSoldAmount += price;
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
      name: pkg.name || pkg.reference || pkg.title || null,
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
      totalTheoretical,
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

// -----------------------------------------------------------
// VISTAS PÚBLICAS PARA CLIENTES: PEDIDOS (/p/[token]) Y CATÁLOGOS (/c/[token])
// -----------------------------------------------------------

/**
 * Obtiene los detalles públicos de una orden mediante su shareToken o ID.
 * Excluye datos internos o sensibles (costos, notas de auditoría, etc.).
 */
export async function getPublicOrder(tokenOrId: string): Promise<any | null> {
  if (!adminDb) return null;
  const raw = String(tokenOrId || "").trim();
  if (!raw) return null;

  let orderDoc: any = null;

  // 1. Buscar primero por shareToken
  const snapByToken = await adminDb.collection("orders").where("shareToken", "==", raw).limit(1).get();
  if (!snapByToken.empty) {
    orderDoc = snapByToken.docs[0];
  } else {
    // 2. Buscar por ID directo de documento
    const snapById = await adminDb.collection("orders").doc(raw).get();
    if (snapById.exists) {
      orderDoc = snapById;
    }
  }

  if (!orderDoc) return null;

  const data = orderDoc.data();

  // Si no tenía shareToken asignado previamente, generarlo y guardarlo
  let shareToken = data.shareToken;
  if (!shareToken) {
    shareToken = Math.random().toString(36).substring(2, 10);
    try {
      await orderDoc.ref.update({ shareToken });
    } catch {
      // Ignorar error de actualización si es solo lectura
    }
  }

  const payments = data.payments || [];
  const totalPaid = payments.reduce((acc: number, p: any) => acc + Number(p.amount || 0), 0);
  const balanceDue = Math.max(0, Number(data.totalAmount || 0) - totalPaid);

  // Asegurar que cada prenda tenga sus fotos correspondientes
  const itemsWithPhotos = await Promise.all(
    (data.items || []).map(async (item: any) => {
      let photos = Array.isArray(item.photos) ? item.photos : [];

      // Si el item no tenía fotos guardadas en la orden, buscarlas en la colección products
      if (photos.length === 0 && item.productId) {
        try {
          const pSnap = await adminDb.collection("products").doc(String(item.productId)).get();
          if (pSnap.exists) {
            const pData = pSnap.data()!;
            if (Array.isArray(pData.photos) && pData.photos.length > 0) {
              photos = pData.photos;
            }
          }
        } catch {
          // continuar
        }
      }

      return {
        id: item.productId || item.barcode || Math.random().toString(),
        name: item.name || "Prenda",
        barcode: item.barcode || "",
        originalPrice: Number(item.originalPrice || 0),
        discountAmount: Number(item.discountAmount || 0),
        finalPrice: Number(item.finalPrice || 0),
        photos,
      };
    })
  );

  return {
    id: orderDoc.id,
    orderNumber: data.orderNumber,
    shareToken,
    status: data.status,
    customer: {
      fullName: data.customer?.fullName || "Cliente",
      phonePrimary: data.customer?.phonePrimary || "",
      department: data.customer?.department?.name || "",
      municipality: data.customer?.municipality?.name || "",
      fullAddress: data.customer?.fullAddress || "",
    },
    items: itemsWithPhotos,
    subtotal: Number(data.subtotal || 0),
    totalDiscount: Number(data.totalDiscount || 0),
    totalAmount: Number(data.totalAmount || 0),
    totalPaid,
    balanceDue,
    createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt || new Date().toISOString(),
  };
}

/**
 * Crea un enlace público para compartir un catálogo de prendas seleccionadas.
 */
export async function createPublicCatalog(catalogData: {
  title?: string;
  productIds: string[];
  notes?: string;
}): Promise<any> {
  if (!adminDb) throw new Error("Firestore no configurado");
  const shareToken = Math.random().toString(36).substring(2, 10);

  const catalogPayload = {
    title: catalogData.title?.trim() || "Catálogo de Prendas Seleccionadas",
    shareToken,
    productIds: catalogData.productIds,
    notes: catalogData.notes || null,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };

  const docRef = await adminDb.collection("catalogs").add(catalogPayload);
  return {
    id: docRef.id,
    ...catalogPayload,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Obtiene la información pública de un catálogo y los datos actualizados de sus prendas.
 */
export async function getPublicCatalog(tokenOrId: string): Promise<any | null> {
  if (!adminDb) return null;
  const raw = String(tokenOrId || "").trim();
  if (!raw) return null;

  let catDoc: any = null;
  const snapByToken = await adminDb.collection("catalogs").where("shareToken", "==", raw).limit(1).get();
  if (!snapByToken.empty) {
    catDoc = snapByToken.docs[0];
  } else {
    const snapById = await adminDb.collection("catalogs").doc(raw).get();
    if (snapById.exists) {
      catDoc = snapById;
    }
  }

  if (!catDoc) return null;
  const data = catDoc.data();

  const productIds: string[] = data.productIds || [];
  const products: any[] = [];

  for (const pid of productIds) {
    try {
      const pSnap = await adminDb.collection("products").doc(String(pid)).get();
      if (pSnap.exists) {
        const p = pSnap.data()!;
        products.push({
          id: pSnap.id,
          name: p.name,
          barcode: p.barcode,
          salePrice: Number(p.salePrice || 0),
          status: p.status, // "disponible", "apartado", "vendido"
          photos: Array.isArray(p.photos) ? p.photos : [],
        });
      }
    } catch {
      // Ignorar prendas que hayan sido borradas
    }
  }

  return {
    id: catDoc.id,
    title: data.title || "Catálogo de Prendas Seleccionadas",
    shareToken: data.shareToken || catDoc.id,
    notes: data.notes || null,
    products,
    createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt,
  };
}

/**
 * Obtiene la configuración general de la tienda (branding, leyenda, sustantivo de productos, cuentas bancarias).
 */
export async function getStoreSettings(): Promise<StoreSettings> {
  if (!adminDb) return DEFAULT_STORE_SETTINGS;
  try {
    const snap = await adminDb.collection("settings").doc("general").get();
    if (!snap.exists) {
      return DEFAULT_STORE_SETTINGS;
    }
    const data = snap.data();
    return {
      storeName: data?.storeName ?? DEFAULT_STORE_SETTINGS.storeName,
      tagline: data?.tagline ?? DEFAULT_STORE_SETTINGS.tagline,
      logoUrl: data?.logoUrl ?? DEFAULT_STORE_SETTINGS.logoUrl,
      productNoun: data?.productNoun ?? DEFAULT_STORE_SETTINGS.productNoun,
      nounSingular: data?.nounSingular ?? DEFAULT_STORE_SETTINGS.nounSingular,
      nounPlural: data?.nounPlural ?? DEFAULT_STORE_SETTINGS.nounPlural,
      nounGender: data?.nounGender ?? DEFAULT_STORE_SETTINGS.nounGender,
      bankAccounts: Array.isArray(data?.bankAccounts) && data.bankAccounts.length > 0 
        ? data.bankAccounts 
        : DEFAULT_STORE_SETTINGS.bankAccounts,
      updatedAt: data?.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : data?.updatedAt,
    };
  } catch (error) {
    console.error("Error al obtener configuración de tienda:", error);
    return DEFAULT_STORE_SETTINGS;
  }
}

/**
 * Actualiza o guarda la configuración general de la tienda.
 */
export async function updateStoreSettings(settings: Partial<StoreSettings>): Promise<StoreSettings> {
  if (!adminDb) throw new Error("Firestore Admin not initialized");
  const docRef = adminDb.collection("settings").doc("general");
  
  const payload: any = {
    storeName: settings.storeName ?? DEFAULT_STORE_SETTINGS.storeName,
    tagline: settings.tagline ?? DEFAULT_STORE_SETTINGS.tagline,
    logoUrl: settings.logoUrl ?? "",
    productNoun: settings.productNoun ?? DEFAULT_STORE_SETTINGS.productNoun,
    nounSingular: settings.nounSingular ?? DEFAULT_STORE_SETTINGS.nounSingular,
    nounPlural: settings.nounPlural ?? DEFAULT_STORE_SETTINGS.nounPlural,
    nounGender: settings.nounGender ?? DEFAULT_STORE_SETTINGS.nounGender,
    bankAccounts: Array.isArray(settings.bankAccounts) ? settings.bankAccounts : DEFAULT_STORE_SETTINGS.bankAccounts,
    updatedAt: FieldValue.serverTimestamp(),
  };

  await docRef.set(payload, { merge: true });
  return getStoreSettings();
}
