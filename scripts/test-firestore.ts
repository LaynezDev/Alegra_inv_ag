import "dotenv/config";
import {
  getFirestoreDepartments,
  getFirestorePackages,
  searchFirestoreProducts,
  getFirestoreCustomers,
  getFirestoreOrders,
  getFirestoreRoiReport,
} from "../lib/firestore-service";

async function test() {
  console.log("=========================================");
  console.log("Verificando servicios de Cloud Firestore");
  console.log("=========================================");
  
  const depts = await getFirestoreDepartments();
  console.log("✓ Departamentos:", depts.length);

  const pkgs = await getFirestorePackages();
  console.log("✓ Paquetes / Lotes:", pkgs.length);

  const prods = await searchFirestoreProducts();
  console.log("✓ Productos / Prendas disponibles:", prods.length);

  const custs = await getFirestoreCustomers();
  console.log("✓ Clientes:", custs.length);

  const orders = await getFirestoreOrders();
  console.log("✓ Órdenes / Comandas:", orders.length);

  const roi = await getFirestoreRoiReport();
  console.log("✓ Resumen Financiero ROI:", {
    totalInvertido: `Q${roi.summary.globalInvested.toFixed(2)}`,
    totalVendido: `Q${roi.summary.globalSold.toFixed(2)}`,
    gananciaNeta: `Q${roi.summary.globalProfit.toFixed(2)}`,
    recuperacion: `${roi.summary.globalRecoveryPercentage}%`,
  });

  console.log("=========================================");
  console.log("¡TODAS LAS CONSULTAS Y SERVICIOS DE FIRESTORE FUNCIONAN AL 100%!");
  console.log("=========================================");
  process.exit(0);
}

test().catch((e) => {
  console.error("Error en test de Firestore:", e);
  process.exit(1);
});
