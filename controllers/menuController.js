const { db } = require('../db');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const multer = require('multer');
const { verifierRoleAdmin } = require('./adminController');

const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    const uploadDir = path.join(__dirname, '../uploads');
    
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    cb(null, uploadDir);
  },
  filename: function(req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Le fichier doit être une image'), false);
  }
};

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 2 * 1024 * 1024 
  },
  fileFilter: fileFilter
});

const uploadMiddleware = promisify(upload.single('image'));

const verifierTableMenu = async () => {
  try {
    const [tables] = await db.query("SHOW TABLES LIKE 'Menu'");
    if (tables.length === 0) {
      await db.query(`
        CREATE TABLE IF NOT EXISTS Menu (
          id_menu INT AUTO_INCREMENT PRIMARY KEY,
          nom_menu VARCHAR(150) NOT NULL,
          description TEXT DEFAULT NULL,
          prix DECIMAL(10,2) NOT NULL,
          image_data LONGBLOB,
          actif TINYINT(1) DEFAULT 1
        )
      `);
      console.log('✅ Table Menu créée avec succès');
    }

    const [liaison] = await db.query("SHOW TABLES LIKE 'MenuProduit'");
    if (liaison.length === 0) {
      await db.query(`
        CREATE TABLE IF NOT EXISTS MenuProduit (
          id_menu_produit INT AUTO_INCREMENT PRIMARY KEY,
          id_menu INT NOT NULL,
          id_produit INT NOT NULL,
          FOREIGN KEY (id_menu) REFERENCES Menu(id_menu) ON DELETE CASCADE,
          FOREIGN KEY (id_produit) REFERENCES Produit(id_produit) ON DELETE CASCADE
        )
      `);
      console.log('✅ Table MenuProduit créée avec succès');
    }
  } catch (error) {
    console.error('❌ Erreur lors de la vérification des tables Menu:', error);
    throw error;
  }
};

const getAllMenus = async (req, res) => {
  try {
    const { userId } = req.query;
    
    const estAdmin = await verifierRoleAdmin(userId);
    if (!estAdmin) {
      return res.status(403).json({ message: '🚫 Accès refusé - Droits administrateur requis' });
    }

    await verifierTableMenu();

    const [menus] = await db.query(`
      SELECT * FROM Menu
      ORDER BY nom_menu
    `);

    for (let i = 0; i < menus.length; i++) {
      const [produits] = await db.query(`
        SELECT p.id_produit, p.nom_produit, p.prix, p.categorie, c.nom_categorie 
        FROM Produit p
        INNER JOIN MenuProduit mp ON p.id_produit = mp.id_produit
        LEFT JOIN Categorie c ON p.categorie = c.nom_categorie
        WHERE mp.id_menu = ?
      `, [menus[i].id_menu]);
      
      menus[i].produits = produits;
      
      if (menus[i].image_data) {
        const base64Image = menus[i].image_data.toString('base64');
        menus[i].image_data = `data:image/jpeg;base64,${base64Image}`;
      }
    }

    res.status(200).json(menus);
  } catch (error) {
    console.error('❌ Erreur lors de la récupération des menus:', error);
    res.status(500).json({ message: 'Erreur serveur lors de la récupération des menus' });
  }
};

const createMenu = async (req, res) => {
  try {
    await verifierTableMenu();
    
    await uploadMiddleware(req, res);
    
    const { userId, nom_menu, description, prix, produits, actif } = req.body;
    const estAdmin = await verifierRoleAdmin(userId);
    if (!estAdmin) {
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(403).json({ message: '🚫 Accès refusé - Droits administrateur requis' });
    }

    if (!nom_menu || !prix || !produits) {
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({ message: 'Nom, prix et liste de produits sont obligatoires' });
    }
    
    let imageData = null;
    
    if (req.file) {
      imageData = fs.readFileSync(req.file.path);
      fs.unlinkSync(req.file.path);
    }
    
    await db.beginTransaction();
    
    try {
      const [menuResult] = await db.query(
        'INSERT INTO Menu (nom_menu, description, prix, image_data, actif) VALUES (?, ?, ?, ?, ?)',
        [nom_menu, description, prix, imageData, actif || 1]
      );
      
      const menuId = menuResult.insertId;
      const produitsArray = JSON.parse(produits);
      
      for (const produitId of produitsArray) {
        await db.query(
          'INSERT INTO MenuProduit (id_menu, id_produit) VALUES (?, ?)',
          [menuId, produitId]
        );
      }
      
      await db.commit();
      
      res.status(201).json({
        message: '✅ Menu créé avec succès',
        menuId: menuId
      });
    } catch (error) {
      await db.rollback();
      throw error;
    }
  } catch (error) {
    console.error('❌ Erreur lors de la création du menu:', error);
    
    if (error instanceof multer.MulterError) {
      return res.status(400).json({ message: `Erreur lors de l'upload de l'image: ${error.message}` });
    }
    
    res.status(500).json({ message: 'Erreur serveur lors de la création du menu' });
  }
};

const updateMenu = async (req, res) => {
  try {
    await verifierTableMenu();
    
    await uploadMiddleware(req, res);
    
    const { userId, id_menu, nom_menu, description, prix, produits, actif } = req.body;
    
    const estAdmin = await verifierRoleAdmin(userId);
    if (!estAdmin) {
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(403).json({ message: '🚫 Accès refusé - Droits administrateur requis' });
    }

    if (!id_menu || !nom_menu || !prix || !produits) {
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({ message: 'ID du menu, nom, prix et liste de produits sont obligatoires' });
    }
    
    let imageData = null;
    let updateImageData = false;
    
    if (req.file) {
      imageData = fs.readFileSync(req.file.path);
      updateImageData = true;
      fs.unlinkSync(req.file.path);
    }
    
    await db.beginTransaction();
    
    try {
      let query = `
        UPDATE Menu 
        SET nom_menu = ?, description = ?, prix = ?, actif = ?
      `;
      
      let params = [nom_menu, description, prix, actif || 1];
      
      if (updateImageData) {
        query += `, image_data = ?`;
        params.push(imageData);
      }
      
      query += ` WHERE id_menu = ?`;
      params.push(id_menu);
      
      await db.query(query, params);
      
      await db.query('DELETE FROM MenuProduit WHERE id_menu = ?', [id_menu]);
      
      const produitsArray = JSON.parse(produits);
      for (const produitId of produitsArray) {
        await db.query(
          'INSERT INTO MenuProduit (id_menu, id_produit) VALUES (?, ?)',
          [id_menu, produitId]
        );
      }
      
      await db.commit();
      
      res.status(200).json({
        message: '✅ Menu mis à jour avec succès',
        menuId: id_menu
      });
    } catch (error) {
      await db.rollback();
      throw error;
    }
  } catch (error) {
    console.error('❌ Erreur lors de la mise à jour du menu:', error);
    
    if (error instanceof multer.MulterError) {
      return res.status(400).json({ message: `Erreur lors de l'upload de l'image: ${error.message}` });
    }
    
    res.status(500).json({ message: 'Erreur serveur lors de la mise à jour du menu' });
  }
};

const deleteMenu = async (req, res) => {
  try {
    const { userId } = req.body;
    const { id_menu } = req.params;
    
    const estAdmin = await verifierRoleAdmin(userId);
    if (!estAdmin) {
      return res.status(403).json({ message: '🚫 Accès refusé - Droits administrateur requis' });
    }

    await verifierTableMenu();
    
    await db.beginTransaction();
    
    try {
      
      await db.query('DELETE FROM Menu WHERE id_menu = ?', [id_menu]);
      
      await db.commit();
      
      res.status(200).json({
        message: '✅ Menu supprimé avec succès',
        menuId: id_menu
      });
    } catch (error) {
      await db.rollback();
      throw error;
    }
  } catch (error) {
    console.error('❌ Erreur lors de la suppression du menu:', error);
    res.status(500).json({ message: 'Erreur serveur lors de la suppression du menu' });
  }
};

const getMenuById = async (req, res) => {
  try {
    const { id_menu } = req.params;
    
    await verifierTableMenu();
    
    const [menus] = await db.query('SELECT * FROM Menu WHERE id_menu = ?', [id_menu]);
    
    if (menus.length === 0) {
      return res.status(404).json({ message: '❌ Menu non trouvé' });
    }
    
    const menu = menus[0];
    
    const [produits] = await db.query(`
      SELECT p.id_produit, p.nom_produit, p.prix, p.categorie, c.nom_categorie 
      FROM Produit p
      INNER JOIN MenuProduit mp ON p.id_produit = mp.id_produit
      LEFT JOIN Categorie c ON p.categorie = c.nom_categorie
      WHERE mp.id_menu = ?
    `, [id_menu]);
    
    menu.produits = produits;
    
    if (menu.image_data) {
      const base64Image = menu.image_data.toString('base64');
      menu.image_data = `data:image/jpeg;base64,${base64Image}`;
    }
    
    res.status(200).json(menu);
  } catch (error) {
    console.error('❌ Erreur lors de la récupération du menu:', error);
    res.status(500).json({ message: 'Erreur serveur lors de la récupération du menu' });
  }
};

const getActiveMenus = async (req, res) => {
  try {
    console.log('📥 Début de la récupération des menus actifs');
    
    await verifierTableMenu();
    console.log('✅ Tables vérifiées');
    
    const [menus] = await db.query(`
      SELECT * FROM Menu
      WHERE actif = 1
      ORDER BY nom_menu
    `);
    
    console.log(`📋 Nombre de menus trouvés: ${menus.length}`);
    
    for (let i = 0; i < menus.length; i++) {
      console.log(`🔄 Traitement du menu ${i + 1}/${menus.length}: ${menus[i].nom_menu}`);
      
      const [produits] = await db.query(`
        SELECT p.id_produit, p.nom_produit, p.description, p.prix, p.categorie, c.nom_categorie 
        FROM Produit p
        INNER JOIN MenuProduit mp ON p.id_produit = mp.id_produit
        LEFT JOIN Categorie c ON p.categorie = c.nom_categorie
        WHERE mp.id_menu = ?
      `, [menus[i].id_menu]);
      
      console.log(`📦 Nombre de produits trouvés pour ce menu: ${produits.length}`);
      menus[i].produits = produits;
      
      if (menus[i].image_data) {
        console.log('🖼️ Conversion de l\'image en base64');
        const base64Image = menus[i].image_data.toString('base64');
        menus[i].image_data = `data:image/jpeg;base64,${base64Image}`;
      }
    }
    
    console.log('✅ Envoi des menus au client');
    res.status(200).json(menus);
  } catch (error) {
    console.error('❌ Erreur lors de la récupération des menus actifs:', error);
    res.status(500).json({ message: 'Erreur serveur lors de la récupération des menus actifs' });
  }
};

module.exports = {
  getAllMenus,
  createMenu,
  updateMenu,
  deleteMenu,
  getMenuById,
  getActiveMenus,
  upload
}; 