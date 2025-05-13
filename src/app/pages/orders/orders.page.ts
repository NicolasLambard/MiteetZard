import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { IonicModule, ToastController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { OrderService } from '../../order.service';
import { AuthService } from '../../auth.service';

@Component({
  selector: 'app-orders',
  templateUrl: './orders.page.html',
  styleUrls: ['./orders.page.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, FormsModule, RouterModule]
})
export class OrdersPage implements OnInit {
  userOrders: any[] = [];
  isLoading: boolean = false;
  error: string | null = null;
  selectedOrder: any = null;
  
  readonly DELIVERY_FEE: number = 2.90;
  
  isEditingClientInfo: boolean = false;
  editableClientInfo: {
    adresse: string | null,
    telephone: string | null,
    mode_paiement: string | null
  } = {
    adresse: null,
    telephone: null,
    mode_paiement: null
  };

  constructor(
    private router: Router,
    private toastCtrl: ToastController,
    private orderService: OrderService,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.loadUserOrders();
    this.ensureUserInfoExists();
  }

  ionViewWillEnter() {
    this.loadUserOrders();
    this.ensureUserInfoExists();
  }

  ensureUserInfoExists() {
    if (!localStorage.getItem('address') || !localStorage.getItem('userPhone')) {
      console.log('✏️ Initialisation des données utilisateur fictives');
      
      localStorage.setItem('address', '12 rue des Lilas, 75001 Paris');
      localStorage.setItem('userPhone', '06 12 34 56 78');
      localStorage.setItem('paymentMethod', 'Carte bancaire');
      
      if (!localStorage.getItem('firstName')) {
        localStorage.setItem('firstName', 'Jean');
      }
      if (!localStorage.getItem('lastName')) {
        localStorage.setItem('lastName', 'Dupont');
      }
    }
  }

  loadUserOrders() {
    this.isLoading = true;
    this.error = null;
    
    const userId = this.authService.getCurrentUserId();
    
    if (!userId) {
      this.error = 'Vous devez être connecté pour voir vos commandes';
      this.isLoading = false;
      return;
    }
    
    this.orderService.getUserOrders(Number(userId)).subscribe(
      (orders) => {
        console.log('✅ Commandes récupérées:', orders);
        this.userOrders = this.processOrders(orders);
        this.isLoading = false;
        
        this.userOrders.sort((a, b) => {
          return new Date(b.date_commande || 0).getTime() - new Date(a.date_commande || 0).getTime();
        });
      },
      (error) => {
        console.error('❌ Erreur lors du chargement des commandes:', error);
        this.isLoading = false;
        
        if (error.status === 0) {
          this.error = 'Impossible de se connecter au serveur';
        } else if (error.status === 404) {
          this.error = 'Aucune commande trouvée';
        } else {
          this.error = 'Erreur lors du chargement des commandes';
        }
      }
    );
  }

  processOrders(orders: any[]): any[] {
    if (!orders || !Array.isArray(orders)) {
      return [];
    }
    
    return orders.map(order => {
      if (!order.articles) {
        order.articles = [];
      }
      
      if (!order.details) {
        order.details = [];
      }
      
      const processedOrder = {
        ...order,
        id_commande: order.id_commande || '---',
        date_commande: this.validateDateString(order.date_commande),
        id_statut_commande: this.validateStatusId(order.id_statut_commande),
        total_commande: this.validateAmount(order.total_commande || order.total),
        adresse: this.validateString(order.adresse),
        telephone: this.validateString(order.telephone),
        mode_paiement: this.validateString(order.mode_paiement)
      };
      
      console.log('Commande transformée:', processedOrder);
      
      return processedOrder;
    });
  }
  
  validateDateString(value: any): string {
    if (!value) return new Date().toISOString();
    try {
      return new Date(value).toISOString();
    } catch (e) {
      console.error('Date invalide:', value, e);
      return new Date().toISOString();
    }
  }
  
  validateStatusId(value: any): number {
    const statusId = Number(value);
    if (isNaN(statusId) || statusId < 1 || statusId > 5) {
      return 1; 
    }
    return statusId;
  }
  
  validateAmount(value: any): number {
    const amount = Number(value);
    return isNaN(amount) ? 0 : Math.max(0, amount);
  }
  
  validateString(value: any): string | null {
    if (value === undefined || value === null || value === '') {
      return null;
    }
    return String(value).trim();
  }

  viewOrderDetails(order: any) {
    this.selectedOrder = this.ensureCompleteOrderData(order);
    this.ensureConsistentTotal();
    console.log('Affichage des détails de la commande:', this.selectedOrder);
  }
  
  ensureCompleteOrderData(order: any): any {
    let orderWithClientInfo = this.orderService.getClientInfoForOrder(order);
    
    let completeOrder = {
      ...orderWithClientInfo,
      est_payee: orderWithClientInfo.est_payee || false,
      commentaire: orderWithClientInfo.commentaire || null,
    };
    
    if (!completeOrder.articles || completeOrder.articles.length === 0) {
      if (completeOrder.details && completeOrder.details.length > 0) {
        completeOrder.articles = this.convertDetailsToArticles(completeOrder.details);
      } else {
        completeOrder.articles = this.generateMockArticles();
      }
    }
    
    const subTotal = this.calculateOrderTotal(completeOrder.articles);
    if (completeOrder.total_commande === 0 || completeOrder.total_commande === null) {
      completeOrder.total_commande = subTotal;
    }
    
    const total = parseFloat(completeOrder.total_commande.toString()) + parseFloat(this.DELIVERY_FEE.toString());
    completeOrder.total_with_delivery = Math.round(total * 100) / 100; 
    
    return completeOrder;
  }
  

  convertDetailsToArticles(details: any[]): any[] {
    return details.map(detail => {
      return {
        id: detail.id_produit || detail.id_menu,
        nom: detail.nom_produit || detail.nom_menu || 'Article',
        prix: detail.prix_unitaire || 0,
        quantite: detail.quantite || 1,
        sous_total: detail.sous_total || (detail.prix_unitaire * detail.quantite) || 0,
        type: detail.id_produit ? 'produit' : 'menu',
        description: detail.description || '',
        image_url: detail.image_url || null
      };
    });
  }
  

  generateMockArticles(): any[] {
    const mockProducts = [
      { id: 1, nom: 'Pizza Margherita', prix: 10.90, description: 'Tomate, mozzarella, basilic', quantite: 0, sous_total: 0 },
      { id: 2, nom: 'Burger Classic', prix: 9.50, description: 'Bœuf, cheddar, salade, tomate, oignon', quantite: 0, sous_total: 0 },
      { id: 3, nom: 'Salade César', prix: 8.90, description: 'Salade, poulet, parmesan, croûtons', quantite: 0, sous_total: 0 },
      { id: 4, nom: 'Sushi Maki Mix', prix: 15.90, description: 'Assortiment de 12 maki', quantite: 0, sous_total: 0 },
      { id: 5, nom: 'Pâtes Carbonara', prix: 11.50, description: 'Pâtes, lardons, crème, œuf, parmesan', quantite: 0, sous_total: 0 }
    ];
    
    const numArticles = Math.floor(Math.random() * 3) + 1;
    const selectedItems = [];
    
    for (let i = 0; i < numArticles; i++) {
      const randomIndex = Math.floor(Math.random() * mockProducts.length);
      const product = { ...mockProducts[randomIndex] };
      
      product.quantite = Math.floor(Math.random() * 3) + 1;
      product.sous_total = product.prix * product.quantite;
      
      selectedItems.push(product);
    }
    
    return selectedItems;
  }
  

  calculateOrderTotal(articles: any[]): number {
    if (!articles || !Array.isArray(articles) || articles.length === 0) {
      return 0;
    }
    
    let total = 0;
    
    try {
      total = articles.reduce((sum, item) => {
        const price = typeof item.prix === 'number' ? item.prix : parseFloat(item.prix) || 0;
        const quantity = typeof item.quantite === 'number' ? item.quantite : parseInt(item.quantite) || 1;
        
        if (typeof item.sous_total === 'number' && item.sous_total > 0) {
          return sum + item.sous_total;
        }
        
        const itemTotal = price * quantity;
        
        item.sous_total = itemTotal;
        
        return sum + itemTotal;
      }, 0);
    } catch (error) {
      console.error('Erreur lors du calcul du total:', error);
      return 0;
    }
    
    return total;
  }

  getOrderTotalWithDelivery(): number {
    if (!this.selectedOrder) return 0;
    
    if (this.selectedOrder.total_with_delivery && typeof this.selectedOrder.total_with_delivery === 'number') {
      return this.selectedOrder.total_with_delivery;
    }
    
    let subTotal = 0;
    
    if (typeof this.selectedOrder.total_commande === 'number' && this.selectedOrder.total_commande > 0) {
      subTotal = this.selectedOrder.total_commande;
    } else {
      subTotal = this.calculateOrderTotal(this.selectedOrder.articles);
    }
    
    this.selectedOrder.total_commande = subTotal;
    this.selectedOrder.total_with_delivery = parseFloat(subTotal.toString()) + parseFloat(this.DELIVERY_FEE.toString());
    
    return parseFloat(subTotal.toString()) + parseFloat(this.DELIVERY_FEE.toString());
  }

  ensureConsistentTotal() {
    if (!this.selectedOrder) return;
    
    console.log('Total avant correction:', this.selectedOrder.total_commande);
    
    try {
      const calculatedSubTotal = this.calculateOrderTotal(this.selectedOrder.articles);
      
      if (!this.selectedOrder.total_commande || 
          typeof this.selectedOrder.total_commande !== 'number' || 
          this.selectedOrder.total_commande <= 0) {
        this.selectedOrder.total_commande = calculatedSubTotal;
      }
      
      const total = parseFloat(this.selectedOrder.total_commande.toString()) + parseFloat(this.DELIVERY_FEE.toString());
      this.selectedOrder.total_with_delivery = Math.round(total * 100) / 100; 
      
      console.log('Total après correction:', 
                  this.selectedOrder.total_commande.toFixed(2) + '€', 
                  'Total avec livraison:', 
                  this.selectedOrder.total_with_delivery.toFixed(2) + '€');
    } catch (error) {
      console.error('Erreur lors de la correction des totaux:', error);
      this.selectedOrder.total_commande = this.selectedOrder.total_commande || 0;
      const total = parseFloat(this.selectedOrder.total_commande.toString()) + parseFloat(this.DELIVERY_FEE.toString());
      this.selectedOrder.total_with_delivery = Math.round(total * 100) / 100; 
    }
  }

  backToOrdersList() {
    this.selectedOrder = null;
  }

  formatDate(dateString: string): string {
    if (!dateString) {
      return 'Date inconnue';
    }
    
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('fr-FR', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      console.error('Erreur de formatage de date', error);
      return 'Date invalide';
    }
  }

  getStatusLabel(statusId: number): string {
    return this.orderService.getStatusLabel(statusId);
  }

  getStatusColor(statusId: number): string {
    return this.orderService.getStatusColor(statusId);
  }

  /**
   * Retourne l'icône correspondant au statut de la commande
   */
  getStatusIcon(statusId: number): string {
    const icons: { [key: number]: string } = {
      1: 'hourglass-outline',    
      2: 'checkmark-circle-outline', 
      3: 'bicycle-outline',    
      4: 'checkmark-done-outline',   
      5: 'close-circle-outline'     
    };
    return icons[statusId] || 'help-circle-outline';
  }

  async showToast(message: string) {
    const toast = await this.toastCtrl.create({
      message: message,
      duration: 2000,
      position: 'bottom'
    });
    toast.present();
  }


  editClientInfo() {
    this.editableClientInfo = {
      adresse: this.selectedOrder.adresse || '',
      telephone: this.selectedOrder.telephone || '',
      mode_paiement: this.selectedOrder.mode_paiement || 'Carte bancaire'
    };
    this.isEditingClientInfo = true;
  }

  cancelClientInfoEdit() {
    this.isEditingClientInfo = false;
  }
  

  saveClientInfo() {
    this.selectedOrder.adresse = this.editableClientInfo.adresse;
    this.selectedOrder.telephone = this.editableClientInfo.telephone;
    this.selectedOrder.mode_paiement = this.editableClientInfo.mode_paiement;
    
    if (this.editableClientInfo.adresse) {
      localStorage.setItem('address', this.editableClientInfo.adresse);
    }
    if (this.editableClientInfo.telephone) {
      localStorage.setItem('userPhone', this.editableClientInfo.telephone);
    }
    if (this.editableClientInfo.mode_paiement) {
      localStorage.setItem('paymentMethod', this.editableClientInfo.mode_paiement);
    }
    
    this.showToast('Informations mises à jour');
    
    this.isEditingClientInfo = false;
  }
} 