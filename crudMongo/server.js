const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');

const app = express();
const PORT = 4000;

app.use(express.json());
app.use(express.static('.')); 


const url = process.env.MONGO_URL || "mongodb://mongo1:27017,mongo2:27017,mongo3:27017/test_db?replicaSet=rs0";

const client = new MongoClient(url);
const dbName = 'test_db';

async function iniciarServidor() {
    try {
        await client.connect();
        console.log("Conexión mela al mongo");
        
        const db = client.db(dbName);
        const usuariosCollection = db.collection('user');

        // --- RUTAS DEL API ---

        // 1. Obtener todos los usuarios
        app.get('/usuarios', async (req, res) => {
            try {
                const lista = await usuariosCollection.find({}).toArray();
                res.json(lista);
            } catch (err) {
                res.status(500).json({ error: "Error al obtener usuarios" });
            }
        });

        // 2. Crear un nuevo usuario
        app.post('/usuarios', async (req, res) => {
            try {
                const resultado = await usuariosCollection.insertOne(req.body);
                res.status(201).json(resultado);
            } catch (err) {
                res.status(500).json({ error: "Error al crear usuario" });
            }
        });

        // 3. Actualizar un usuario por ID
        app.put('/usuarios/:id', async (req, res) => {
            try {
                const id = req.params.id;
                const datosActualizados = req.body;
                
                const resultado = await usuariosCollection.updateOne(
                    { _id: new ObjectId(id) },
                    { $set: datosActualizados }
                );
                
                res.json(resultado);
            } catch (err) {
                res.status(500).json({ error: "Error al actualizar usuario" });
            }
        });

        // 4. Borrar un usuario por ID
        app.delete('/usuarios/:id', async (req, res) => {
            try {
                const id = req.params.id;
                await usuariosCollection.deleteOne({ _id: new ObjectId(id) });
                res.json({ mensaje: "Usuario eliminado correctamente" });
            } catch (err) {
                res.status(500).json({ error: "Error al eliminar usuario" });
            }
        });


        app.listen(PORT, () => {
            console.log(`Servidor corriendo en: http://localhost:${PORT}`);
        });

    } catch (error) {
        console.error("No se pudo conectar a MongoDB. Asegúrate de que el servicio esté activo.");
        console.error(error);
        process.exit(1);
    }
}

iniciarServidor();