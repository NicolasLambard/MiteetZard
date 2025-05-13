import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { CartService } from 'src/app/cart.service';
import { ToastController, IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { MenuComposetComponent } from 'src/app/components/menu-composet/menu-composet.component';
import { Router } from '@angular/router';

@Component({
  selector: 'app-menu',
  templateUrl: './menu.page.html',
  styleUrls: ['./menu.page.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, MenuComposetComponent]
})
export class MenuPage implements OnInit {
  private apiUrl = environment.apiUrl;
  
  loading: boolean = true;
  error: string | null = null;
  menuItems: any = {};
  categories: string[] = [];

  constructor(
    private http: HttpClient,
    private cartService: CartService,
    private toastCtrl: ToastController,
    private router: Router
  ) { }

  ngOnInit() {
    this.loadMenu();
  }

  loadMenu() {
    this.loading = true;
    this.error = null;
    
    this.http.get(`${this.apiUrl}/menu`).subscribe(
      (response: any) => {
        this.menuItems = response;
        this.categories = Object.keys(response);
        this.loading = false;
      },
      (error) => {
        console.error('Error loading menu:', error);
        this.error = 'Impossible de charger le menu. Veuillez réessayer.';
        this.loading = false;
      }
    );
  }

  formatPrice(price: number): string {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(price);
  }
  
  addToCart(product: any) {
    this.cartService.addProductToCart(product);
    this.showToast(`${product.nom_produit} ajouté au panier`);
  }
  
  async showToast(message: string) {
    const toast = await this.toastCtrl.create({
      message: message,
      duration: 2000,
      position: 'bottom',
      color: 'success'
    });
    toast.present();
  }

  goBack() {
    this.router.navigate(['/accueil']);
  }
}