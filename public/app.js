// Archivo: app.js

if (navigator.serviceWorker) {
    navigator.serviceWorker.register('/service-worker.js')
       .then(() => {
          if (Notification.permission !== 'granted') {
              Notification.requestPermission().then(permission => {
                  if (permission !== 'granted') {
                      showErrorAlert('Notificaciones rechazadas. Algunas funciones podrían no estar disponibles.');
                  }
              });
          }
       });
}

// PouchDB setup (usando pouchdb-browser)
const db = new PouchDB('usersDB_request');
const db2 = new PouchDB('usersDB_offline');

// Referencias a elementos del DOM
const userListElement = document.getElementById('userList');
const addUserBtn = document.getElementById('addUserBtn');
const userForm = document.getElementById('userForm');
const editForm = document.getElementById('editForm');
const form = document.getElementById('form');
const editFormContent = document.getElementById('editFormContent');
const userNameInput = document.getElementById('userName');
const userEmailInput = document.getElementById('userEmail');
const userPassInput = document.getElementById('userPass');
const editUserNameInput = document.getElementById('editUserName');

// Función para comprobar la conexión a Internet
function isOnline() {
    return navigator.onLine;
}

// Obtener usuarios desde la base de datos local
async function getUsers() {
    try {
        const localUsers = await db2.allDocs({ include_docs: true });
        loadUsers(localUsers.rows.map(row => row.doc));
    } catch (error) {
        showErrorAlert('Error al cargar usuarios desde la base de datos local.');
        console.error('Detalles del error:', error);
    }
}

// Mostrar usuarios en la interfaz
function loadUsers(users) {
    userListElement.innerHTML = '';
    users.forEach(user => {
        const userItem = document.createElement('div');
        userItem.className = 'list-group-item d-flex justify-content-between align-items-center';
        userItem.innerHTML = `
            <strong>${user.name}</strong> - ${user.email}
            <button class="btn btn-warning btn-sm" onclick="editUser('${user._id}')">Editar</button>
            <button class="btn btn-danger btn-sm" onclick="deleteUser('${user._id}')">Borrar</button>
        `;
        userListElement.appendChild(userItem);
    });
}

// Función para agregar un nuevo usuario
async function addUser(name, email, pass) {
    if (!name || !email || !pass) {
        showErrorAlert('Todos los campos son obligatorios.');
        return;
    }

    const newUser = {
        _id: new Date().toISOString(),
        name: name,
        email: email,
        password: pass
    };

    try {
        await db2.put(newUser);
        showSuccessAlert('Usuario agregado correctamente.');

        if (isOnline()) {
            await syncFailedRequests();
        } else {
            await saveFailedRequest('POST', newUser);
        }
    } catch (error) {
        showErrorAlert('Error al agregar usuario.');
        console.error('Detalles del error:', error);
    }

    getUsers();
}

// Función para editar un usuario
async function editUser(id) {
    const user = await db2.get(id);
    editUserNameInput.value = user.name;
    editForm.style.display = 'block';
    userForm.style.display = 'none';

    editFormContent.onsubmit = async function (e) {
        e.preventDefault();
        user.name = editUserNameInput.value;

        try {
            await db2.put(user);
            showSuccessAlert('Usuario actualizado correctamente.');

            if (isOnline()) {
                await syncFailedRequests();
            } else {
                await saveFailedRequest('PUT', user);
            }
        } catch (error) {
            showErrorAlert('Error al actualizar usuario.');
            console.error('Detalles del error:', error);
        }

        resetForm();
        getUsers();
    };
}

// Función para borrar un usuario
async function deleteUser(id) {
    try {
        const user = await db2.get(id);
        await db2.remove(user);
        showSuccessAlert('Usuario eliminado correctamente.');

        if (isOnline()) {
            await syncFailedRequests();
        } else {
            await saveFailedRequest('DELETE', { _id: id });
        }
    } catch (error) {
        showErrorAlert('Error al eliminar usuario.');
        console.error('Detalles del error:', error);
    }

    getUsers();
}

// Función para guardar peticiones fallidas
async function saveFailedRequest(method, data) {
    const failedRequest = {
        _id: new Date().toISOString(),
        method: method,
        data: data,
        status: 'pending'
    };

    try {
        await db.put(failedRequest);
    } catch (error) {
        console.error('Error al guardar petición fallida:', error);
    }
}

// Función para sincronizar peticiones fallidas
async function syncFailedRequests() {
    try {
        const failedRequests = await db.allDocs({ include_docs: true });

        for (const request of failedRequests.rows) {
            try {
                console.log(`Sincronizando: ${JSON.stringify(request.doc)}`);
                await db.remove(request.doc);
            } catch (error) {
                console.error('Error al sincronizar petición:', error);
            }
        }
    } catch (error) {
        console.error('Error al sincronizar peticiones fallidas:', error);
    }
}

// Función para restablecer los formularios
function resetForm() {
    userForm.style.display = 'none';
    editForm.style.display = 'none';
}

// Función para mostrar una alerta de éxito
function showSuccessAlert(message) {
    Swal.fire({
        icon: 'success',
        title: 'Éxito',
        text: message
    });
}

// Función para mostrar una alerta de error
function showErrorAlert(message) {
    Swal.fire({
        icon: 'error',
        title: 'Error',
        text: message
    });
}

// Manejo de conexión
window.addEventListener('online', syncFailedRequests);
window.addEventListener('offline', () => {
    showNotification('Error', 'Sin conexión a Internet. Los datos se guardarán localmente.');
});

// Notificaciones
function showNotification(title, message) {
    if (Notification.permission === 'granted') {
        navigator.serviceWorker.ready.then((registration) => {
            registration.showNotification(title, {
                body: message,
                icon: '/images/logo.png',
                badge: '/images/badge.png'
            });
        });
    } else {
        Swal.fire({
            icon: 'warning',
            title: title,
            text: message,
        });
    }
}

// Cargar los usuarios al inicio
getUsers();
