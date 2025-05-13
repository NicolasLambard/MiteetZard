const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const categoryController = require('../controllers/categoryController');
const productController = require('../controllers/productController');
const userController = require('../controllers/userController');

router.get('/check-roles', adminController.checkRoleConfig);
router.post('/init-roles', adminController.initRoles);
router.post('/assign-admin', adminController.assignAdminRole);

router.get('/categories', categoryController.getAllCategories);
router.post('/categories', categoryController.createCategory);
router.put('/categories/:id', categoryController.updateCategory);
router.delete('/categories/:id', categoryController.deleteCategory);

router.get('/products', productController.getAllProducts);
router.post('/products', productController.createProduct);
router.put('/products/:id', productController.updateProduct);
router.delete('/products/:id', productController.deleteProduct);

router.get('/users', adminController.getAllUsers);
router.put('/users/:id/role', adminController.updateUserRole);

module.exports = router; 