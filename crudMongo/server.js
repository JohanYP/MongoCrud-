const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 4000;
const MONGO_URL = process.env.MONGO_URL || 'mongodb://localhost:27017,mongo2:27018,mongo3:27019/test_db?replicaSet=rs0';
const DB_NAME = 'test_db';

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const client = new MongoClient(MONGO_URL, { serverSelectionTimeoutMS: 30000 });

async function conectar(reintentos = 5, esperaMs = 3000) {
  for (let i = 1; i <= reintentos; i++) {
    try {
      await client.connect();
      console.log('[MongoDB] Conectado correctamente.');
      return client.db(DB_NAME);
    } catch (err) {
      console.warn(`[MongoDB] Intento ${i}/${reintentos} fallido: ${err.message}`);
      if (i === reintentos) throw err;
      await new Promise(r => setTimeout(r, esperaMs));
    }
  }
}

async function iniciarServidor() {
  const db = await conectar();
  const usuarios = db.collection('usuarios');

  // GET — listar todos
  app.get('/usuarios', async (req, res) => {
    try {
      const lista = await usuarios.find({}).toArray();
      res.json(lista);
    } catch (err) {
      console.error('[GET /usuarios]', err.message);
      res.status(500).json({ error: 'Error al obtener usuarios' });
    }
  });

  // POST — crear
  app.post('/usuarios', async (req, res) => {
    try {
      const { nombre, email, edad } = req.body;
      if (!nombre || !email || edad === undefined) {
        return res.status(400).json({ error: 'Nombre, email y edad son requeridos' });
      }
      const resultado = await usuarios.insertOne({
        nombre,
        email,
        edad: Number(edad),
      });
      res.status(201).json(resultado);
    } catch (err) {
      console.error('[POST /usuarios]', err.message);
      res.status(500).json({ error: 'Error al crear usuario' });
    }
  });

  // PUT — actualizar
  app.put('/usuarios/:id', async (req, res) => {
    try {
      const { nombre, email, edad } = req.body;
      const resultado = await usuarios.updateOne(
        { _id: new ObjectId(req.params.id) },
        { $set: { nombre, email, edad: Number(edad) } }
      );
      res.json(resultado);
    } catch (err) {
      console.error('[PUT /usuarios/:id]', err.message);
      res.status(500).json({ error: 'Error al actualizar usuario' });
    }
  });

  // DELETE — eliminar
  app.delete('/usuarios/:id', async (req, res) => {
    try {
      await usuarios.deleteOne({ _id: new ObjectId(req.params.id) });
      res.json({ mensaje: 'Usuario eliminado correctamente' });
    } catch (err) {
      console.error('[DELETE /usuarios/:id]', err.message);
      res.status(500).json({ error: 'Error al eliminar usuario' });
    }
  });

  app.listen(PORT, () => {
    console.log(`[Servidor] Corriendo en http://localhost:${PORT}`);
  });

  process.on('SIGTERM', async () => {
    console.log('[Servidor] Cerrando conexión con MongoDB...');
    await client.close();
    process.exit(0);
  });
}

iniciarServidor().catch(err => {
  console.error('[FATAL] No se pudo iniciar el servidor:', err.message);
  process.exit(1);
});
