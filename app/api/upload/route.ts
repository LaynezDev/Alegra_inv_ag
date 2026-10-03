import { NextResponse } from "next/server";
import { adminStorage } from "@/lib/firebase-admin";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import crypto from "crypto";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const files = formData.getAll("files") as File[];
    
    const singleFile = formData.get("file") as File | null;
    if (singleFile && files.length === 0) {
      files.push(singleFile);
    }

    if (files.length === 0) {
      return NextResponse.json({ error: "No se enviaron archivos" }, { status: 400 });
    }

    const uploadedUrls: string[] = [];

    // Bucket de Firebase Storage
    const bucketName =
      process.env.FIREBASE_STORAGE_BUCKET ||
      process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
      "alegragt-66b94.firebasestorage.app";

    // En Firebase App Hosting (Cloud Run) o en local con Firestore, usamos Firebase Storage
    const useFirebase = Boolean(
      adminStorage &&
      typeof adminStorage.bucket === "function" &&
      process.env.DATABASE_PROVIDER !== "mysql"
    );

    if (useFirebase) {
      // --- SUBIDA A FIREBASE STORAGE ---
      const bucket = adminStorage.bucket(bucketName);

      for (const file of files) {
        if (!file || typeof file === "string" || !file.name) continue;
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        const ext = path.extname(file.name) || ".jpg";
        const cleanExt = ext.toLowerCase().replace(/[^a-z0-9.]/g, "") || ".jpg";
        const filename = `prod_${Date.now()}_${Math.random().toString(36).substring(2, 8)}${cleanExt}`;
        const destination = `products/${filename}`;
        const fileRef = bucket.file(destination);

        const token = crypto.randomUUID();

        await fileRef.save(buffer, {
          metadata: {
            contentType: file.type || "image/jpeg",
            metadata: {
              firebaseStorageDownloadTokens: token,
            },
          },
        });

        // URL pública accesible globalmente con token de descarga de Firebase
        const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(
          destination
        )}?alt=media&token=${token}`;

        uploadedUrls.push(publicUrl);
      }
    } else {
      // --- FALLBACK A DISCO LOCAL (si aún no se han configurado las claves de Firebase) ---
      const uploadDir = path.join(process.cwd(), "public", "uploads", "products");
      await mkdir(uploadDir, { recursive: true });

      for (const file of files) {
        if (!file || typeof file === "string" || !file.name) continue;
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        const ext = path.extname(file.name) || ".jpg";
        const cleanExt = ext.toLowerCase().replace(/[^a-z0-9.]/g, "") || ".jpg";
        const filename = `prod_${Date.now()}_${Math.random().toString(36).substring(2, 8)}${cleanExt}`;

        const filePath = path.join(uploadDir, filename);
        await writeFile(filePath, buffer);

        uploadedUrls.push(`/uploads/products/${filename}`);
      }
    }

    return NextResponse.json({
      urls: uploadedUrls,
      storageType: useFirebase ? "firebase" : "local",
    });
  } catch (error: any) {
    console.error("Error al procesar subida de imágenes a Firebase Storage:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
