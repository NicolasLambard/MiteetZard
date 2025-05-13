const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

router.post('/register', userController.registerUser);

router.post('/login', userController.loginUser);

router.get('/:userId', userController.getUserProfile);

router.get('/:userId/roles', userController.getUserRoles);

router.get('/test', (req, res) => {
    res.status(200).send('Route GET de test pour /api/users fonctionne correctement.');
});

module.exports = router;
