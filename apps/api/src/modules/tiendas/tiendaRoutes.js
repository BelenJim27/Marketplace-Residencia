const express = require('express');
const { Pool } = require('pg');

const router = express.Router();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

router.get('/', async (req, res) => {
  try {
    const idProductor = Number(req.query.id_productor);
    if (!idProductor) {
      return res.status(400).json({ message: 'id_productor es requerido' });
    }

    const { rows } = await pool.query(
      'SELECT * FROM tiendas WHERE id_productor = $1 AND eliminado_en IS NULL ORDER BY fecha_creacion DESC',
      [idProductor],
    );

    return res.json(rows);
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Error al obtener tiendas' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { id_productor, nombre, descripcion, pais_operacion, status, fecha_creacion } = req.body || {};

    if (!id_productor || !nombre?.trim() || !descripcion?.trim() || !pais_operacion?.trim()) {
      return res.status(400).json({ message: 'Faltan campos requeridos' });
    }

    const { rows } = await pool.query(
      'INSERT INTO tiendas (id_productor, nombre, descripcion, pais_operacion, status, fecha_creacion, actualizado_en) VALUES ($1, $2, $3, $4, $5, $6, NOW()) RETURNING *',
      [id_productor, nombre.trim(), descripcion.trim(), pais_operacion.trim(), status || 'activo', fecha_creacion || new Date().toISOString().split('T')[0]],
    );

    return res.status(201).json(rows[0]);
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Error al crear tienda' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { nombre, descripcion, pais_operacion, status } = req.body || {};

    if (!id || !nombre?.trim() || !descripcion?.trim() || !pais_operacion?.trim() || !status?.trim()) {
      return res.status(400).json({ message: 'Faltan campos requeridos' });
    }

    const { rows } = await pool.query(
      'UPDATE tiendas SET nombre=$1, descripcion=$2, pais_operacion=$3, status=$4, actualizado_en=NOW() WHERE id_tienda=$5 AND eliminado_en IS NULL RETURNING *',
      [nombre.trim(), descripcion.trim(), pais_operacion.trim(), status.trim(), id],
    );

    if (!rows[0]) {
      return res.status(404).json({ message: 'Tienda no encontrada' });
    }

    return res.json(rows[0]);
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Error al actualizar tienda' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) {
      return res.status(400).json({ message: 'id inválido' });
    }

    const { rows } = await pool.query(
      'UPDATE tiendas SET eliminado_en=NOW() WHERE id_tienda=$1 RETURNING *',
      [id],
    );

    if (!rows[0]) {
      return res.status(404).json({ message: 'Tienda no encontrada' });
    }

    return res.json(rows[0]);
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Error al eliminar tienda' });
  }
});

module.exports = router;
