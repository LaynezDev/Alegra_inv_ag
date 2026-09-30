import { adminStorage } from "../lib/firebase-admin";
import { prisma } from "../lib/prisma";
import { readFile, readdir } from "fs/promises";
import path from "path";
import crypto from "crypto";

async function main() {
  console.log("Iniciando migración de imágenes locales a Firebase Storage...");

  if (!adminStorage || typeof adminStorage.bucket !== "function") {
    console.error("Firebase Storage no está configurado. Revisa tus variables en .env");
    process.exit(1);
  }

  const bucket = adminStorage.bucket();
  console.log(`Usando bucket de Firebase: ${bucket.name}`);

  const uploadsDir = path.join(process.cwd(), "public", "uploads", "products");

  let localFiles: string[] = [];
  try {
    localFiles = await readdir(uploadsDir);
  } catch (e) {
    console.log("No se encontró el directorio de subidas locales o está vacío.");
  }

  const imageFiles = localFiles.filter((f) => f !== ".gitkeep");
  console.log(`Se encontraron ${imageFiles.length} imágenes locales.`);

  const urlMapping: Record<string, string> = {};

  for (const filename of imageFiles) {
    try {
      const filePath = path.join(uploadsDir, filename);
      const buffer = await readFile(filePath);
      const destination = `products/${filename}`;
      const fileRef = bucket.file(destination);

      const token = crypto.randomUUID();
      const ext = path.extname(filename).toLowerCase();
      const contentType = ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp" : "image/jpeg";

      await fileRef.save(buffer, {
        metadata: {
          contentType,
          metadata: {
            firebaseStorageDownloadTokens: token,
          },
        },
      });

      const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(
        destination
      )}?alt=media&token=${token}`;

      urlMapping[`/uploads/products/${filename}`] = publicUrl;
      console.log(`✓ Subida a Firebase: ${filename} -> ${publicUrl}`);
    } catch (err: any) {
      console.error(`✗ Error subiendo ${filename}:`, err.message);
    }
  }

  // Actualizar URLs en la base de datos para productos existentes
  console.log("Actualizando referencias en la base de datos...");
  const products = await prisma.product.findMany({
    where: {
      photos: {
        contains: "/uploads/products/",
      },
    },
  });

  console.log(`Se encontraron ${products.length} productos con imágenes locales por actualizar.`);

  for (const prod of products) {
    if (!prod.photos) continue;
    let photoList: string[] = [];
    try {
      photoList = JSON.parse(prod.photos);
    } catch {
      continue;
    }

    let modified = false;
    const updatedPhotos = photoList.map((url) => {
      if (urlMapping[url]) {
        modified = true;
        return urlMapping[url];
      }
      return url;
    });

    if (modified) {
      await prisma.product.update({
        where: { id: prod.id },
        data: {
          photos: JSON.stringify(updatedPhotos),
        },
      });
      console.log(`✓ Producto ${prod.name} (${prod.barcode}) actualizado con URLs de Firebase.`);
    }
  }

  console.log("¡Migración de imágenes a Firebase Storage completada con éxito!");
}

main()
  .catch((e) => {
    console.error("Error durante la migración:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
