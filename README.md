# Proyecto: MongoDB Replica Set + CRUD App (Docker)

Genera el siguiente proyecto **exactamente** con esta estructura de archivos y este código. No cambies nada, no agregues librerías extra, no modifiques la lógica. El proyecto es un CRUD de usuarios con Node.js/Express conectado a un MongoDB Replica Set de 3 nodos + 1 árbitro, todo en Docker.

***

## Estructura de archivos

```
MongoCrud/
├── docker-compose.yml
├── .gitignore
└── crudMongo/
    ├── Dockerfile
    ├── .dockerignore
    ├── package.json
    ├── server.js
    └── public/
        ├── index.html
        ├── style.css
        └── script.js
```

***

## Archivo: `docker-compose.yml`

```yaml
services:

  # ── Nodo 1 (primario preferido) ──────────────────────────────
  mongo1:
    image: mongo:8
    container_name: mongo1
    command: ["mongod", "--replSet", "rs0", "--bind_ip_all", "--port", "27017"]
    healthcheck:
      test: ["CMD", "mongosh", "--port", "27017", "--eval", "db.adminCommand('ping')"]
      interval: 5s
      timeout: 5s
      retries: 10
      start_period: 15s
    ports:
      - "27017:27017"
    volumes:
      - mongo1_data:/data/db
    networks:
      - mongo-net

  # ── Nodo 2 ───────────────────────────────────────────────────
  mongo2:
    image: mongo:8
    container_name: mongo2
    command: ["mongod", "--replSet", "rs0", "--bind_ip_all", "--port", "27018"]
    healthcheck:
      test: ["CMD", "mongosh", "--port", "27018", "--eval", "db.adminCommand('ping')"]
      interval: 5s
      timeout: 5s
      retries: 10
      start_period: 15s
    ports:
      - "27018:27018"
    volumes:
      - mongo2_data:/data/db
    networks:
      - mongo-net

  # ── Nodo 3 ───────────────────────────────────────────────────
  mongo3:
    image: mongo:8
    container_name: mongo3
    command: ["mongod", "--replSet", "rs0", "--bind_ip_all", "--port", "27019"]
    healthcheck:
      test: ["CMD", "mongosh", "--port", "27019", "--eval", "db.adminCommand('ping')"]
      interval: 5s
      timeout: 5s
      retries: 10
      start_period: 15s
    ports:
      - "27019:27019"
    volumes:
      - mongo3_data:/data/db
    networks:
      - mongo-net

  # ── Árbitro ──────────────────────────────────────────────────
  mongo-arbiter:
    image: mongo:8
    container_name: mongo-arbiter
    command: ["mongod", "--replSet", "rs0", "--bind_ip_all", "--port", "27020"]
    healthcheck:
      test: ["CMD", "mongosh", "--port", "27020", "--eval", "db.adminCommand('ping')"]
      interval: 5s
      timeout: 5s
      retries: 10
      start_period: 15s
    ports:
      - "27020:27020"
    volumes:
      - mongo_arb_data:/data/db
    networks:
      - mongo-net

  # ── Init (one-shot): espera todos los nodos antes de iniciar el RS ──
  mongo-init:
    image: mongo:8
    container_name: mongo-init
    depends_on:
      mongo1:        { condition: service_healthy }
      mongo2:        { condition: service_healthy }
      mongo3:        { condition: service_healthy }
      mongo-arbiter: { condition: service_healthy }
    entrypoint: >
      mongosh --host mongo1 --port 27017 --eval "
        rs.initiate({
          _id: 'rs0',
          members: [
            { _id: 0, host: 'mongo1:27017',        priority: 2 },
            { _id: 1, host: 'mongo2:27018',        priority: 1 },
            { _id: 2, host: 'mongo3:27019',        priority: 1 },
            { _id: 3, host: 'mongo-arbiter:27020', arbiterOnly: true }
          ]
        })
      "
    networks:
      - mongo-net

  # ── App CRUD ──────────────────────────────────────────────────
  app:
    build: ./crudMongo
    container_name: crud-app
    ports:
      - "4000:4000"
    environment:
      - MONGO_URL=mongodb://mongo1:27017,mongo2:27018,mongo3:27019/test_db?replicaSet=rs0
      - PORT=4000
    depends_on:
      mongo-init:
        condition: service_completed_successfully
    restart: on-failure
    networks:
      - mongo-net

volumes:
  mongo1_data:
  mongo2_data:
  mongo3_data:
  mongo_arb_data:

networks:
  mongo-net:
    driver: bridge
```

***

## Archivo: `crudMongo/Dockerfile`

```dockerfile
FROM node:18-slim

ENV NODE_ENV=production

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY . .

EXPOSE 4000

CMD ["node", "server.js"]
```

***

## Archivo: `crudMongo/.dockerignore`

```
node_modules
npm-debug.log
.env
*.log
```

***

## Archivo: `crudMongo/package.json`

```json
{
  "name": "crud-mongo",
  "version": "1.0.0",
  "description": "CRUD con Express y MongoDB Replica Set",
  "main": "server.js",
  "engines": {
    "node": ">=18"
  },
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "mongodb": "^6.3.0"
  },
  "devDependencies": {
    "nodemon": "^3.0.0"
  }
}
```

***

## Archivo: `crudMongo/server.js`

```javascript
const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');
const path = require('path');

const app       = express();
const PORT      = process.env.PORT || 4000;
const MONGO_URL = process.env.MONGO_URL || 'mongodb://localhost:27017/test_db';
const DB_NAME   = 'test_db';

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
  const db       = await conectar();
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
```

***

## Archivo: `crudMongo/public/index.html`

```html
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CRUD Usuarios</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <div class="container">
    <h1>Gestión de Usuarios</h1>

    <!-- Sección Crear -->
    <section class="card">
      <h3>Crear Nuevo Usuario</h3>
      <form id="form-crear" class="form-group">
        <div class="input-group">
          <label for="crear_nombre">Nombre Completo</label>
          <input type="text" id="crear_nombre" placeholder="Ej: Juan Pérez" required>
        </div>
        <div class="input-group">
          <label for="crear_email">Correo Electrónico</label>
          <input type="email" id="crear_email" placeholder="juan@ejemplo.com" required>
        </div>
        <div class="input-group">
          <label for="crear_edad">Edad</label>
          <input type="number" id="crear_edad" placeholder="25" min="1" max="120" required>
        </div>
        <button type="submit">Guardar Usuario</button>
      </form>
    </section>

    <!-- Sección Actualizar -->
    <section class="card">
      <h3>Actualizar Usuario</h3>
      <p><small>Haz clic en "Editar" en la lista para cargar los datos</small></p>
      <form id="form-actualizar" class="form-group">
        <div class="input-group">
          <label for="act_id">ID del Usuario</label>
          <input type="text" id="act_id" placeholder="ID automático" readonly>
        </div>
        <div class="input-group">
          <label for="act_nombre">Nombre</label>
          <input type="text" id="act_nombre" placeholder="Nuevo nombre">
        </div>
        <div class="input-group">
          <label for="act_email">Correo</label>
          <input type="email" id="act_email" placeholder="nuevo@correo.com">
        </div>
        <div class="input-group">
          <label for="act_edad">Edad</label>
          <input type="number" id="act_edad" placeholder="Nueva edad" min="1" max="120">
        </div>
        <button type="submit" class="secondary">Confirmar Actualización</button>
      </form>
    </section>

    <!-- Sección Lista -->
    <section class="card">
      <div class="list-header">
        <h3>Usuarios Registrados</h3>
        <button class="secondary small" id="btn-refrescar">Refrescar</button>
      </div>
      <ul id="lista" class="user-list">
        <div class="empty-state">Cargando...</div>
      </ul>
    </section>
  </div>

  <script src="script.js"></script>
</body>
</html>
```

***

## Archivo: `crudMongo/public/style.css`

```css
/* ── Reset ──────────────────────────────────────────────────── */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

body {
  font-family: 'Segoe UI', system-ui, sans-serif;
  font-size: 16px;
  background: #f4f4f5;
  color: #18181b;
  padding: 2rem 1rem;
  min-height: 100dvh;
}

/* ── Contenedor ─────────────────────────────────────────────── */
.container {
  max-width: 680px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

h1 {
  font-size: 1.75rem;
  font-weight: 700;
  color: #09090b;
}

h3 {
  font-size: 1.05rem;
  font-weight: 600;
  color: #27272a;
}

/* ── Tarjetas ───────────────────────────────────────────────── */
.card {
  background: #ffffff;
  border: 1px solid #e4e4e7;
  border-radius: 0.75rem;
  padding: 1.5rem;
  box-shadow: 0 1px 4px rgba(0,0,0,0.05);
}

/* ── Formulario ─────────────────────────────────────────────── */
.form-group {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-top: 1rem;
}

.input-group {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

label {
  font-size: 0.875rem;
  font-weight: 500;
  color: #52525b;
}

input {
  padding: 0.5rem 0.75rem;
  border: 1px solid #d4d4d8;
  border-radius: 0.5rem;
  font-size: 1rem;
  color: #18181b;
  background: #fff;
  transition: border-color 150ms, box-shadow 150ms;
}

input:focus {
  outline: none;
  border-color: #01696f;
  box-shadow: 0 0 0 3px rgba(1,105,111,0.12);
}

input[readonly] {
  background: #f4f4f5;
  color: #71717a;
  cursor: not-allowed;
}

/* ── Botones ────────────────────────────────────────────────── */
button {
  padding: 0.55rem 1.1rem;
  border: none;
  border-radius: 0.5rem;
  font-size: 0.95rem;
  font-weight: 500;
  cursor: pointer;
  transition: background 150ms, box-shadow 150ms;
}

button[type="submit"] {
  background: #01696f;
  color: #ffffff;
  align-self: flex-start;
}
button[type="submit"]:hover  { background: #0c4e54; }
button[type="submit"]:active { background: #0f3638; }

button.secondary {
  background: #f4f4f5;
  color: #18181b;
  border: 1px solid #d4d4d8;
}
button.secondary:hover  { background: #e4e4e7; }

button.small { padding: 0.35rem 0.75rem; font-size: 0.875rem; }

/* ── Cabecera de lista ───────────────────────────────────────── */
.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

/* ── Lista de usuarios ──────────────────────────────────────── */
.user-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.user-list li {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem 1rem;
  background: #fafafa;
  border: 1px solid #e4e4e7;
  border-radius: 0.5rem;
}

.user-list li .actions {
  display: flex;
  gap: 0.5rem;
  flex-shrink: 0;
}

.btn-editar {
  background: #f4f4f5;
  color: #18181b;
  border: 1px solid #d4d4d8;
  padding: 0.35rem 0.8rem;
  font-size: 0.875rem;
  border-radius: 0.4rem;
}
.btn-editar:hover { background: #e4e4e7; }

.btn-borrar {
  background: #fee2e2;
  color: #b91c1c;
  border: 1px solid #fecaca;
  padding: 0.35rem 0.8rem;
  font-size: 0.875rem;
  border-radius: 0.4rem;
}
.btn-borrar:hover { background: #fecaca; }

/* ── Estado vacío / error ───────────────────────────────────── */
.empty-state {
  text-align: center;
  padding: 2rem;
  color: #71717a;
  font-size: 0.95rem;
}

/* ── Responsive ─────────────────────────────────────────────── */
@media (max-width: 480px) {
  body { padding: 1rem 0.75rem; }
  .user-list li { flex-direction: column; align-items: flex-start; }
  button[type="submit"] { align-self: stretch; text-align: center; }
}
```

***

## Archivo: `crudMongo/public/script.js`

```javascript
document.addEventListener('DOMContentLoaded', () => {
  cargar();
  document.getElementById('btn-refrescar').addEventListener('click', cargar);
});

const formCrear      = document.getElementById('form-crear');
const formActualizar = document.getElementById('form-actualizar');

// ── Crear usuario ─────────────────────────────────────────────
if (formCrear) {
  formCrear.addEventListener('submit', async (e) => {
    e.preventDefault();
    const datos = {
      nombre: document.getElementById('crear_nombre').value.trim(),
      email:  document.getElementById('crear_email').value.trim(),
      edad:   Number(document.getElementById('crear_edad').value),
    };
    try {
      const res = await fetch('/usuarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datos),
      });
      if (res.ok) {
        formCrear.reset();
        cargar();
      } else {
        const err = await res.json();
        alert(err.error || 'Error al crear usuario');
      }
    } catch {
      alert('Error de red al crear usuario');
    }
  });
}

// ── Actualizar usuario ────────────────────────────────────────
if (formActualizar) {
  formActualizar.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('act_id').value;
    if (!id) {
      alert('Selecciona un usuario de la lista para editar');
      return;
    }
    const datos = {
      nombre: document.getElementById('act_nombre').value.trim(),
      email:  document.getElementById('act_email').value.trim(),
      edad:   Number(document.getElementById('act_edad').value),
    };
    try {
      const res = await fetch(`/usuarios/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datos),
      });
      if (res.ok) {
        formActualizar.reset();
        cargar();
      } else {
        const err = await res.json();
        alert(err.error || 'Error al actualizar usuario');
      }
    } catch {
      alert('Error de red al actualizar usuario');
    }
  });
}

// ── Listar usuarios ───────────────────────────────────────────
async function cargar() {
  const lista = document.getElementById('lista');
  lista.innerHTML = '<div class="empty-state">Cargando...</div>';
  try {
    const res = await fetch('/usuarios');
    if (!res.ok) throw new Error('Error del servidor');
    const usuarios = await res.json();

    if (usuarios.length === 0) {
      lista.innerHTML = '<div class="empty-state">No hay usuarios registrados</div>';
      return;
    }

    lista.innerHTML = usuarios.map(u => `
      <li>
        <div>
          <div><strong>${u.nombre}</strong></div>
          <div style="color:#52525b;font-size:0.9rem">${u.email} &bull; ${u.edad} años</div>
          <div style="color:#a1a1aa;font-size:0.75rem">ID: ${u._id}</div>
        </div>
        <div class="actions">
          <button
            class="btn-editar"
            data-id="${u._id}"
            data-nombre="${u.nombre}"
            data-email="${u.email}"
            data-edad="${u.edad}">Editar</button>
          <button class="btn-borrar" data-id="${u._id}">Borrar</button>
        </div>
      </li>
    `).join('');

    lista.querySelectorAll('.btn-editar').forEach(btn =>
      btn.addEventListener('click', () =>
        prepararEdicion(btn.dataset.id, btn.dataset.nombre, btn.dataset.email, btn.dataset.edad)
      )
    );
    lista.querySelectorAll('.btn-borrar').forEach(btn =>
      btn.addEventListener('click', () => borrar(btn.dataset.id))
    );
  } catch (err) {
    lista.innerHTML = '<div class="empty-state">Error al cargar usuarios</div>';
    console.error('Error al cargar:', err);
  }
}

// ── Prellenar form de edición ─────────────────────────────────
function prepararEdicion(id, nombre, email, edad) {
  document.getElementById('act_id').value     = id;
  document.getElementById('act_nombre').value = nombre;
  document.getElementById('act_email').value  = email;
  document.getElementById('act_edad').value   = edad;
  document.getElementById('form-actualizar').scrollIntoView({ behavior: 'smooth' });
}

// ── Borrar usuario ────────────────────────────────────────────
async function borrar(id) {
  if (!confirm('¿Deseas eliminar este usuario?')) return;
  try {
    const res = await fetch(`/usuarios/${id}`, { method: 'DELETE' });
    if (res.ok) {
      cargar();
    } else {
      alert('Error al eliminar el usuario');
    }
  } catch {
    alert('Error de red al eliminar usuario');
  }
}
```

***

## Archivo: `.gitignore`

```
node_modules/
.DS_Store
.env
*.log
```

***

## Instrucciones para conectar con MongoDB Compass

Antes de levantar Docker, agrega estas líneas al archivo de hosts de tu sistema:

- **Linux/Mac**: `/etc/hosts`
- **Windows**: `C:\Windows\System32\drivers\etc\hosts`

```
127.0.0.1   mongo1
127.0.0.1   mongo2
127.0.0.1   mongo3
127.0.0.1   mongo-arbiter
```

Luego levanta el proyecto:

```bash
docker compose down -v
docker compose up --build
```

Verifica el estado del replica set:

```bash
docker exec -it mongo1 mongosh --port 27017 --eval "rs.status()"
```

Conéctate en Compass con este string:

```
mongodb://mongo1:27017,mongo2:27018,mongo3:27019/?replicaSet=rs0
```

Para simular failover y ver la elección en tiempo real:

```bash
docker stop mongo1
```
