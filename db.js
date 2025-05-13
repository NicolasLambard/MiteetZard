const mysql = require('mysql2/promise');

const db = mysql.createPool({
    host: 'host',      
    user: 'username',                
    password: 'password',       
    database: 'database',       
    waitForConnections: true,       
    connectionLimit: 10,              
    queueLimit: 0                   
});

(async () => {
    try {
        const connection = await db.getConnection(); 
        console.log('✅ Connecté à MariaDB via pool');
        connection.release(); 
    } catch (err) {
        console.error('❌ Erreur de connexion à MariaDB :', err.message);
        process.exit(1); 
    }
})();

db.on('error', (err) => {
    console.error('🔥 Une erreur inattendue s\'est produite avec la base de données :', err.message);
});

const executeQuery = async (query, params) => {
    try {
        const [rows] = await db.execute(query, params);
        return rows;
    } catch (err) {
        console.error('⚠️ Erreur lors de l\'exécution de la requête :', err.message);
        throw err; 
    }
};

module.exports = { db, executeQuery };
