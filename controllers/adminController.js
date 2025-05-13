const { db } = require('../db');
const jwt = require('jsonwebtoken');
const fs = require('fs');

const JWT_SECRET = '8f7b3c2a1d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2';

const verifierRoleAdmin = async (req) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      console.log('❌ Token manquant');
      return false;
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.userId;

    console.log('🔍 Vérification du rôle admin pour userId:', userId);
    
    if (!userId) {
      console.log('❌ UserId non fourni ou invalide');
      return false;
    }
    
    const [user] = await db.query(
      'SELECT * FROM Utilisateur WHERE id_utilisateur = ?',
      [userId]
    );
    
    if (user.length === 0) {
      console.log(`❌ Utilisateur avec ID ${userId} non trouvé dans la base de données`);
      return false;
    }
    
    console.log(`✅ Utilisateur trouvé: ${JSON.stringify(user[0])}`);
    
    const [userRoles] = await db.query(
      'SELECT ur.id_role, r.nom_role FROM UtilisateurRole ur JOIN Role r ON ur.id_role = r.id_role WHERE ur.id_utilisateur = ?',
      [userId]
    );
    
    console.log(`🔍 Rôles de l'utilisateur: ${JSON.stringify(userRoles)}`);
    
    const isAdmin = userRoles.some(role => role.id_role === 3);
    console.log(`🔐 L'utilisateur est admin: ${isAdmin}`);
    
    return isAdmin;
  } catch (error) {
    console.error('❌ Erreur lors de la vérification du rôle admin:', error);
    return false;
  }
};

const getAllProducts = async (req, res) => {
  try {
    const estAdmin = await verifierRoleAdmin(req);
    if (!estAdmin) {
      return res.status(403).json({ message: '🚫 Accès refusé - Droits administrateur requis' });
    }

    const [produits] = await db.query(`
      SELECT p.*, c.nom_categorie 
      FROM Produit p
      LEFT JOIN Categorie c ON p.categorie = c.nom_categorie
      ORDER BY p.categorie, p.nom_produit
    `);

    produits.forEach(produit => {
      if (produit.image_data) {
        const base64Image = produit.image_data.toString('base64');
        produit.image_data = `data:image/jpeg;base64,${base64Image}`;
      }
    });

    res.status(200).json(produits);
  } catch (error) {
    console.error('❌ Erreur lors de la récupération des produits:', error);
    res.status(500).json({ message: 'Erreur serveur lors de la récupération des produits' });
  }
};

const verifierTableProduit = async () => {
  try {
    const [columns] = await db.query('SHOW COLUMNS FROM Produit LIKE "image_data"');
    
    if (columns.length === 0) {
      await db.query(`
        ALTER TABLE Produit
        ADD COLUMN image_data LONGBLOB DEFAULT NULL
      `);
      console.log('✅ Colonne image_data ajoutée à la table Produit');
    }
  } catch (error) {
    console.error('❌ Erreur lors de la vérification de la table Produit:', error);
    throw error;
  }
};

const addProduct = async (req, res) => {
  try {
    await verifierTableProduit();
    
    console.log('🔍 Données reçues dans addProduct:', req.body);
    console.log('🔍 Type de requête:', req.headers['content-type']);
    console.log('🔍 Fichier uploadé:', req.file ? 'Oui' : 'Non');
    
    if (req.file) {
      console.log('🔍 Détails du fichier:', {
        filename: req.file.filename,
        path: req.file.path,
        size: req.file.size,
        mimetype: req.file.mimetype
      });
    }
    
    const nom_produit = req.body.nom_produit || '';
    const description = req.body.description || '';
    const prix = req.body.prix || 0;
    const categorie = req.body.categorie || '';
    const actif = req.body.actif === '1' || req.body.actif === true ? 1 : 0;
    let image_data = null;
    
    if (req.file) {
      try {
        image_data = fs.readFileSync(req.file.path);
        console.log('✅ Image lue avec succès, taille:', image_data.length);
        
        fs.unlinkSync(req.file.path);
        console.log('✅ Fichier temporaire supprimé');
      } catch (fileError) {
        console.error('❌ Erreur lors de la lecture du fichier image:', fileError);
        return res.status(400).json({ message: '❌ Erreur lors du traitement de l\'image' });
      }
    }
    
    console.log('🔍 Données extraites:', { 
      nom_produit, 
      description: description ? 'présent' : 'absent', 
      prix, 
      categorie, 
      actif,
      image: image_data ? 'présente' : 'absente' 
    });
    
    const estAdmin = await verifierRoleAdmin(req);
    if (!estAdmin) {
      return res.status(403).json({ message: '🚫 Accès refusé - Droits administrateur requis' });
    }

    if (!nom_produit || nom_produit.trim() === '') {
      return res.status(400).json({ message: '❌ Le nom du produit est obligatoire' });
    }
    if (!prix) {
      return res.status(400).json({ message: '❌ Le prix du produit est obligatoire' });
    }
    if (!categorie) {
      return res.status(400).json({ message: '❌ La catégorie du produit est obligatoire' });
    }

    const [result] = await db.query(
      'INSERT INTO Produit (nom_produit, description, prix, image_data, actif, categorie) VALUES (?, ?, ?, ?, ?, ?)',
      [nom_produit.trim(), description.trim() || '', prix, image_data, actif, categorie]
    );

    let responseData = {
      message: '✅ Produit ajouté avec succès',
      productId: result.insertId
    };

    if (image_data) {
      const base64Image = image_data.toString('base64');
      responseData.image_data = `data:image/jpeg;base64,${base64Image}`;
    }

    res.status(201).json(responseData);
  } catch (error) {
    console.error('❌ Erreur lors de l\'ajout du produit:', error);
    res.status(500).json({ message: 'Erreur serveur lors de l\'ajout du produit: ' + error.message });
  }
};

const updateProduct = async (req, res) => {
  try {
    console.log('🔍 Données reçues dans updateProduct:', req.body);
    console.log('🔍 Type de requête:', req.headers['content-type']);
    console.log('🔍 Fichier uploadé:', req.file ? 'Oui' : 'Non');
    
    const { userId, id_produit, nom_produit, description, prix, categorie, actif } = req.body;
    
    const estAdmin = await verifierRoleAdmin(req);
    if (!estAdmin) {
      return res.status(403).json({ message: '🚫 Accès refusé - Droits administrateur requis' });
    }

    let image_data = null;
    let updateImage = false;

    if (req.file) {
      try {
        image_data = fs.readFileSync(req.file.path);
        console.log('✅ Nouvelle image lue avec succès, taille:', image_data.length);
        updateImage = true;
        fs.unlinkSync(req.file.path);
        console.log('✅ Fichier temporaire supprimé');
      } catch (fileError) {
        console.error('❌ Erreur lors de la lecture du fichier image:', fileError);
        return res.status(400).json({ message: '❌ Erreur lors du traitement de l\'image' });
      }
    }

    let query = `
      UPDATE Produit 
      SET nom_produit = ?, 
          description = ?, 
          prix = ?, 
          categorie = ?, 
          actif = ?
    `;
    let params = [nom_produit, description, prix, categorie, actif];

    if (updateImage) {
      query += `, image_data = ?`;
      params.push(image_data);
    }

    query += ` WHERE id_produit = ?`;
    params.push(id_produit);

    await db.query(query, params);

    let responseData = {
      message: '✅ Produit mis à jour avec succès',
      productId: id_produit
    };

    if (image_data) {
      const base64Image = image_data.toString('base64');
      responseData.image_data = `data:image/jpeg;base64,${base64Image}`;
    }

    res.status(200).json(responseData);
  } catch (error) {
    console.error('❌ Erreur lors de la mise à jour du produit:', error);
    res.status(500).json({ message: 'Erreur serveur lors de la mise à jour du produit' });
  }
};

const toggleProductStatus = async (req, res) => {
  try {
    console.log('🔍 Données reçues dans toggleProductStatus:', req.body);
    const { id_produit, actif } = req.body;
    
    const estAdmin = await verifierRoleAdmin(req);
    if (!estAdmin) {
      return res.status(403).json({ message: '🚫 Accès refusé - Droits administrateur requis' });
    }

    if (id_produit === undefined || actif === undefined) {
      return res.status(400).json({ message: '❌ ID du produit et statut requis' });
    }

    await db.query(
      'UPDATE Produit SET actif = ? WHERE id_produit = ?',
      [actif, id_produit]
    );

    const status = actif === 1 ? 'activé' : 'désactivé';
    res.status(200).json({
      message: `✅ Produit ${status} avec succès`,
      productId: id_produit,
      actif: actif
    });
  } catch (error) {
    console.error('❌ Erreur lors du changement de statut du produit:', error);
    res.status(500).json({ message: 'Erreur serveur lors du changement de statut du produit' });
  }
};

const deleteProduct = async (req, res) => {
  try {
    const { userId } = req.body;
    const { id_produit } = req.params;
    
    const estAdmin = await verifierRoleAdmin(req);
    if (!estAdmin) {
      return res.status(403).json({ message: '🚫 Accès refusé - Droits administrateur requis' });
    }

    await db.query('DELETE FROM Produit WHERE id_produit = ?', [id_produit]);

    res.status(200).json({
      message: '✅ Produit supprimé avec succès',
      productId: id_produit
    });
  } catch (error) {
    console.error('❌ Erreur lors de la suppression du produit:', error);
    res.status(500).json({ message: 'Erreur serveur lors de la suppression du produit' });
  }
};

const getAllCategories = async (req, res) => {
  try {
    const estAdmin = await verifierRoleAdmin(req);
    if (!estAdmin) {
      return res.status(403).json({ message: '🚫 Accès refusé - Droits administrateur requis' });
    }

    const [categories] = await db.query('SELECT * FROM Categorie ORDER BY nom_categorie');

    res.status(200).json(categories);
  } catch (error) {
    console.error('❌ Erreur lors de la récupération des catégories:', error);
    res.status(500).json({ message: 'Erreur serveur lors de la récupération des catégories' });
  }
};

const addCategory = async (req, res) => {
  try {
    const { userId, nom_categorie, description } = req.body;
    
    const estAdmin = await verifierRoleAdmin(req);
    if (!estAdmin) {
      return res.status(403).json({ message: '🚫 Accès refusé - Droits administrateur requis' });
    }

    const [result] = await db.query(
      'INSERT INTO Categorie (nom_categorie, description) VALUES (?, ?)',
      [nom_categorie, description]
    );

    res.status(201).json({
      message: '✅ Catégorie ajoutée avec succès',
      categoryId: result.insertId
    });
  } catch (error) {
    console.error('❌ Erreur lors de l\'ajout de la catégorie:', error);
    res.status(500).json({ message: 'Erreur serveur lors de l\'ajout de la catégorie' });
  }
};

const updateCategory = async (req, res) => {
  try {
    const { userId, id_categorie, nom_categorie, description } = req.body;
    
    const estAdmin = await verifierRoleAdmin(req);
    if (!estAdmin) {
      return res.status(403).json({ message: '🚫 Accès refusé - Droits administrateur requis' });
    }

    await db.query(
      'UPDATE Categorie SET nom_categorie = ?, description = ? WHERE id_categorie = ?',
      [nom_categorie, description, id_categorie]
    );

    res.status(200).json({
      message: '✅ Catégorie mise à jour avec succès',
      categoryId: id_categorie
    });
  } catch (error) {
    console.error('❌ Erreur lors de la mise à jour de la catégorie:', error);
    res.status(500).json({ message: 'Erreur serveur lors de la mise à jour de la catégorie' });
  }
};

const deleteCategory = async (req, res) => {
  try {
    const { userId } = req.body;
    const { id_categorie } = req.params;
    
    const estAdmin = await verifierRoleAdmin(req);
    if (!estAdmin) {
      return res.status(403).json({ message: '🚫 Accès refusé - Droits administrateur requis' });
    }

    const [categorie] = await db.query(
      'SELECT nom_categorie FROM Categorie WHERE id_categorie = ?',
      [id_categorie]
    );

    if (categorie.length === 0) {
      return res.status(404).json({ message: '❌ Catégorie non trouvée' });
    }

    const nomCategorie = categorie[0].nom_categorie;

    const [produits] = await db.query(
      'SELECT COUNT(*) as count FROM Produit WHERE categorie = ?',
      [nomCategorie]
    );

    if (produits[0].count > 0) {
      await db.query('UPDATE Produit SET categorie = NULL WHERE categorie = ?', [nomCategorie]);
    }

    await db.query('DELETE FROM Categorie WHERE id_categorie = ?', [id_categorie]);

    res.status(200).json({
      message: '✅ Catégorie supprimée avec succès',
      categoryId: id_categorie
    });
  } catch (error) {
    console.error('❌ Erreur lors de la suppression de la catégorie:', error);
    res.status(500).json({ message: 'Erreur serveur lors de la suppression de la catégorie' });
  }
};

const getAllUsers = async (req, res) => {
  try {
    const { userId } = req.query;
    
    const estAdmin = await verifierRoleAdmin(req);
    if (!estAdmin) {
      return res.status(403).json({ message: '🚫 Accès refusé - Droits administrateur requis' });
    }

    const [users] = await db.query(`
      SELECT u.id_utilisateur, u.nom, u.prenom, u.email, u.telephone, 
             GROUP_CONCAT(r.nom_role SEPARATOR ', ') as roles
      FROM Utilisateur u
      LEFT JOIN UtilisateurRole ur ON u.id_utilisateur = ur.id_utilisateur
      LEFT JOIN Role r ON ur.id_role = r.id_role
      GROUP BY u.id_utilisateur
      ORDER BY u.nom, u.prenom
    `);

    res.status(200).json(users);
  } catch (error) {
    console.error('❌ Erreur lors de la récupération des utilisateurs:', error);
    res.status(500).json({ message: 'Erreur serveur lors de la récupération des utilisateurs' });
  }
};

const updateUserRole = async (req, res) => {
  try {
    const { userId, targetUserId, roleId } = req.body;
    
    const estAdmin = await verifierRoleAdmin(req);
    if (!estAdmin) {
      return res.status(403).json({ message: '🚫 Accès refusé - Droits administrateur requis' });
    }

    const [existingRole] = await db.query(
      'SELECT * FROM UtilisateurRole WHERE id_utilisateur = ? AND id_role = ?',
      [targetUserId, roleId]
    );

    if (existingRole.length > 0) {
      await db.query(
        'DELETE FROM UtilisateurRole WHERE id_utilisateur = ? AND id_role = ?',
        [targetUserId, roleId]
      );
      res.status(200).json({
        message: '✅ Rôle retiré avec succès',
        userId: targetUserId,
        roleId: roleId
      });
    } else {
      await db.query(
        'INSERT INTO UtilisateurRole (id_utilisateur, id_role) VALUES (?, ?)',
        [targetUserId, roleId]
      );
      res.status(200).json({
        message: '✅ Rôle ajouté avec succès',
        userId: targetUserId,
        roleId: roleId
      });
    }
  } catch (error) {
    console.error('❌ Erreur lors de la mise à jour du rôle:', error);
    res.status(500).json({ message: 'Erreur serveur lors de la mise à jour du rôle' });
  }
};

const checkRoleConfig = async (req, res) => {
  try {
    const { userId } = req.query;
    
    if (userId) {
      const estAdmin = await verifierRoleAdmin(req);
      if (!estAdmin) {
        return res.status(403).json({ message: '🚫 Accès refusé - Droits administrateur requis' });
      }
    }

    const [tablesRole] = await db.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'lambardn_mite' 
      AND table_name = 'Role'
    `);

    const roleTableExists = tablesRole.length > 0;

    const [tablesUserRole] = await db.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'lambardn_mite' 
      AND table_name = 'UtilisateurRole'
    `);

    const userRoleTableExists = tablesUserRole.length > 0;

    let adminExists = false;
    if (userRoleTableExists) {
      const [admins] = await db.query(`
        SELECT COUNT(*) as count
        FROM UtilisateurRole
        WHERE id_role = 3
      `);
      adminExists = admins[0].count > 0;
    }

    res.status(200).json({
      roleTableExists,
      userRoleTableExists,
      adminExists,
      status: roleTableExists && userRoleTableExists && adminExists ? 'OK' : 'CONFIGURATION_REQUISE'
    });
  } catch (error) {
    console.error('❌ Erreur lors de la vérification de la configuration des rôles:', error);
    res.status(500).json({ 
      message: 'Erreur serveur lors de la vérification de la configuration des rôles.',
      error: error.message 
    });
  }
};

const initRoles = async (req, res) => {
  try {
    const [tablesRole] = await db.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'lambardn_mite' 
      AND table_name = 'Role'
    `);

    if (tablesRole.length === 0) {
      await db.query(`
        CREATE TABLE Role (
          id_role INT PRIMARY KEY AUTO_INCREMENT,
          nom_role VARCHAR(50) NOT NULL
        )
      `);
      console.log('✅ Table Role créée avec succès.');
      
      await db.query(`
        INSERT INTO Role (id_role, nom_role) VALUES
        (1, 'Client'),
        (2, 'Gérant'),
        (3, 'Administrateur')
      `);
      console.log('✅ Rôles de base insérés avec succès.');
    }

    const [tablesUserRole] = await db.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'lambardn_mite' 
      AND table_name = 'UtilisateurRole'
    `);

    if (tablesUserRole.length === 0) {
      await db.query(`
        CREATE TABLE UtilisateurRole (
          id_utilisateur INT,
          id_role INT,
          PRIMARY KEY (id_utilisateur, id_role),
          FOREIGN KEY (id_utilisateur) REFERENCES Utilisateur(id_utilisateur),
          FOREIGN KEY (id_role) REFERENCES Role(id_role)
        )
      `);
      console.log('✅ Table UtilisateurRole créée avec succès.');
    }

    const [admins] = await db.query(`
      SELECT u.id_utilisateur FROM Utilisateur u
      LEFT JOIN UtilisateurRole ur ON u.id_utilisateur = ur.id_utilisateur AND ur.id_role = 3
      WHERE ur.id_utilisateur IS NOT NULL
    `);

    if (admins.length === 0) {
      const [users] = await db.query('SELECT id_utilisateur FROM Utilisateur ORDER BY id_utilisateur LIMIT 1');
      
      if (users.length > 0) {
        const userId = users[0].id_utilisateur;
        
        const [clientRole] = await db.query(
          'SELECT * FROM UtilisateurRole WHERE id_utilisateur = ? AND id_role = 1',
          [userId]
        );
        
        if (clientRole.length === 0) {
          await db.query(
            'INSERT INTO UtilisateurRole (id_utilisateur, id_role) VALUES (?, ?)',
            [userId, 1]
          );
        }
        
        await db.query(
          'INSERT INTO UtilisateurRole (id_utilisateur, id_role) VALUES (?, ?)',
          [userId, 3]
        );
        
        console.log(`✅ Utilisateur ID ${userId} défini comme administrateur.`);
      }
    }

    res.status(200).json({
      message: 'Configuration des rôles initialisée avec succès',
      success: true
    });
  } catch (error) {
    console.error('❌ Erreur lors de l\'initialisation des rôles:', error);
    res.status(500).json({ 
      message: 'Erreur serveur lors de l\'initialisation des rôles.',
      error: error.message
    });
  }
};

const checkAndAssignAdminRole = async (req, res) => {
  try {
    const { userId } = req.body;
    console.log('⚙️ Vérification et attribution du rôle admin pour userId:', userId);
    
    if (!userId) {
      return res.status(400).json({ message: '❌ ID utilisateur requis' });
    }
    
    const [user] = await db.query('SELECT * FROM Utilisateur WHERE id_utilisateur = ?', [userId]);
    
    if (user.length === 0) {
      return res.status(404).json({ message: '❌ Utilisateur non trouvé' });
    }
    
    console.log('✅ Utilisateur trouvé:', user[0]);
    
    const [tables] = await db.query('SHOW TABLES');
    console.log('📊 Tables dans la base de données:');
    tables.forEach(table => console.log(`- ${Object.values(table)[0]}`));
    
    try {
      const [userRoleColumns] = await db.query('DESCRIBE UtilisateurRole');
      console.log('📊 Structure de la table UtilisateurRole:');
      userRoleColumns.forEach(col => console.log(`- ${col.Field}: ${col.Type}`));
    } catch (error) {
      console.log('❌ Table UtilisateurRole non trouvée ou erreur:', error.message);
      
      await db.query(`
        CREATE TABLE IF NOT EXISTS UtilisateurRole (
          id INT AUTO_INCREMENT PRIMARY KEY,
          id_utilisateur INT NOT NULL,
          id_role INT NOT NULL,
          FOREIGN KEY (id_utilisateur) REFERENCES Utilisateur(id_utilisateur) ON DELETE CASCADE,
          FOREIGN KEY (id_role) REFERENCES Role(id_role) ON DELETE CASCADE,
          UNIQUE KEY unique_user_role (id_utilisateur, id_role)
        )
      `);
      console.log('✅ Table UtilisateurRole créée');
    }
    
    try {
      const [roleColumns] = await db.query('DESCRIBE Role');
      console.log('📊 Structure de la table Role:');
      roleColumns.forEach(col => console.log(`- ${col.Field}: ${col.Type}`));
      
      const [roles] = await db.query('SELECT * FROM Role');
      console.log('👥 Rôles existants:', roles);
      
      if (!roles.some(role => role.id_role === 3)) {
        await db.query('INSERT INTO Role (id_role, nom_role, description) VALUES (3, "Administrateur", "Accès complet à toutes les fonctionnalités")');
        console.log('✅ Rôle Administrateur (id=3) créé');
      }
    } catch (error) {
      console.log('❌ Table Role non trouvée ou erreur:', error.message);
      
      await db.query(`
        CREATE TABLE IF NOT EXISTS Role (
          id_role INT PRIMARY KEY AUTO_INCREMENT,
          nom_role VARCHAR(50) NOT NULL,
          description TEXT
        )
      `);
      console.log('✅ Table Role créée');
      
      await db.query(`
        INSERT INTO Role (id_role, nom_role, description) VALUES 
        (1, 'Utilisateur', 'Accès basique'),
        (2, 'Gérant', 'Accès à la gestion des produits'),
        (3, 'Administrateur', 'Accès complet à toutes les fonctionnalités')
      `);
      console.log('✅ Rôles par défaut créés');
    }
    
    const [userRole] = await db.query(
      'SELECT * FROM UtilisateurRole WHERE id_utilisateur = ? AND id_role = 3',
      [userId]
    );
    
    if (userRole.length > 0) {
      console.log('✅ L\'utilisateur a déjà le rôle admin');
      return res.status(200).json({ 
        message: '✅ L\'utilisateur a déjà le rôle admin',
        isAdmin: true
      });
    }
    
    await db.query(
      'INSERT INTO UtilisateurRole (id_utilisateur, id_role) VALUES (?, 3)',
      [userId]
    );
    
    console.log('✅ Rôle admin attribué à l\'utilisateur');
    return res.status(200).json({ 
      message: '✅ Rôle admin attribué avec succès',
      isAdmin: true
    });
  } catch (error) {
    console.error('❌ Erreur lors de l\'attribution du rôle admin:', error);
    return res.status(500).json({ 
      message: '❌ Erreur lors de l\'attribution du rôle admin',
      error: error.message
    });
  }
};

const assignAdminRole = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: 'Token d\'authentification manquant' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.userId;

    console.log('🔑 Tentative d\'assignation du rôle admin pour userId:', userId);

    const [roles] = await db.query('SELECT * FROM Role WHERE id_role = 3');
    if (roles.length === 0) {
      await db.query(`
        CREATE TABLE IF NOT EXISTS Role (
          id_role INT PRIMARY KEY AUTO_INCREMENT,
          nom_role VARCHAR(50) NOT NULL UNIQUE
        )
      `);
      
      await db.query('INSERT IGNORE INTO Role (id_role, nom_role) VALUES (3, "Administrateur")');
    }

    const [tables] = await db.query('SHOW TABLES LIKE "UtilisateurRole"');
    if (tables.length === 0) {
      await db.query(`
        CREATE TABLE IF NOT EXISTS UtilisateurRole (
          id INT AUTO_INCREMENT PRIMARY KEY,
          id_utilisateur INT NOT NULL,
          id_role INT NOT NULL DEFAULT 3,
          FOREIGN KEY (id_utilisateur) REFERENCES Utilisateur(id_utilisateur),
          FOREIGN KEY (id_role) REFERENCES Role(id_role)
        )
      `);
    }

    const [existingRole] = await db.query(
      'SELECT * FROM UtilisateurRole WHERE id_utilisateur = ?',
      [userId]
    );

    if (existingRole.length > 0) {
      await db.query(
        'UPDATE UtilisateurRole SET id_role = 3 WHERE id_utilisateur = ?',
        [userId]
      );
    } else {
      await db.query(
        'INSERT INTO UtilisateurRole (id_utilisateur, id_role) VALUES (?, 3)',
        [userId]
      );
    }

    console.log('✅ Rôle admin assigné avec succès');
    res.status(200).json({ 
      message: 'Rôle administrateur assigné avec succès',
      userId: userId,
      roleId: 3
    });
  } catch (error) {
    console.error('❌ Erreur lors de l\'assignation du rôle admin:', error);
    res.status(500).json({ 
      message: 'Erreur lors de l\'assignation du rôle admin', 
      error: error.message 
    });
  }
};

module.exports = {
  getAllProducts,
  addProduct,
  updateProduct,
  toggleProductStatus,
  deleteProduct,
  getAllCategories,
  addCategory,
  updateCategory,
  deleteCategory,
  getAllUsers,
  updateUserRole,
  verifierRoleAdmin,
  checkRoleConfig,
  initRoles,
  checkAndAssignAdminRole,
  assignAdminRole
}; 