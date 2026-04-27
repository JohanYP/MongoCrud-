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
