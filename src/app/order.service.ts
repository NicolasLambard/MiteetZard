import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError, of } from 'rxjs';
import { timeout, catchError, map, tap } from 'rxjs/operators';
import { environment } from '../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class OrderService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) { }


  getUserOrders(userId: number): Observable<any[]> {
    console.log(`🔍 Récupération des commandes pour l'utilisateur ID: ${userId}`);
    
    if (!userId) {
      console.error('❌ getUserOrders appelé sans ID utilisateur valide');
      return of([]);
    }
    
    return this.http.get<any[]>(`${this.apiUrl}/orders/user/${userId}`)
      .pipe(
        timeout(8000), 
        catchError(error => {
          console.error('📛 Erreur dans OrderService.getUserOrders:', error);
          if (error.name === 'TimeoutError') {
            return throwError(() => new Error('La requête a pris trop de temps'));
          }
          return throwError(() => error);
        }),
        map(orders => {
          console.log('📦 Commandes reçues:', orders);
          return Array.isArray(orders) ? orders : [];
        }),
        tap(orders => {
          orders.forEach(order => this.normalizeOrderData(order));
        })
      );
  }


  getOrderDetails(orderId: number): Observable<any> {
    if (!orderId) {
      console.error('❌ getOrderDetails appelé sans ID de commande valide');
      return throwError(() => new Error('ID de commande invalide'));
    }
    
    return this.http.get<any>(`${this.apiUrl}/orders/${orderId}`)
      .pipe(
        map(order => this.normalizeOrderData(order))
      );
  }

  getClientInfoForOrder(order: any): any {
    if (!order) return {};
    
    if (order.adresse && order.telephone && order.mode_paiement) {
      return order;
    }
    
    const adresse = localStorage.getItem('address');
    const telephone = localStorage.getItem('userPhone');
    const modePaiement = localStorage.getItem('paymentMethod') || 'Carte bancaire'; 
    
    order.adresse = order.adresse || adresse || null;
    order.telephone = order.telephone || telephone || null;
    order.mode_paiement = order.mode_paiement || modePaiement || null;
    
    return order;
  }
  normalizeOrderData(order: any): any {
    if (!order) return {};
    
    order.id_commande = order.id_commande || '---';
    order.date_commande = this.validateDate(order.date_commande);
    order.id_statut_commande = this.validateStatusId(order.id_statut_commande);
    
    const subTotal = this.validateAmount(order.total_commande || order.total || 0);
    order.total_commande = subTotal;
    
    if (order.details && Array.isArray(order.details) && order.details.length > 0) {
      let calculatedSubTotal = 0;
      order.details.forEach((detail: any) => {
        const price = this.validateAmount(detail.prix_unitaire || 0);
        const quantity = parseInt(detail.quantite || 1);
        const itemTotal = price * quantity;
        detail.sous_total = itemTotal;
        calculatedSubTotal += itemTotal;
      });
      
      if (calculatedSubTotal > 0 && subTotal === 0) {
        order.total_commande = calculatedSubTotal;
      }
    }
    
    if (order.articles && Array.isArray(order.articles) && order.articles.length > 0 && order.total_commande === 0) {
      let calculatedSubTotal = 0;
      order.articles.forEach((article: any) => {
        const price = this.validateAmount(article.prix || 0);
        const quantity = parseInt(article.quantite || 1);
        const itemTotal = article.sous_total || (price * quantity);
        calculatedSubTotal += itemTotal;
      });
      
      if (calculatedSubTotal > 0) {
        order.total_commande = calculatedSubTotal;
      }
    }
    
    order.frais_livraison = 2.90;
    order.total_with_delivery = parseFloat(order.total_commande.toString()) + parseFloat(order.frais_livraison.toString());
    
    order.adresse = this.validateOptionalString(order.adresse);
    order.telephone = this.validateOptionalString(order.telephone);
    order.mode_paiement = this.validateOptionalString(order.mode_paiement);
    
    if (!Array.isArray(order.articles)) {
      order.articles = [];
    }
    
    return order;
  }

  validateDate(date: any): string {
    if (!date) return new Date().toISOString();
    try {
      return new Date(date).toISOString();
    } catch (e) {
      return new Date().toISOString();
    }
  }
  
  validateStatusId(statusId: any): number {
    const status = Number(statusId);
    return !isNaN(status) && status >= 1 && status <= 5 ? status : 1;
  }
  
  validateAmount(amount: any): number {
    const value = Number(amount);
    return !isNaN(value) ? Math.max(0, value) : 0;
  }
  
  validateOptionalString(value: any): string | null {
    if (value === undefined || value === null || value === '') {
      return null;
    }
    return String(value).trim();
  }


  createOrder(orderData: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/orders`, orderData);
  }

  updateOrderStatus(orderId: number, status: string): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/orders/status`, { orderId, status });
  }

  getAllOrders(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/admin/orders`)
      .pipe(
        tap(orders => {
          orders.forEach(order => this.normalizeOrderData(order));
        })
      );
  }

  markOrderAsDelivered(orderId: number): Observable<any> {
    return this.updateOrderStatus(orderId, 'livree');
  }


  cancelOrder(orderId: number): Observable<any> {
    return this.updateOrderStatus(orderId, 'annulee');
  }

  getStatusLabel(statusId: number): string {
    const statuses: { [key: number]: string } = {
      1: 'En cours',
      2: 'Validée',
      3: 'En livraison',
      4: 'Livrée',
      5: 'Annulée'
    };
    return statuses[statusId] || 'Inconnu';
  }

  getStatusColor(statusId: number): string {
    const colors: { [key: number]: string } = {
      1: 'primary',    
      2: 'success',    
      3: 'warning',    
      4: 'success',    
      5: 'danger'     
    };
    return colors[statusId] || 'medium';
  }
} 