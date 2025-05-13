
const deliveryFees = {
  standard: 2.90,
  
  pickup: 0
};

const orderStatuses = {
  PENDING: 1,      
  CONFIRMED: 2,   
  PREPARING: 3,    
  READY: 4,       
  DELIVERING: 5,   
  COMPLETED: 6,    
  CANCELLED: 7    
};

const deliveryTypes = {
  DELIVERY: 'livraison',
  PICKUP: 'sur_place'
};

const deliveryTypeMapping = {
  'a_domicile': deliveryTypes.DELIVERY,
  'a_emporter': deliveryTypes.PICKUP
};

module.exports = {
  deliveryFees,
  orderStatuses,
  deliveryTypes,
  deliveryTypeMapping
}; 