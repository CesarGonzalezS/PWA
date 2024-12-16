const express = require('express');
const path = require('path');
const cors = require('cors');
const fs = require('fs');
const bodyParser = require('body-parser');

const dbPath = './db.json'; // Archivo JSON para almacenar datos
const app = express();
const port = 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Funciones de manejo de JSON
function readDb() {
    return JSON.parse(fs.readFileSync(dbPath, 'utf8'));
}

function writeDb(data) {
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
}

// Rutas del API
app.get('/users', (req, res) => {
    const data = readDb();
    res.json(data.users);
});

app.post('/users', (req, res) => {
    const data = readDb();
    const newUser = { ...req.body, id: data.users.length + 1 };
    data.users.push(newUser);
    writeDb(data);
    res.status(201).json(newUser);
});

app.put('/users/:id', (req, res) => {
    const data = readDb();
    const userId = parseInt(req.params.id, 10);
    const index = data.users.findIndex(user => user.id === userId);

    if (index === -1) return res.status(404).json({ error: 'Usuario no encontrado' });

    data.users[index] = { ...data.users[index], ...req.body };
    writeDb(data);
    res.json(data.users[index]);
});

app.delete('/users/:id', (req, res) => {
    const data = readDb();
    const userId = parseInt(req.params.id, 10);
    const filteredUsers = data.users.filter(user => user.id !== userId);

    if (filteredUsers.length === data.users.length) return res.status(404).json({ error: 'Usuario no encontrado' });

    data.users = filteredUsers;
    writeDb(data);
    res.status(204).send();
});

app.listen(port, () => {
    console.log(`Servidor ejecutándose en http://localhost:${port}`);
});
