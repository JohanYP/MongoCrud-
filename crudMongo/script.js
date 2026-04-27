// Cargar usuarios al iniciar
document.addEventListener('DOMContentLoaded', cargar);

// Referencias a los formularios
const formCrear = document.getElementById('form-crear');
const formActualizar = document.getElementById('form-actualizar');

// Manejador para crear
if (formCrear) {
    formCrear.addEventListener('submit', async (e) => {
        e.preventDefault();

        const datos = {
            nombre: document.getElementById('crear_nombre').value,
            email: document.getElementById('crear_email').value,
            edad: document.getElementById('crear_edad').value
        };

        try {
            const res = await fetch('/usuarios', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(datos)
            });

            if (res.ok) {
                formCrear.reset();
                cargar();
            }
        } catch (err) {
            console.error("Error al crear:", err);
        }
    });
}

// Manejador para actualizar
if (formActualizar) {
    formActualizar.addEventListener('submit', async (e) => {
        e.preventDefault();

        const id = document.getElementById('act_id').value;
        if (!id) {
            alert("Selecciona un usuario de la lista para editar");
            return;
        }

        const datos = {
            nombre: document.getElementById('act_nombre').value,
            email: document.getElementById('act_email').value,
            edad: document.getElementById('act_edad').value
        };

        try {
            const res = await fetch(`/usuarios/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(datos)
            });

            if (res.ok) {
                formActualizar.reset();
                cargar();
            }
        } catch (err) {
            console.error("Error al actualizar:", err);
        }
    });
}

// Función para listar usuarios
async function cargar() {
    try {
        const res = await fetch('/usuarios');
        const usuarios = await res.json();
        const lista = document.getElementById('lista');

        if (usuarios.length === 0) {
            lista.innerHTML = '<div class="empty-state">No hay usuarios registrados</div>';
            return;
        }

        lista.innerHTML = usuarios.map(u => `
            <li>
                <div>
                    <div><strong>${u.nombre}</strong></div>
                    <div>${u.email} • ${u.edad} años</div>
                    <div><small>ID: ${u._id}</small></div>
                </div>
                <div>
                    <button onclick="prepararEdicion('${u._id}', '${u.nombre}', '${u.email}', '${u.edad}')">Editar</button>
                    <button onclick="borrar('${u._id}')">Borrar</button>
                </div>
                <br>
            </li>
        `).join('');
    } catch (err) {
        console.error("Error al cargar:", err);
    }
}

// Función para cargar datos en el formulario de edición
function prepararEdicion(id, nombre, email, edad) {
    document.getElementById('act_id').value = id;
    document.getElementById('act_nombre').value = nombre;
    document.getElementById('act_email').value = email;
    document.getElementById('act_edad').value = edad;

    // Hacer scroll al formulario de actualización
    document.getElementById('form-actualizar').scrollIntoView({ behavior: 'smooth' });
}

// Función para borrar
async function borrar(id) {
    if (confirm('¿Desea eliminar este registro?')) {
        try {
            await fetch(`/usuarios/${id}`, { method: 'DELETE' });
            cargar();
        } catch (err) {
            console.error("Error al borrar:", err);
        }
    }
}


window.prepararEdicion = prepararEdicion;
window.borrar = borrar;
window.cargar = cargar;
