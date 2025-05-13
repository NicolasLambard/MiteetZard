const express = require('express');
const router = express.Router();
const {
  getAllMenus,
  createMenu,
  updateMenu,
  deleteMenu,
  getMenuById,
  getActiveMenus,
  upload
} = require('../controllers/menuController');

router.get('/admin', getAllMenus);
router.post('/admin', upload.single('image'), createMenu);
router.put('/admin', upload.single('image'), updateMenu);
router.delete('/admin/:id_menu', deleteMenu);
router.get('/admin/:id_menu', getMenuById);

router.get('/', getActiveMenus);
router.get('/:id_menu', getMenuById);

module.exports = router; 