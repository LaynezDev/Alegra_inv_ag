# Alegra - Plataforma Web de Inventario, POS Live y Control de Inversión (ROI)

Sistema web con diseño minimalista basado en los colores institucionales de la tienda **Alegra** (`#233142` y `#D6B89C`), diseñado para la ingesta de lotes cerrados (cajas, bolsas, costales, palets), desglose por peso y código de barras, gestión de clientes con redes sociales, Punto de Venta (POS) multi-comanda en vivo con descuentos, ciclo de cobranza con múltiples referencias de pago y reportes de recuperación de inversión por paquete.

---

## 🎨 Paleta de Colores
* **Primario:** `#233142` (Azul noche / pizarra profundo)
* **Secundario / Acento:** `#D6B89C` (Arena cálido / beige)
* **Fondo:** `#F8F9FA` (Blanco humo suave)
* **Semánticos:** Estados de cobranza claros (Pendiente: Ámbar, Pagado: Verde Esmeralda, Enviado: Azul Cobalto, Entregado: Turquesa, Cancelado: Rojo).

---

## 🚀 Requisitos y Configuración

1. **Node.js** (v18 o superior).
2. **MySQL** (Servicio local de XAMPP / MariaDB en `localhost:3306`).
3. Base de datos: `alegra_db` (creada automáticamente).

### Instalación y Ejecución

```bash
# 1. Instalar dependencias
npm install

# 2. Generar el cliente de Prisma y sincronizar tablas en MySQL
npx prisma db push

# 3. Sembrar catálogo de los 22 departamentos de Guatemala, municipios y datos iniciales de prueba
npx tsx prisma/seed.ts

# 4. Iniciar el servidor de desarrollo
npm run dev
```

La plataforma estará disponible en [http://localhost:3000](http://localhost:3000).

---

## 📋 Módulos del Sistema

### 1. Ingesta de Paquetes (`/packages`)
* Registro de lotes: `Caja`, `Bolsa`, `Costal`, `Palet`.
* Costo de adquisición, número de factura y peso total opcional.
* Desglose de prendas individuales:
  * Cálculo dinámico de **costo prorrateado por peso**:
    $$\text{Costo Producto} = \left(\frac{\text{Peso Producto}}{\text{Peso Total Paquete}}\right) \times \text{Costo Paquete}$$
  * Generador de códigos de barras (Code-128) con botón de impresión directa de etiquetas térmicas.
  * Galería de fotografías y precio de venta al público.

### 2. Directorio de Compradores (`/customers`)
* Registro previo de clientes con identificadores de redes sociales:
  * Usuario en **TikTok** (`@usuario`), **Instagram** (`@usuario`) y nombre en **Facebook**.
  * 2 números de teléfono (1 obligatorio para WhatsApp).
  * Dirección completa y referencia.
  * Catálogo de los **22 departamentos de Guatemala y sus municipios** en cascada.
* Generación de código de barras único para cliente (`CLI-XXXXX`) con carnet/etiqueta imprimible.

### 3. POS Live Multi-Comanda (`/pos`)
* **Múltiples cuentas abiertas en simultáneo:** Barra superior de pestañas para alternar entre clientes sin perder el carrito de cada uno durante transmisiones en vivo.
* **Escaneo continuo:** Soporte para pistolas lectoras de códigos de barras con sintetizador de sonido Web Audio API (chime de éxito y alerta de error).
* **Descuento por monto en cada prenda:** Muestra en tiempo real el precio base, monto de descuento y precio final ajustado.
* **Finalización de venta:** Pasa la cuenta a estado `Pendiente de Pago` (apartando las prendas del inventario) y genera el recibo para impresión térmica (58mm/80mm) o copia formateada para WhatsApp en un clic.

### 4. Pedidos, Cobranza y Despachos (`/orders`)
* Panel de seguimiento por estados: `Pendiente de Pago`, `Pagado`, `Enviado`, `Entregado`, `Cancelado`.
* **Registro de Pagos:** Soporta **múltiples referencias de pago** por cuenta (boletas de depósito, transferencias). Al confirmarse el pago, los productos pasan a `vendido` y se retiran del stock disponible.
* **Cancelación de Cuenta:** Si un pedido pendiente se cancela, los productos apartados se liberan de inmediato y regresan a estar disponibles.
* **Adición de productos:** Permite añadir más prendas antes de que la orden sea enviada o entregada.
* Transición fluida de `Pagado` $\rightarrow$ `Enviado` $\rightarrow$ `Entregado` (finalización de la venta).

### 5. Reportes de Inversión y Ganancias ROI (`/reports`)
* Indicadores Globales: Inversión total vs Ventas totales vs Utilidad bruta.
* **Análisis por Paquete:**
  * Costo invertido en el lote.
  * Total vendido a la fecha.
  * Barra de progreso de recuperación (%) y badge de **Punto de Equilibrio (Breakeven)**.
  * Ganancia neta real y valor del inventario remanente disponible (ganancia pura proyectada).

---

## 📄 Especificación Completa
Consulta el documento técnico [SPECIFICATION.md](SPECIFICATION.md) para ver diagramas de arquitectura, modelos ERD y scripts SQL DDL.
