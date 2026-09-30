import { adminDb } from "../lib/firebase-admin";
import { prisma } from "../lib/prisma";
import { Timestamp } from "firebase-admin/firestore";

async function main() {
  console.log("=================================================");
  console.log("Iniciando migración completa: MySQL -> Firestore");
  console.log("=================================================");

  if (!adminDb) {
    console.error("Error: Firestore no está inicializado. Revisa tus credenciales en .env");
    process.exit(1);
  }

  // 1. MIGRAR DEPARTAMENTOS Y MUNICIPIOS
  console.log("\n[1/5] Migrando Departamentos y Municipios de Guatemala...");
  const departments = await prisma.department.findMany({
    include: { municipalities: true },
  });

  const deptMap: Record<number, string> = {};

  for (const dept of departments) {
    const docRef = adminDb.collection("departments").doc(`dept_${dept.id}`);
    await docRef.set({
      name: dept.name,
      municipalities: dept.municipalities.map((m) => m.name),
    });
    deptMap[dept.id] = docRef.id;
  }
  console.log(`✓ ${departments.length} departamentos migrados a Firestore.`);

  // 2. MIGRAR PAQUETES
  console.log("\n[2/5] Migrando Paquetes / Lotes...");
  const packages = await prisma.package.findMany();
  const packageMap: Record<number, string> = {};

  for (const pkg of packages) {
    const docRef = adminDb.collection("packages").doc(`pkg_${pkg.id}`);
    await docRef.set({
      id: pkg.id,
      code: pkg.code,
      packageType: pkg.packageType,
      costPrice: Number(pkg.costPrice),
      invoiceNumber: pkg.invoiceNumber,
      totalWeight: pkg.totalWeight ? Number(pkg.totalWeight) : null,
      status: pkg.status,
      notes: pkg.notes,
      createdAt: Timestamp.fromDate(new Date(pkg.createdAt)),
      updatedAt: Timestamp.fromDate(new Date(pkg.updatedAt)),
    });
    packageMap[pkg.id] = docRef.id;
    console.log(`  ✓ Paquete ${pkg.code} migrado (ID: ${docRef.id})`);
  }
  console.log(`✓ ${packages.length} paquetes migrados.`);

  // 3. MIGRAR PRODUCTOS
  console.log("\n[3/5] Migrando Productos...");
  const products = await prisma.product.findMany({
    include: { package: true },
  });
  const productMap: Record<number, string> = {};

  for (const prod of products) {
    const docRef = adminDb.collection("products").doc(`prod_${prod.id}`);
    const firestorePkgId = packageMap[prod.packageId] || `pkg_${prod.packageId}`;

    let photosArr: string[] = [];
    if (prod.photos) {
      try {
        photosArr = JSON.parse(prod.photos);
      } catch {
        photosArr = [prod.photos];
      }
    }

    await docRef.set({
      id: prod.id,
      packageId: firestorePkgId,
      packageCode: prod.package.code,
      barcode: prod.barcode,
      name: prod.name,
      weight: prod.weight ? Number(prod.weight) : null,
      calculatedCost: prod.calculatedCost ? Number(prod.calculatedCost) : 0,
      salePrice: Number(prod.salePrice),
      photos: photosArr,
      status: prod.status,
      createdAt: Timestamp.fromDate(new Date(prod.createdAt)),
      updatedAt: Timestamp.fromDate(new Date(prod.updatedAt)),
    });
    productMap[prod.id] = docRef.id;
    console.log(`  ✓ Producto ${prod.name} (${prod.barcode}) migrado.`);
  }
  console.log(`✓ ${products.length} productos migrados.`);

  // 4. MIGRAR CLIENTES
  console.log("\n[4/5] Migrando Clientes / Compradores...");
  const customers = await prisma.customer.findMany({
    include: { department: true, municipality: true },
  });
  const customerMap: Record<number, string> = {};

  for (const cust of customers) {
    const docRef = adminDb.collection("customers").doc(`cust_${cust.id}`);
    await docRef.set({
      id: cust.id,
      barcode: cust.barcode,
      fullName: cust.fullName,
      tiktokUsername: cust.tiktokUsername,
      instagramUsername: cust.instagramUsername,
      facebookUsername: cust.facebookUsername,
      phonePrimary: cust.phonePrimary,
      phoneSecondary: cust.phoneSecondary,
      fullAddress: cust.fullAddress,
      addressReference: cust.addressReference,
      departmentName: cust.department.name,
      municipalityName: cust.municipality.name,
      createdAt: Timestamp.fromDate(new Date(cust.createdAt)),
      updatedAt: Timestamp.fromDate(new Date(cust.updatedAt)),
    });
    customerMap[cust.id] = docRef.id;
    console.log(`  ✓ Cliente ${cust.fullName} (${cust.barcode}) migrado.`);
  }
  console.log(`✓ ${customers.length} clientes migrados.`);

  // 5. MIGRAR COMANDAS / ÓRDENES Y PAGOS
  console.log("\n[5/5] Migrando Comandas y Pagos...");
  const orders = await prisma.order.findMany({
    include: {
      customer: { include: { department: true, municipality: true } },
      items: { include: { product: true } },
      payments: true,
    },
  });

  for (const order of orders) {
    const docRef = adminDb.collection("orders").doc(`order_${order.id}`);
    const firestoreCustId = customerMap[order.customerId] || `cust_${order.customerId}`;

    const items = order.items.map((item) => ({
      productId: productMap[item.productId] || `prod_${item.productId}`,
      barcode: item.product.barcode,
      name: item.product.name,
      originalPrice: Number(item.originalPrice),
      discountAmount: Number(item.discountAmount),
      finalPrice: Number(item.finalPrice),
    }));

    const payments = order.payments.map((p) => ({
      id: `pay_${p.id}`,
      referenceNumber: p.referenceNumber,
      paymentMethod: p.paymentMethod,
      amount: Number(p.amount),
      paymentDate: p.paymentDate.toISOString(),
      notes: p.notes,
    }));

    await docRef.set({
      id: order.id,
      orderNumber: order.orderNumber,
      customerId: firestoreCustId,
      customer: {
        fullName: order.customer.fullName,
        phonePrimary: order.customer.phonePrimary,
        tiktokUsername: order.customer.tiktokUsername,
        instagramUsername: order.customer.instagramUsername,
        fullAddress: order.customer.fullAddress,
        department: { name: order.customer.department.name },
        municipality: { name: order.customer.municipality.name },
      },
      status: order.status,
      subtotal: Number(order.subtotal),
      totalDiscount: Number(order.totalDiscount),
      totalAmount: Number(order.totalAmount),
      items,
      payments,
      notes: order.notes,
      createdAt: Timestamp.fromDate(new Date(order.createdAt)),
      updatedAt: Timestamp.fromDate(new Date(order.updatedAt)),
    });
    console.log(`  ✓ Comanda ${order.orderNumber} con ${items.length} prendas y ${payments.length} pagos migrada.`);
  }
  console.log(`✓ ${orders.length} órdenes migradas.`);

  console.log("\n=================================================");
  console.log("¡MIGRACIÓN A FIRESTORE COMPLETADA EXITOSAMENTE!");
  console.log("=================================================");
}

main()
  .catch((e) => {
    console.error("Error en la migración a Firestore:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
