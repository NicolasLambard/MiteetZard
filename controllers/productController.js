const { db } = require('../db');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const multer = require('multer');
const { verifierRoleAdmin } = require('./adminController');
const { verifierTableCategorie, verifierTableProduit } = require('./categoryController');

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

const imageToBase64 = (filePath) => {
  try {
    const data = fs.readFileSync(filePath);
    return `data:image/jpeg;base64,${data.toString('base64')}`;
  } catch (error) {
    console.error('Erreur lors de la conversion de l\'image:', error);
    return null;
  }
};

const getAllProducts = async (req, res) => {
  try {
    const isAdmin = await verifierRoleAdmin(req);
    if (!isAdmin) {
      return res.status(403).json({ message: 'Accès non autorisé' });
    }
    
    const query = `
      SELECT p.*, c.nom_categorie 
      FROM lambardn_mite.Produit p
      LEFT JOIN lambardn_mite.Categorie c ON p.categorie = c.nom_categorie
      ORDER BY p.nom_produit
    `;
    
    const [results] = await db.query(query);
    
    const products = results.map(product => {
      if (product.image_data) {
        const base64Image = product.image_data.toString('base64');
        product.image_data = `data:image/jpeg;base64,${base64Image}`;
      }
      return product;
    });
    
    return res.status(200).json(products);
  } catch (error) {
    console.error('Erreur lors de la récupération des produits:', error);
    return res.status(500).json({ message: 'Erreur lors de la récupération des produits' });
  }
};

const createProduct = async (req, res) => {
  console.log('🔍 Fonction createProduct appelée');
  console.log('🔍 Type de contenu:', req.headers['content-type']);
  console.log('🔍 Données reçues:', req.body);
  console.log('🔍 Fichier image reçu:', req.file);
  
  try {
    if (!req.body.nom_produit || !req.body.prix || !req.body.categorie) {
      console.log('❌ Validation échouée:', { 
        nom_produit: req.body.nom_produit,
        prix: req.body.prix,
        categorie: req.body.categorie
      });
      return res.status(400).json({ 
        error: 'Les champs nom_produit, prix et categorie sont obligatoires',
        receivedData: {
          nom_produit: req.body.nom_produit || null,
          prix: req.body.prix || null,
          categorie: req.body.categorie || null
        }
      });
    }

    const nom_produit = req.body.nom_produit;
    const description = req.body.description || '';
    const prix = req.body.prix;
    const categorie = req.body.categorie;
    const actif = req.body.actif === '1' || req.body.actif === true || req.body.actif === 1 ? 1 : 0;
    let image_data = null;

    if (req.file && req.file.buffer) {
      image_data = req.file.buffer;
      console.log('🖼️ Image reçue de taille:', req.file.size);
    }

    const isAdmin = await verifierRoleAdmin(req);
    if (!isAdmin) {
      return res.status(403).json({ message: 'Accès non autorisé' });
    }

    await verifierTableCategorie();
    await verifierTableProduit();
    
    const [categorieExists] = await db.query(
      'SELECT nom_categorie FROM lambardn_mite.Categorie WHERE nom_categorie = ?',
      [categorie]
    );

    if (categorieExists.length === 0) {
      return res.status(400).json({ message: 'La catégorie spécifiée n\'existe pas' });
    }

    const [result] = await db.query(
      'INSERT INTO lambardn_mite.Produit (nom_produit, description, prix, image_data, actif, categorie) VALUES (?, ?, ?, ?, ?, ?)',
      [
        nom_produit.trim(),
        description ? description.trim() : null,
        parseFloat(prix),
        image_data,
        actif,
        categorie
      ]
    );

    console.log('Produit créé avec succès, ID:', result.insertId);
    
    return res.status(201).json({
      message: 'Produit créé avec succès',
      id_produit: result.insertId
    });

  } catch (error) {
    console.error('Erreur lors de la création du produit:', error);
    if (error instanceof multer.MulterError) {
      return res.status(400).json({ message: `Erreur lors de l'upload de l'image: ${error.message}` });
    }
    return res.status(500).json({ message: 'Erreur lors de la création du produit' });
  }
};

const updateProduct = async (req, res) => {
  try {
    await verifierTableCategorie();
    await verifierTableProduit();
    
    await uploadMiddleware(req, res);
    
    const productId = req.params.id;
    
    const isAdmin = await verifierRoleAdmin(req);
    if (!isAdmin) {
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(403).json({ message: 'Accès non autorisé' });
    }
    
    const { nom_produit, description, prix, categorie, actif } = req.body;
    
    if (!nom_produit || !prix || !categorie) {
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({ message: 'Nom, prix et catégorie sont obligatoires' });
    }
    
    let imageData = null;
    let updateImageData = false;
    
    if (req.file) {
      imageData = fs.readFileSync(req.file.path);
      updateImageData = true;
      fs.unlinkSync(req.file.path);
    }
    
    let query = `
      UPDATE lambardn_mite.Produit
      SET nom_produit = ?, description = ?, prix = ?, categorie = ?, actif = ?
    `;
    
    let params = [nom_produit, description || null, prix, categorie, actif || 0];
    
    if (updateImageData) {
      query += `, image_data = ?`;
      params.push(imageData);
    }
    
    query += ` WHERE id_produit = ?`;
    params.push(productId);
    
    const [result] = await db.query(query, params);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Produit non trouvé' });
    }
    
    return res.status(200).json({ 
      message: 'Produit mis à jour avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour du produit:', error);
    
    if (error instanceof multer.MulterError) {
      return res.status(400).json({ message: `Erreur lors de l'upload de l'image: ${error.message}` });
    }
    
    return res.status(500).json({ message: 'Erreur lors de la mise à jour du produit' });
  }
};

const deleteProduct = async (req, res) => {
  try {
    await verifierTableCategorie();
    await verifierTableProduit();
    
    const productId = req.params.id;
    const userId = req.body.userId;
    
    const isAdmin = await verifierRoleAdmin(userId);
    if (!isAdmin) {
      return res.status(403).json({ message: 'Accès non autorisé' });
    }
    
    const query = `
      DELETE FROM lambardn_mite.Produit
      WHERE id_produit = ?
    `;
    
    const [result] = await db.query(query, [productId]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Produit non trouvé' });
    }
    
    return res.status(200).json({ 
      message: 'Produit supprimé avec succès',
      id_produit: productId
    });
  } catch (error) {
    console.error('Erreur lors de la suppression du produit:', error);
    return res.status(500).json({ message: 'Erreur lors de la suppression du produit' });
  }
};

const getProductById = async (req, res) => {
  try {
    await verifierTableCategorie();
    await verifierTableProduit();
    
    const productId = req.params.id;
    
    const query = `
      SELECT p.*, c.nom_categorie 
      FROM lambardn_mite.Produit p
      LEFT JOIN lambardn_mite.Categorie c ON p.categorie = c.nom_categorie
      WHERE p.id_produit = ?
    `;
    
    const [results] = await db.query(query, [productId]);
    
    if (results.length === 0) {
      return res.status(404).json({ message: 'Produit non trouvé' });
    }
    
    const product = results[0];
    
    if (product.image_data) {
      const base64Image = product.image_data.toString('base64');
      product.image_data = `data:image/jpeg;base64,${base64Image}`;
    }
    
    return res.status(200).json(product);
  } catch (error) {
    console.error('Erreur lors de la récupération du produit:', error);
    return res.status(500).json({ message: 'Erreur lors de la récupération du produit' });
  }
};

const getActiveProducts = async (req, res) => {
  try {
    await verifierTableCategorie();
    await verifierTableProduit();
    
    const query = `
      SELECT p.id_produit, p.nom_produit, p.description, p.prix, p.image_data, 
             c.id_categorie, c.nom_categorie
      FROM lambardn_mite.Produit p
      LEFT JOIN lambardn_mite.Categorie c ON p.categorie = c.nom_categorie
      WHERE p.actif = 1
      ORDER BY c.nom_categorie, p.nom_produit
    `;
    
    const [results] = await db.query(query);
    
    const products = results.map(product => {
      if (product.image_data) {
        const base64Image = product.image_data.toString('base64');
        product.image_data = `data:image/jpeg;base64,${base64Image}`;
      }
      return product;
    });
    
    const productsByCategory = products.reduce((acc, product) => {
      const category = product.nom_categorie || 'Sans catégorie';
      
      if (!acc[category]) {
        acc[category] = [];
      }
      
      acc[category].push(product);
      return acc;
    }, {});
    
    return res.status(200).json(productsByCategory);
  } catch (error) {
    console.error('Erreur lors de la récupération des produits actifs:', error);
    return res.status(500).json({ message: 'Erreur lors de la récupération des produits' });
  }
};

module.exports = {
  getAllProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  getProductById,
  getActiveProducts,
  upload
}; 