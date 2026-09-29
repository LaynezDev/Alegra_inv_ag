import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DEPARTMENTS_DATA = [
  {
    name: "Guatemala",
    municipalities: [
      "Guatemala", "Mixco", "Villa Nueva", "San Miguel Petapa", "Santa Catarina Pinula",
      "San Juan Sacatepéquez", "San Pedro Sacatepéquez", "Chinautla", "Amatitlán", "Villa Canales"
    ],
  },
  {
    name: "Sacatepéquez",
    municipalities: [
      "Antigua Guatemala", "Jocotenango", "Ciudad Vieja", "Sumpango", "San Lucas Sacatepéquez"
    ],
  },
  {
    name: "Chimaltenango",
    municipalities: [
      "Chimaltenango", "San Martín Jilotepeque", "Tecpán Guatemala", "Patzún", "Patzicía"
    ],
  },
  {
    name: "El Progreso",
    municipalities: ["Guastatoya", "Sanarate", "Morazán", "San Agustín Acasaguastlán"],
  },
  {
    name: "Escuintla",
    municipalities: ["Escuintla", "Santa Lucía Cotzumalguapa", "Tiquisate", "Puerto San José", "Palín"],
  },
  {
    name: "Santa Rosa",
    municipalities: ["Cuilapa", "Barberena", "Chiquimulilla", "Nueva Santa Rosa"],
  },
  {
    name: "Sololá",
    municipalities: ["Sololá", "Panajachel", "Santiago Atitlán", "San Lucas Tolimán"],
  },
  {
    name: "Totonicapán",
    municipalities: ["Totonicapán", "San Cristóbal Totonicapán", "Momostenango"],
  },
  {
    name: "Quetzaltenango",
    municipalities: ["Quetzaltenango", "Salcajá", "Coatepeque", "Olintepeque", "San Juan Ostuncalco"],
  },
  {
    name: "Suchitepéquez",
    municipalities: ["Mazatenango", "Cuyotenango", "Patulul", "San Antonio Suchitepéquez"],
  },
  {
    name: "Retalhuleu",
    municipalities: ["Retalhuleu", "San Sebastián", "Champerico", "El Asintal"],
  },
  {
    name: "San Marcos",
    municipalities: ["San Marcos", "San Pedro Sacatepéquez", "Malacatán", "Catarina"],
  },
  {
    name: "Huehuetenango",
    municipalities: ["Huehuetenango", "Chiantla", "Barillas", "Santa Eulalia"],
  },
  {
    name: "Quiché",
    municipalities: ["Santa Cruz del Quiché", "Chichicastenango", "Nebaj", "Joyabaj"],
  },
  {
    name: "Baja Verapaz",
    municipalities: ["Salamá", "San Jerónimo", "Purulhá", "Rabinal"],
  },
  {
    name: "Alta Verapaz",
    municipalities: ["Cobán", "San Pedro Carchá", "San Juan Chamelco", "Tactic", "Chisec"],
  },
  {
    name: "Petén",
    municipalities: ["Flores", "San Benito", "Poptún", "Sayaxché", "La Libertad"],
  },
  {
    name: "Izabal",
    municipalities: ["Puerto Barrios", "Morales", "Los Amates", "Livingston", "El Estor"],
  },
  {
    name: "Zacapa",
    municipalities: ["Zacapa", "Estanzuela", "Río Hondo", "Gualán", "Teculután"],
  },
  {
    name: "Chiquimula",
    municipalities: ["Chiquimula", "Esquipulas", "Jocotán", "Camotán"],
  },
  {
    name: "Jalapa",
    municipalities: ["Jalapa", "San Pedro Pinula", "Mataquescuintla", "Monjas"],
  },
  {
    name: "Jutiapa",
    municipalities: ["Jutiapa", "Asunción Mita", "Santa Catarina Mita", "Moyuta"],
  },
];

async function main() {
  console.log("Iniciando sembrado de datos en MySQL...");

  // 1. Departamentos y Municipios
  for (const dept of DEPARTMENTS_DATA) {
    const department = await prisma.department.upsert({
      where: { name: dept.name },
      update: {},
      create: { name: dept.name },
    });

    for (const muniName of dept.municipalities) {
      await prisma.municipality.upsert({
        where: {
          departmentId_name: {
            departmentId: department.id,
            name: muniName,
          },
        },
        update: {},
        create: {
          name: muniName,
          departmentId: department.id,
        },
      });
    }
  }
  console.log("Departamentos y Municipios sembrados exitosamente.");

  // Obtener IDs de Guatemala / Mixco
  const guateDept = await prisma.department.findUnique({ where: { name: "Guatemala" } });
  const mixcoMuni = await prisma.municipality.findFirst({
    where: { departmentId: guateDept?.id, name: "Mixco" },
  });

  // 2. Clientes Iniciales de Demostración
  if (guateDept && mixcoMuni) {
    await prisma.customer.upsert({
      where: { barcode: "CLI-00001" },
      update: {},
      create: {
        barcode: "CLI-00001",
        fullName: "Sofía Méndez Castillo",
        tiktokUsername: "@sofia.mendez_gt",
        instagramUsername: "@sofiamendez_style",
        facebookUsername: "Sofia Mendez",
        phonePrimary: "+502 4589 1234",
        phoneSecondary: "+502 5512 8765",
        fullAddress: "12 Calle 4-25 Zona 4 de Mixco, Condominio Las Flores, Casa 18",
        addressReference: "Frente a farmacia Galeno",
        departmentId: guateDept.id,
        municipalityId: mixcoMuni.id,
      },
    });

    await prisma.customer.upsert({
      where: { barcode: "CLI-00002" },
      update: {},
      create: {
        barcode: "CLI-00002",
        fullName: "Carlos Eduardo Estrada",
        tiktokUsername: "@carlos_estrada99",
        instagramUsername: "@carlos_estrada",
        facebookUsername: "Carlos Estrada GT",
        phonePrimary: "+502 5900 4433",
        phoneSecondary: null,
        fullAddress: "Avenida Las Américas 8-50, Zona 14, Apto 5B",
        addressReference: "Edificio Torre Azul, portón negro",
        departmentId: guateDept.id,
        municipalityId: mixcoMuni.id,
      },
    });
    console.log("Clientes de prueba sembrados.");
  }

  // 3. Paquete inicial de demostración (Costal de Vestidos y Blusas)
  const samplePkg = await prisma.package.upsert({
    where: { code: "PKG-2026-001" },
    update: {},
    create: {
      code: "PKG-2026-001",
      packageType: "costal",
      costPrice: 1500.00,
      invoiceNumber: "FAC-USA-9921",
      totalWeight: 45.0, // 45 lbs
      status: "en_desglose",
      notes: "Costal mixto de blusas de seda y vestidos casuales importados",
    },
  });

  // 4. Productos de muestra dentro del paquete
  const products = [
    {
      barcode: "PRD-001-001",
      name: "Vestido Floral Bohemio Midi",
      weight: 1.20,
      // Costo proporcional: (1.20 / 45) * 1500 = 40.00
      calculatedCost: 40.00,
      salePrice: 165.00,
      photos: JSON.stringify(["https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?auto=format&fit=crop&w=600&q=80"]),
      status: "disponible",
    },
    {
      barcode: "PRD-001-002",
      name: "Blusa Satinada Manga Larga Beige",
      weight: 0.60,
      // Costo proporcional: (0.60 / 45) * 1500 = 20.00
      calculatedCost: 20.00,
      salePrice: 110.00,
      photos: JSON.stringify(["https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?auto=format&fit=crop&w=600&q=80"]),
      status: "disponible",
    },
    {
      barcode: "PRD-001-003",
      name: "Vestido Elegante Negro de Noche",
      weight: 1.50,
      // Costo proporcional: (1.50 / 45) * 1500 = 50.00
      calculatedCost: 50.00,
      salePrice: 220.00,
      photos: JSON.stringify(["https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=600&q=80"]),
      status: "disponible",
    },
    {
      barcode: "PRD-001-004",
      name: "Blusa Estampado Animal Print",
      weight: 0.50,
      calculatedCost: 16.67,
      salePrice: 95.00,
      photos: JSON.stringify(["https://images.unsplash.com/photo-1554412933-514a83d2f3c8?auto=format&fit=crop&w=600&q=80"]),
      status: "disponible",
    },
  ];

  for (const prod of products) {
    await prisma.product.upsert({
      where: { barcode: prod.barcode },
      update: {},
      create: {
        packageId: samplePkg.id,
        barcode: prod.barcode,
        name: prod.name,
        weight: prod.weight,
        calculatedCost: prod.calculatedCost,
        salePrice: prod.salePrice,
        photos: prod.photos,
        status: prod.status,
      },
    });
  }

  console.log("Paquete y productos de prueba sembrados exitosamente.");
}

main()
  .catch((e) => {
    console.error("Error sembrando datos:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
