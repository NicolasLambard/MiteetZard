const { db } = require('../db');
const { v4: uuidv4 } = require('uuid');

const getUserOrders = async (req, res) => {
  try {
    const userId = req.params.userId || req.query.userId;
    
    if (!userId) {
      return res.status(400).json({ message: '❌ ID utilisateur requis' });
    }
    
    const [orders] = await db.query(`
      SELECT c.id_commande, c.date_commande, c.id_statut_commande, c.montant_total as total, sc.nom_statut 
      FROM Commande c
      LEFT JOIN StatutCommande sc ON c.id_statut_commande = sc.id_statut_commande
      WHERE c.id_utilisateur = ? 
      ORDER BY c.date_commande DESC
    `, [userId]);
    
    for (let i = 0; i < orders.length; i++) {
      const [details] = await db.query(`
        SELECT dc.*, 
               p.nom_produit, 
               m.nom_menu 
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
};

const getOrderDetails = async (req, res) => {
  try {
    const orderId = req.params.orderId;
    
    if (!orderId) {
      return res.status(400).json({ message: '❌ ID de commande requis' });
    }
    
    const [order] = await db.query(`
      SELECT c.*, sc.nom_statut 
      FROM Commande c
      LEFT JOIN StatutCommande sc ON c.id_statut_commande = sc.id_statut_commande
      WHERE c.id_commande = ?
    `, [orderId]);
    
    if (order.length === 0) {
      return res.status(404).json({ message: '❌ Commande non trouvée' });
    }
    
    const [details] = await db.query(`
      SELECT dc.*, 
             p.nom_produit, 
             m.nom_menu 
      FROM DetailCommande dc 
      LEFT JOIN Produit p ON dc.id_produit = p.id_produit 
      LEFT JOIN Menu m ON dc.id_menu = m.id_menu 
      WHERE dc.id_commande = ?
    `, [orderId]);
    
    order[0].details = details;
    
    res.status(200).json(order[0]);
  } catch (error) {
    console.error('❌ Erreur lors de la récupération des détails de la commande:', error);
    res.status(500).json({ message: 'Erreur serveur lors de la récupération des détails de la commande' });
  }
};

const createOrder = async (req, res) => {
  let connection;
  try {
    const { items, total, subtotal, deliveryFee, userId, type_livraison } = req.body;
    
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: '❌ Articles de commande requis' });
    }
    
    if (!userId) {
      return res.status(400).json({ message: '❌ ID utilisateur requis' });
    }
    
    const numeroCommande = generateOrderNumber();
    console.log('📝 Numéro de commande généré:', numeroCommande);
    
    let type_commande = type_livraison;
    if (type_livraison === 'a_domicile') {
      type_commande = 'livraison';
    } else if (type_livraison === 'a_emporter') {
      type_commande = 'sur_place';
    }
    
    if (type_commande !== 'sur_place' && type_commande !== 'livraison') {
      return res.status(400).json({ message: '❌ Type de livraison invalide' });
    }
    
    const finalSubtotal = subtotal || calculateOrderTotal(items);
    const finalDeliveryFee = type_commande === 'livraison' ? (deliveryFee || 2.5) : 0;
    const finalTotal = total || (finalSubtotal + finalDeliveryFee);
    
    console.log('📊 Commande à créer:', {
      numeroCommande,
      userId,
      type_commande,
      finalTotal,
      finalSubtotal,
      finalDeliveryFee
    });
    
    connection = await db.getConnection();
    
    await connection.beginTransaction();
    
    try {
      const [orderResult] = await connection.query(
        `INSERT INTO Commande (id_utilisateur, date_commande, id_statut_commande, type_livraison, montant_total) 
         VALUES (?, NOW(), ?, ?, ?)`,
        [parseInt(userId), 1, type_commande, parseFloat(finalTotal)]
      );
      
      const orderId = orderResult.insertId;
      console.log('✅ Commande créée avec ID:', orderId);
      
      for (const item of items) {
        console.log('📦 Traitement de l\'article:', item);
        if (item.type === 'product') {
          await connection.query(
            'INSERT INTO DetailCommande (id_commande, id_produit, quantite, prix_unitaire, sous_total) VALUES (?, ?, ?, ?, ?)',
            [orderId, item.id, item.quantity, item.price, item.quantity * item.price]
          );
        } else if (item.type === 'menu') {
          try {
            await connection.query(
              'INSERT INTO DetailCommande (id_commande, id_produit, id_menu, quantite, prix_unitaire, sous_total) VALUES (?, 0, ?, ?, ?, ?)',
              [orderId, item.id, item.quantity, item.price, item.quantity * item.price]
            );
          } catch (error) {
            console.error('❌ Erreur lors de l\'insertion du détail de menu:', error);
            throw error;
          }
        }
      }
      
      await connection.commit();
      
      res.status(201).json({
        message: '✅ Commande créée avec succès',
        orderId: orderId
      });
    } catch (error) {
      if (connection) await connection.rollback();
      console.error('❌ Erreur dans la transaction:', error);
      throw error;
    }
  } catch (error) {
    console.error('❌ Erreur lors de la création de la commande:', error);
    res.status(500).json({ message: 'Erreur serveur lors de la création de la commande' });
  } finally {
    if (connection) connection.release();
  }
};

const updateOrderStatus = async (req, res) => {
  try {
    const { orderId, status } = req.body;
    
    if (!orderId) {
      return res.status(400).json({ message: '❌ ID de commande requis' });
    }
    
    if (!status) {
      return res.status(400).json({ message: '❌ Statut requis' });
    }
    
    const [order] = await db.query(
      'SELECT * FROM Commande WHERE id_commande = ?',
      [orderId]
    );
    
    if (order.length === 0) {
      return res.status(404).json({ message: '❌ Commande non trouvée' });
    }
    
    await db.query(
      'UPDATE Commande SET id_statut_commande = ? WHERE id_commande = ?',
      [status, orderId]
    );
    
    const [statusInfo] = await db.query(
      'SELECT nom_statut FROM StatutCommande WHERE id_statut_commande = ?',
      [status]
    );
    
    res.status(200).json({
      message: '✅ Statut de la commande mis à jour avec succès',
      orderId: orderId,
      status: status,
      statusName: statusInfo[0]?.nom_statut
    });
  } catch (error) {
    console.error('❌ Erreur lors de la mise à jour du statut de la commande:', error);
    res.status(500).json({ message: 'Erreur serveur lors de la mise à jour du statut de la commande' });
  }
};

const generateOrderNumber = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const randomPart = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  
  return `CMD-${year}${month}${day}-${randomPart}`;
};

const calculateOrderTotal = (items) => {
  if (!items || !Array.isArray(items) || items.length === 0) {
    return 0;
  }
  
  return items.reduce((total, item) => {
    const price = parseFloat(item.price) || 0;
    const quantity = parseInt(item.quantity) || 1;
    return total + (price * quantity);
  }, 0);
};

module.exports = {
  getUserOrders,
  getOrderDetails,
  createOrder,
  updateOrderStatus
}; 