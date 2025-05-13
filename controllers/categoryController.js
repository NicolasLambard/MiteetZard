const { db } = require('../db');
const { verifierRoleAdmin } = require('./adminController');

const verifierTableCategorie = async () => {
  try {
    const [tableCheck] = await db.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'lambardn_mite' 
      AND table_name = 'Categorie'
    `);

    if (tableCheck.length === 0) {
      console.log('La table Categorie n\'existe pas, création en cours...');
      
      await db.query(`
        CREATE TABLE IF NOT EXISTS lambardn_mite.Categorie (
          id_categorie INT AUTO_INCREMENT PRIMARY KEY,
          nom_categorie VARCHAR(100) NOT NULL,
          description TEXT,
          ordre INT DEFAULT 1
        )
      `);
      
      console.log('Table Categorie créée avec succès');
      
      await db.query(`
        INSERT INTO lambardn_mite.Categorie (nom_categorie, description, ordre) VALUES 
        ('Entrées', 'Nos entrées à partager ou en solo', 1),
        ('Plats', 'Nos spécialités principales', 2),
        ('Desserts', 'Nos douceurs sucrées', 3),
        ('Boissons', 'Nos rafraîchissements', 4)
      `);
      
      console.log('Catégories par défaut insérées avec succès');
      
      return true;
    }
    
    return true;
  } catch (error) {
    console.error('Erreur lors de la vérification/création de la table Categorie:', error);
    throw error;
  }
};

const verifierTableProduit = async () => {
  try {
    const [tableCheck] = await db.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'lambardn_mite' 
      AND table_name = 'Produit'
    `);

    if (tableCheck.length === 0) {
      console.log('La table Produit n\'existe pas, création en cours...');
      
      await db.query(`
        CREATE TABLE lambardn_mite.Produit (
          id_produit INT AUTO_INCREMENT PRIMARY KEY,
          nom_produit VARCHAR(100) NOT NULL,
          description TEXT,
          prix DECIMAL(10,2) NOT NULL,
          categorie VARCHAR(100),
          image_data LONGBLOB,
          actif TINYINT(1) DEFAULT 1,
          FOREIGN KEY (categorie) REFERENCES Categorie(nom_categorie) ON DELETE SET NULL ON UPDATE CASCADE
        )
      `);
      
      console.log('Table Produit créée avec succès');
      return true;
    }
    
    return true;
  } catch (error) {
    console.error('Erreur lors de la vérification/création de la table Produit:', error);
    throw error;
  }
};

const initTables = async (req, res) => {
  try {
    await verifierTableCategorie();
    await verifierTableProduit();
    
    res.status(200).json({
      message: 'Tables de catégories et produits initialisées avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de l\'initialisation des tables:', error);
    res.status(500).json({
      message: 'Erreur lors de l\'initialisation des tables',
      error: error.message
    });
  }
};

const getAllCategories = async (req, res) => {
  try {
    console.log('Début de getAllCategories');
    
    const isAdmin = await verifierRoleAdmin(req);
    if (!isAdmin) {
      console.log('Accès refusé - utilisateur non admin');
      return res.status(403).json({ message: 'Accès non autorisé' });
    }
    
    await verifierTableCategorie();
    
    const [categories] = await db.execute(`
      SELECT id_categorie, nom_categorie, description, ordre 
      FROM lambardn_mite.Categorie 
      ORDER BY ordre ASC
    `);
    
    console.log('Nombre de catégories trouvées:', categories.length);
    
    if (categories.length === 0) {
      console.log('Aucune catégorie trouvée, insertion des catégories par défaut...');
      await db.execute(`
        INSERT INTO lambardn_mite.Categorie (nom_categorie, description, ordre) VALUES 
        ('Entrées', 'Nos entrées à partager ou en solo', 1),
        ('Plats', 'Nos spécialités principales', 2),
        ('Desserts', 'Nos douceurs sucrées', 3),
        ('Boissons', 'Nos rafraîchissements', 4)
      `);
      
      const [newCategories] = await db.execute(`
        SELECT id_categorie, nom_categorie, description, ordre 
        FROM lambardn_mite.Categorie 
        ORDER BY ordre ASC
      `);
      
      console.log('Catégories par défaut insérées avec succès');
      return res.json(newCategories);
    }
    
    console.log('Catégories récupérées avec succès');
    return res.json(categories);
  } catch (error) {
    console.error('Erreur détaillée lors de la récupération des catégories:', error);
    return res.status(500).json({ 
      message: 'Erreur lors du chargement des catégories',
      error: error.message,
      stack: error.stack
    });
  }
};

const createCategory = async (req, res) => {
  const { nom_categorie, description, ordre } = req.body;
  
  try {
    await verifierTableCategorie();
    
    const isAdmin = await verifierRoleAdmin(req);
    if (!isAdmin) {
      return res.status(403).json({ message: 'Accès non autorisé' });
    }
    
    if (!nom_categorie) {
      return res.status(400).json({ message: 'Nom de la catégorie obligatoire' });
    }
    
    const query = `
      INSERT INTO lambardn_mite.Categorie (nom_categorie, description, ordre)
      VALUES (?, ?, ?)
    `;
    
    const [result] = await db.query(query, [nom_categorie, description || null, ordre || 1]);
    
    return res.status(201).json({
      message: 'Catégorie créée avec succès',
      id_categorie: result.insertId
    });
  } catch (error) {
    console.error('Erreur lors de la création de la catégorie:', error);
    return res.status(500).json({ message: 'Erreur lors de la création de la catégorie' });
  }
};

const updateCategory = async (req, res) => {
  const categoryId = req.params.id;
  const { nom_categorie, description, ordre } = req.body;
  
  try {
    console.log('Début de la mise à jour de la catégorie:', { categoryId, nom_categorie, description, ordre });
    
    await verifierTableCategorie();
    
    const isAdmin = await verifierRoleAdmin(req);
    if (!isAdmin) {
      console.log('Accès refusé - utilisateur non admin');
      return res.status(403).json({ message: 'Accès non autorisé' });
    }
    
    if (!nom_categorie) {
      console.log('Données manquantes - nom_categorie obligatoire');
      return res.status(400).json({ message: 'Nom de la catégorie obligatoire' });
    }
    
    const query = `
      UPDATE lambardn_mite.Categorie
      SET nom_categorie = ?, description = ?, ordre = ?
      WHERE id_categorie = ?
    `;
    
    console.log('Exécution de la requête:', query);
    console.log('Paramètres:', [nom_categorie, description || null, ordre || 1, categoryId]);
    
    const [result] = await db.execute(query, [nom_categorie, description || null, ordre || 1, categoryId]);
    
    console.log('Résultat de la requête:', result);
    
    if (result.affectedRows === 0) {
      console.log('Aucune catégorie trouvée avec l\'ID:', categoryId);
      return res.status(404).json({ message: 'Catégorie non trouvée' });
    }
    
    console.log('Catégorie mise à jour avec succès');
    return res.status(200).json({ message: 'Catégorie mise à jour avec succès' });
  } catch (error) {
    console.error('Erreur détaillée lors de la mise à jour de la catégorie:', error);
    return res.status(500).json({ 
      message: 'Erreur lors de la mise à jour de la catégorie',
      error: error.message,
      stack: error.stack
    });
  }
};

const deleteCategory = async (req, res) => {
  const categoryId = req.params.id;
  
  try {
    await verifierTableCategorie();
    
    const isAdmin = await verifierRoleAdmin(req);
    if (!isAdmin) {
      return res.status(403).json({ message: 'Accès non autorisé' });
    }
    
    const [category] = await db.query(
      'SELECT nom_categorie FROM lambardn_mite.Categorie WHERE id_categorie = ?',
      [categoryId]
    );
    
    if (category.length === 0) {
      return res.status(404).json({ message: 'Catégorie non trouvée' });
    }
    
    const checkQuery = `
      SELECT COUNT(*) AS count
      FROM lambardn_mite.Produit
      WHERE categorie = ?
    `;
    
    const [products] = await db.query(checkQuery, [category[0].nom_categorie]);
    
    if (products[0].count > 0) {
      await db.query(
        'UPDATE lambardn_mite.Produit SET categorie = NULL WHERE categorie = ?',
        [category[0].nom_categorie]
      );
    }
    
    const deleteQuery = `
      DELETE FROM lambardn_mite.Categorie
      WHERE id_categorie = ?
    `;
    
    const [result] = await db.query(deleteQuery, [categoryId]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Catégorie non trouvée' });
    }
    
    return res.status(200).json({ message: 'Catégorie supprimée avec succès' });
  } catch (error) {
    console.error('Erreur lors de la suppression de la catégorie:', error);
    return res.status(500).json({ message: 'Erreur lors de la suppression de la catégorie' });
  }
};

module.exports = {
  verifierTableCategorie,
  verifierTableProduit,
  initTables,
  getAllCategories,
  createCategory,
  updateCategory,
  deleteCategory
}; 