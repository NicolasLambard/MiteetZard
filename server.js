const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const { db } = require('./db');
const userRoutes = require('./routes/userRoutes'); 
const adminRoutes = require('./routes/adminRoutes');
const menuRoutes = require('./routes/menuRoutes'); 
const productController = require('./controllers/productController'); 
const orderRoutes = require('./routes/orderRoutes'); 

const app = express();
const PORT = 3000;

app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
app.use(cors());

db.getConnection((err, connection) => {
    if (err) {
        console.error('❌ Erreur de connexion à la base de données :');
        console.error('Code :', err.code);
        console.error('Message :', err.message);
        console.error('Stack :', err.stack);
        process.exit(1); 
    }
    console.log('✅ Connecté à MariaDB via pool');
    connection.release(); 
});

db.on('error', (err) => {
    console.error('🔥 Une erreur inattendue avec la base de données :', err.message);
});

app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes); 
app.use('/api/menus', menuRoutes); 
app.use('/api/orders', orderRoutes); 

app.get('/api/menu', productController.getActiveProducts);

app.get('/', (req, res) => {
    res.status(200).send('Bienvenue sur l\'API Mite & Zard');
});

app.use((req, res) => {
    res.status(404).json({
        error: 'Route non trouvée',
        message: `La route ${req.originalUrl} n'existe pas.`,
    });
});

app.use((err, req, res, next) => {
    console.error('🔥 Erreur interne du serveur :', err.stack);
    res.status(500).json({
        error: 'Erreur interne du serveur',
        details: err.message,
    });
});

app.listen(PORT, () => {
    console.log(`✅ Serveur API lancé sur http://localhost:${PORT}`);
    console.log('\n⚠️ Tunnels Ngrok désactivés - accès local uniquement\n');
    console.log('Pour activer les tunnels, exécutez séparément:');
    console.log('npx ngrok http 3000 (pour l\'API)');
    console.log('npx ngrok http 8100 (pour le frontend)');
});