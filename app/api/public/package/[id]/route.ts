import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPublicFirestorePackageById } from "@/lib/firestore-service";

function parsePhotos(photos: any): string[] {
  if (!photos) return [];
  if (Array.isArray(photos)) return photos.filter((u) => typeof u === "string" && u.trim() !== "");
  if (typeof photos === "string") {
    try {
      const parsed = JSON.parse(photos);
      if (Array.isArray(parsed)) {
        return parsed.filter((u) => typeof u === "string" && u.trim() !== "");
      }
    } catch {
      if (photos.trim().startsWith("http") || photos.trim().startsWith("/")) {
        return [photos.trim()];
      }
    }
  }
  return [];
}

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const rawId = decodeURIComponent(params.id || "").trim();
    if (!rawId) {
      return NextResponse.json({ error: "Identificador de paquete requerido" }, { status: 400 });
    }

    if (process.env.DATABASE_PROVIDER === "firestore") {
      const pkg = await getPublicFirestorePackageById(rawId);
      if (!pkg) {
        return NextResponse.json({ error: "Paquete no encontrado" }, { status: 404 });
      }
      return NextResponse.json(pkg);
    }

    const numericId = /^\d+$/.test(rawId) ? parseInt(rawId, 10) : null;
    const pkg = await prisma.package.findFirst({
      where: numericId !== null ? { OR: [{ id: numericId }, { code: rawId }] } : { code: rawId },
      include: {
        products: {
          where: { status: "disponible" },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!pkg) {
      return NextResponse.json({ error: "Paquete no encontrado" }, { status: 404 });
    }

    // Extraer título opcional si las notas inician con [Título]
    let pkgName: string | null = null;
    if (pkg.notes) {
      const match = pkg.notes.match(/^\[([^\]]+)\]/);
      if (match) pkgName = match[1].trim();
    }

    return NextResponse.json({
      id: pkg.id,
      code: pkg.code,
      name: pkgName,
      packageType: pkg.packageType,
      products: pkg.products.map((p) => ({
        id: p.id,
        barcode: p.barcode,
        salePrice: Number(p.salePrice || 0),
        photos: parsePhotos(p.photos),
      })),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Error al cargar paquete" }, { status: 500 });
  }
}
