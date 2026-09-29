import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

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

    const uploadDir = path.join(process.cwd(), "public", "uploads", "products");
    await mkdir(uploadDir, { recursive: true });

    const uploadedUrls: string[] = [];

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

    return NextResponse.json({ urls: uploadedUrls });
  } catch (error: any) {
    console.error("Error al procesar subida de imágenes:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
