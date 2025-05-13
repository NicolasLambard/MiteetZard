const express = require('express');
const router = express.Router();
const {
  getUserOrders,
  getOrderDetails,
  createOrder,
  updateOrderStatus
} = require('../controllers/orderController');
const { authMiddleware } = require('../middleware/authMiddleware');

router.use(authMiddleware);

router.use((req, res, next) => {
  console.log(`📝 Requête reçue: ${req.method} ${req.originalUrl}`);
  next();
});

router.get('/user/:userId', (req, res) => {
  console.log(`🔍 Récupération des commandes pour l'utilisateur ID: ${req.params.userId}`);
  getUserOrders(req, res);
});
router.get('/:orderId', getOrderDetails);
router.post('/', createOrder);
router.put('/status', updateOrderStatus);

module.exports = router; 