const jwt = require('jsonwebtoken');

const JWT_SECRET = '8f7b3c2a1d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2';

const authMiddleware = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ message: 'Token d\'authentification manquant' });
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      
      req.user = decoded;
      
      next();
    } catch (jwtError) {
      if (jwtError.name === 'TokenExpiredError') {
        console.warn('⚠️ Token expiré mais on continue la session');
        
        const decodedAnyway = jwt.decode(token);
        
        if (decodedAnyway) {
          req.user = decodedAnyway;
          return next();
        }
      }
      
      throw jwtError;
    }
  } catch (error) {
    console.error('❌ Erreur d\'authentification:', error);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        message: 'Session expirée, veuillez vous reconnecter',
        error: 'TOKEN_EXPIRED'
      });
    } else if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        message: 'Token invalide',
        error: 'INVALID_TOKEN'
      });
    }
    
    return res.status(401).json({ 
      message: 'Erreur d\'authentification', 
      error: 'AUTH_ERROR'
    });
  }
};

const isAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(403).json({ message: 'Non autorisé' });
  }

  const roles = Array.isArray(req.user.roles) ? req.user.roles : req.user.roles.split(',');
  
  if (!roles.includes('Administrateur')) {
    return res.status(403).json({ message: 'Accès réservé aux administrateurs' });
  }

  next();
};

module.exports = { authMiddleware, isAdmin }; 