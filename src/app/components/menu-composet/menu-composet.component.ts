import { Component, OnInit, Input } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ToastController, IonicModule, AlertController } from '@ionic/angular';
import { environment } from 'src/environments/environment';
import { CartService } from 'src/app/cart.service';
import { CommonModule } from '@angular/common';
import { AuthService } from 'src/app/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-menu-composet',
  templateUrl: './menu-composet.component.html',
  styleUrls: ['./menu-composet.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule]
})
export class MenuComposetComponent implements OnInit {
  private apiUrl = environment.apiUrl;
  
  menus: any[] = [];
  loading: boolean = true;
  
  @Input() shouldShowEmptyState: boolean = false;

  constructor(
    private http: HttpClient,
    private cartService: CartService,
    private toastCtrl: ToastController,
    private alertController: AlertController,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit() {
    console.log('🔄 Initialisation du composant MenuComposet');
    this.loadMenus();
  }

  openCart() {
    this.router.navigate(['/cart']);
  }

  async loadMenus() {
    console.log('📥 Début du chargement des menus');
    this.loading = true;
    try {
      const response: any = await this.http.get(`${this.apiUrl}/menus`).toPromise();
      console.log('✅ Réponse reçue du serveur:', response);
      
      if (response && Array.isArray(response)) {
        this.menus = response;
        console.log(`📋 ${this.menus.length} menus chargés`);
      } else {
        console.warn('⚠️ La réponse n\'est pas un tableau:', response);
        this.menus = [];
      }
    } catch (error) {
      console.error('❌ Erreur lors du chargement des menus:', error);
      this.showError('Impossible de charger les menus.');
      this.menus = [];
    } finally {
      this.loading = false;
    }
  }

  calculateOriginalPrice(menu: any): number {
    if (!menu.produits || menu.produits.length === 0) {
      return menu.prix;
    }
    
    return menu.produits.reduce((total: number, produit: any) => {
      return total + parseFloat(produit.prix);
    }, 0);
  }

  calculateDiscount(menu: any): number {
    const originalPrice = this.calculateOriginalPrice(menu);
    if (originalPrice <= menu.prix) {
      return 0;
    }
    
    const discount = ((originalPrice - menu.prix) / originalPrice) * 100;
    return Math.round(discount);
  }

  addToCart(menu: any) {
    try {
      this.cartService.addMenuToCart(menu);
      this.showToast(`${menu.nom_menu} ajouté au panier`);
    } catch (error) {
      console.error('Erreur lors de l\'ajout au panier:', error);
      this.showError('Impossible d\'ajouter le menu au panier.');
    }
  }

  async showError(message: string) {
    const toast = await this.toastCtrl.create({
      message,
      duration: 3000,
      position: 'bottom',
      color: 'danger'
    });
    toast.present();
  }

  async showToast(message: string) {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2000,
      position: 'bottom',
      color: 'success'
    });
    toast.present();
  }

  async creerMenuTest() {
    try {
      const userId = this.authService.getCurrentUserId();
      if (!userId) {
        this.showError('Vous devez être connecté pour effectuer cette action.');
        return;
      }
      
      this.loading = true;
      
      const produits: any = await this.http.get(`${this.apiUrl}/produits/actifs`).toPromise();
      
      if (!produits || produits.length < 2) {
        this.showError('Il faut au moins 2 produits pour créer un menu.');
        this.loading = false;
        return;
      }
      
      const produitsMenu = produits.slice(0, 2).map((p: any) => p.id_produit);
      
      const prixTotal = produits.slice(0, 2).reduce((sum: number, p: any) => sum + parseFloat(p.prix), 0);
      const prixMenu = (prixTotal * 0.9).toFixed(2); 
      
      const menuData = new FormData();
      menuData.append('userId', userId.toString());
      menuData.append('nom_menu', 'Menu Test');
      menuData.append('description', 'Menu créé automatiquement pour test');
      menuData.append('prix', prixMenu.toString());
      menuData.append('produits', JSON.stringify(produitsMenu));
      menuData.append('actif', '1');
      
      const response: any = await this.http.post(`${this.apiUrl}/admin/menus`, menuData).toPromise();
      
      this.showToast('Menu créé avec succès !');
      
      setTimeout(() => {
        this.loadMenus();
      }, 500);
      
    } catch (error) {
      console.error('Erreur lors de la création du menu test:', error);
      this.showError('Impossible de créer le menu test. Vérifiez vos droits administrateur.');
    } finally {
      this.loading = false;
    }
  }
} 