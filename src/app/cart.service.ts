import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface CartItem {
  id: number;
  type: 'product' | 'menu';
  name: string;
  price: number;
  quantity: number;
  image?: string;
  details?: any; 
}

@Injectable({
  providedIn: 'root'
})
export class CartService {
  private cartItemsSubject = new BehaviorSubject<CartItem[]>([]);
  public cartItems$ = this.cartItemsSubject.asObservable();
  
  constructor() {
    this.loadCartFromStorage();
  }
  
  private loadCartFromStorage() {
    const storedCart = localStorage.getItem('cart');
    if (storedCart) {
      try {
        const cartItems = JSON.parse(storedCart);
        this.cartItemsSubject.next(cartItems);
      } catch (error) {
        console.error('Erreur lors du chargement du panier:', error);
        this.cartItemsSubject.next([]);
      }
    }
  }
  
  private saveCartToStorage() {
    const cartItems = this.cartItemsSubject.value;
    localStorage.setItem('cart', JSON.stringify(cartItems));
  }
  
  addProductToCart(product: any) {
    const cartItems = [...this.cartItemsSubject.value];
    const existingItemIndex = cartItems.findIndex(item => 
      item.id === product.id_produit && item.type === 'product'
    );
    
    if (existingItemIndex !== -1) {
      cartItems[existingItemIndex].quantity += 1;
    } else {
      cartItems.push({
        id: product.id_produit,
        type: 'product',
        name: product.nom_produit,
        price: parseFloat(product.prix),
        quantity: 1,
        image: product.image_data
      });
    }
    
    this.cartItemsSubject.next(cartItems);
    this.saveCartToStorage();
  }
  
  addMenuToCart(menu: any) {
    const cartItems = [...this.cartItemsSubject.value];
    const existingItemIndex = cartItems.findIndex(item => 
      item.id === menu.id_menu && item.type === 'menu'
    );
    
    if (existingItemIndex !== -1) {
      cartItems[existingItemIndex].quantity += 1;
    } else {
      cartItems.push({
        id: menu.id_menu,
        type: 'menu',
        name: menu.nom_menu,
        price: parseFloat(menu.prix),
        quantity: 1,
        image: menu.image_data,
        details: {
          produits: menu.produits
        }
      });
    }
    
    this.cartItemsSubject.next(cartItems);
    this.saveCartToStorage();
  }
  
  updateItemQuantity(itemIndex: number, quantity: number) {
    if (quantity <= 0) {
      this.removeItem(itemIndex);
      return;
    }
    
    const cartItems = [...this.cartItemsSubject.value];
    if (itemIndex >= 0 && itemIndex < cartItems.length) {
      cartItems[itemIndex].quantity = quantity;
      this.cartItemsSubject.next(cartItems);
      this.saveCartToStorage();
    }
  }
  
  removeItem(itemIndex: number) {
    const cartItems = [...this.cartItemsSubject.value];
    if (itemIndex >= 0 && itemIndex < cartItems.length) {
      cartItems.splice(itemIndex, 1);
      this.cartItemsSubject.next(cartItems);
      this.saveCartToStorage();
    }
  }
  
  clearCart() {
    this.cartItemsSubject.next([]);
    this.saveCartToStorage();
  }
  
  getItemCount(): number {
    return this.cartItemsSubject.value.reduce((count, item) => count + item.quantity, 0);
  }
  
  getTotalAmount(): number {
    return this.cartItemsSubject.value.reduce((total, item) => 
      total + (item.price * item.quantity), 0
    );
  }
  
  getCartItems(): CartItem[] {
    return this.cartItemsSubject.value;
  }
} 