import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, AlertController, ToastController } from '@ionic/angular';
import { CartService, CartItem } from '../../cart.service';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { AuthService } from '../../auth.service';

@Component({
  selector: 'app-cart',
  templateUrl: './cart.page.html',
  styleUrls: ['./cart.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule]
})
export class CartPage implements OnInit {
  cartItems: CartItem[] = [];
  total: number = 0;
  deliveryFee: number = 2.50;
  loading: boolean = false;
  
  constructor(
    private cartService: CartService,
    private alertController: AlertController,
    private toastController: ToastController,
    private router: Router,
    private http: HttpClient,
    private authService: AuthService
  ) { }

  ngOnInit() {
    this.loadCartItems();
    
    this.cartService.cartItems$.subscribe(items => {
      this.cartItems = items;
      this.calculateTotal();
    });
  }

  loadCartItems() {
    this.cartItems = this.cartService.getCartItems();
    this.calculateTotal();
  }

  calculateTotal() {
    this.total = this.cartService.getTotalAmount();
  }

  getTotalWithDelivery(): number {
    return this.total + this.deliveryFee;
  }

  increaseQuantity(index: number) {
    const item = this.cartItems[index];
    this.cartService.updateItemQuantity(index, item.quantity + 1);
  }

  decreaseQuantity(index: number) {
    const item = this.cartItems[index];
    if (item.quantity > 1) {
      this.cartService.updateItemQuantity(index, item.quantity - 1);
    } else {
      this.confirmRemoveItem(index);
    }
  }

  async confirmRemoveItem(index: number) {
    const alert = await this.alertController.create({
      header: 'Confirmer la suppression',
      message: `Voulez-vous supprimer cet article du panier ?`,
      buttons: [
        {
          text: 'Annuler',
          role: 'cancel'
        },
        {
          text: 'Supprimer',
          handler: () => {
            this.cartService.removeItem(index);
            this.presentToast('Article supprimé du panier');
          }
        }
      ]
    });

    await alert.present();
  }

  async clearCart() {
    const alert = await this.alertController.create({
      header: 'Vider le panier',
      message: 'Voulez-vous vraiment vider votre panier ?',
      buttons: [
        {
          text: 'Annuler',
          role: 'cancel'
        },
        {
          text: 'Vider',
          handler: () => {
            this.cartService.clearCart();
            this.presentToast('Panier vidé');
          }
        }
      ]
    });

    await alert.present();
  }

  async checkout() {
    if (this.cartItems.length === 0) {
      this.presentToast('Votre panier est vide');
      return;
    }

    if (!this.authService.isAuthenticated()) {
      const alert = await this.alertController.create({
        header: 'Connexion requise',
        message: 'Vous devez être connecté pour passer commande',
        buttons: [
          {
            text: 'Annuler',
            role: 'cancel'
          },
          {
            text: 'Se connecter',
            handler: () => {
              this.router.navigate(['/login']);
            }
          }
        ]
      });

      await alert.present();
      return;
    }

    try {
      const userId = this.authService.getCurrentUserId();
      console.log('ID utilisateur récupéré:', userId);
      
      console.log('Contenu du localStorage:', {
        utilisateur: localStorage.getItem('utilisateur'),
        userEmail: localStorage.getItem('userEmail'),
        token: localStorage.getItem('token'),
        userId: localStorage.getItem('userId')
      });
  
      if (!userId) {
        console.error('❌ ID utilisateur non disponible');
        this.presentToast('Erreur: ID utilisateur non disponible. Veuillez vous reconnecter.');
        setTimeout(() => {
          this.authService.logout(); 
          this.router.navigate(['/login']);
        }, 2000);
        return;
      }
  
      const orderData: {
        items: CartItem[];
        total: number;
        subtotal: number;
        deliveryFee: number;
        userId: number;
        type_livraison: string;
      } = {
        items: this.cartItems,
        total: this.getTotalWithDelivery(),
        subtotal: this.total,
        deliveryFee: this.deliveryFee,
        userId: Number(userId), 
        type_livraison: 'a_emporter'
      };
      
      console.log('Données envoyées pour la commande:', JSON.stringify(orderData));
  
      this.loading = true;
  
      this.http.post(`${environment.apiUrl}/orders`, orderData).subscribe(
        (response: any) => {
          console.log('✅ Commande créée avec succès:', response);
          this.loading = false;
          this.cartService.clearCart();
          
          this.presentToast('Commande passée avec succès !');
          
          setTimeout(() => {
            this.router.navigate(['/profile']);
          }, 500); 
        },
        (error) => {
          this.loading = false;
          console.error('Erreur lors de la commande:', error);
          
          let errorMessage = 'Erreur lors de la commande. Veuillez réessayer.';
          
          if (error.error && error.error.message) {
            errorMessage = error.error.message;
          } else if (error.status === 400) {
            errorMessage = 'Données de commande incomplètes ou invalides.';
          } else if (error.status === 401) {
            errorMessage = 'Vous devez être connecté pour passer commande.';
            setTimeout(() => {
              this.router.navigate(['/login']);
            }, 2000);
          } else if (error.status === 404) {
            errorMessage = 'Ressource non trouvée.';
          } else if (error.status === 500) {
            errorMessage = 'Erreur serveur. Veuillez réessayer plus tard.';
          }
          
          this.presentToast(errorMessage);
        }
      );
    } catch (error) {
      console.error('Erreur non gérée lors de la commande:', error);
      this.presentToast('Une erreur inattendue est survenue. Veuillez réessayer.');
    }
  }

  continueShopping() {
    this.router.navigate(['/menu']);
  }

  async presentToast(message: string) {
    const toast = await this.toastController.create({
      message: message,
      duration: 2000,
      position: 'bottom',
      color: 'dark'
    });
    await toast.present();
  }
} 