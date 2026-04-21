/*
  Warnings:

  - You are about to drop the column `orden` on the `categorias` table. All the data in the column will be lost.
  - You are about to drop the column `descripcion` on the `productores` table. All the data in the column will be lost.
  - You are about to drop the column `biografia` on the `usuarios` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[nombre_usuario]` on the table `usuarios` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "categorias" DROP COLUMN "orden";

-- AlterTable
ALTER TABLE "lotes" ADD COLUMN     "descripcion" TEXT,
ADD COLUMN     "fecha_elaboracion" DATE,
ADD COLUMN     "grado_alcohol" DOUBLE PRECISION,
ADD COLUMN     "marca" VARCHAR(100),
ADD COLUMN     "nombre_cientifico" VARCHAR(150),
ADD COLUMN     "nombre_comun" VARCHAR(100),
ADD COLUMN     "unidades" INTEGER,
ADD COLUMN     "url_foto_especie" VARCHAR(255);

-- AlterTable
ALTER TABLE "productores" DROP COLUMN "descripcion";

-- AlterTable
ALTER TABLE "usuarios" DROP COLUMN "biografia",
ADD COLUMN     "nombre_usuario" VARCHAR(50);

-- CreateTable
CREATE TABLE "categorias_productos" (
    "id_categoria" INTEGER NOT NULL,
    "id_producto" BIGINT NOT NULL,
    "creado_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "categorias_productos_pkey" PRIMARY KEY ("id_categoria","id_producto")
);

-- CreateIndex
CREATE INDEX "idx_cat_prod_producto" ON "categorias_productos"("id_producto");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_nombre_usuario_key" ON "usuarios"("nombre_usuario");

-- AddForeignKey
ALTER TABLE "categorias_productos" ADD CONSTRAINT "categorias_productos_id_categoria_fkey" FOREIGN KEY ("id_categoria") REFERENCES "categorias"("id_categoria") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "categorias_productos" ADD CONSTRAINT "categorias_productos_id_producto_fkey" FOREIGN KEY ("id_producto") REFERENCES "productos"("id_producto") ON DELETE CASCADE ON UPDATE NO ACTION;
