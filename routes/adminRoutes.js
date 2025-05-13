const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { db } = require('../db');
const {
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
  checkRoleConfig,
  initRoles,
  assignAdminRole
} = require('../controllers/adminController');
const { getUserOrders, getOrderDetails, updateOrderStatus } = require('../controllers/orderController');
const { authMiddleware, isAdmin } = require('../middleware/authMiddleware');
const { createProduct } = require('../controllers/productController');

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

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 
  }
});

router.use(authMiddleware);
router.use(isAdmin);

router.get('/products', getAllProducts);
router.post('/products', upload.single('image'), createProduct);
router.put('/products', upload.single('image'), updateProduct);
router.put('/products/toggle-status', toggleProductStatus);
router.delete('/products/:id_produit', deleteProduct);

router.get('/categories', getAllCategories);
router.post('/categories', addCategory);
router.put('/categories', updateCategory);
router.delete('/categories/:id_categorie', deleteCategory);

router.get('/users', getAllUsers);
router.put('/users/role', updateUserRole);
router.get('/check-roles', checkRoleConfig);

router.get('/orders', async (req, res) => {
  try {
    const [orders] = await db.query(`
      SELECT c.*, u.nom, u.prenom, u.email, u.telephone, u.adresse, u.ville, u.code_postal
      FROM Commande c
      JOIN Utilisateur u ON c.id_utilisateur = u.id_utilisateur
      ORDER BY c.date_commande DESC
    `);
    
    for (let i = 0; i < orders.length; i++) {
      const [details] = await db.query(`
        SELECT dc.*, p.nom_produit, m.nom_menu
        FROM DetailCommande dc 
        LEFT JOIN Produit p ON dc.id_produit = p.id_produit 
        LEFT JOIN Menu m ON dc.id_menu = m.id_menu 
        WHERE dc.id_commande = ?
      `, [orders[i].id_commande]);
      
      orders[i].details = details;
    }
    
    res.status(200).json(orders);
  } catch (error) {
    console.error('❌ Erreur lors de la récupération des commandes:', error);
    res.status(500).json({ message: 'Erreur serveur lors de la récupération des commandes' });
  }
});
router.get('/orders/:orderId', getOrderDetails);
router.put('/orders/status', updateOrderStatus);

router.post('/init-roles', initRoles);

router.post('/assign-admin', authMiddleware, assignAdminRole);

router.get('/test', (req, res) => {
  res.status(200).send('✅ Les routes admin fonctionnent correctement');
});

module.exports = router; 