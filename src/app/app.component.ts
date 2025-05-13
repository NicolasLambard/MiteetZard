import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MenuController } from '@ionic/angular';
import { AuthService } from './auth.service';
import { AdminService } from './admin.service';
import { CartService } from './cart.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,

})
export class AppComponent implements OnInit {
  cartItemCount: number = 0;
  showCartButton: boolean = true;

  constructor(
    private router: Router, 
    private menuCtrl: MenuController,
    private authService: AuthService,
    private adminService: AdminService,
    private cartService: CartService
  ) {}

  ngOnInit() {
    if (this.authService.isLoggedIn()) {
      console.log('✅ Utilisateur déjà connecté');
      this.authService.chargerRolesUtilisateur();
      
      this.authService.isAdmin().subscribe(isAdmin => {
        if (isAdmin) {
          console.log('🛡️ Utilisateur avec rôle administrateur détecté');
          this.adminService.checkRoleConfig().subscribe(
            result => {
              console.log('📊 Statut des rôles:', result);
            },
            error => {
              console.error('❌ Erreur lors de la vérification des rôles:', error);
              if (error.status === 500) {
                console.log('🔧 Tentative d\'initialisation des rôles...');
                this.adminService.initRoles().subscribe(
                  result => console.log('✅ Initialisation des rôles réussie:', result),
                  err => console.error('❌ Échec de l\'initialisation des rôles:', err)
                );
              }
            }
          );
        }
      });
    }

    this.cartService.cartItems$.subscribe(items => {
      this.cartItemCount = this.cartService.getItemCount();
    });

    this.router.events.subscribe(() => {
      const currentUrl = this.router.url;
      this.showCartButton = !currentUrl.includes('/login') && 
                           !currentUrl.includes('/inscription') && 
                           !currentUrl.includes('/cart') &&
                           !currentUrl.includes('/admin');
    });
  }

  /**
   * Navigate to a specific route
   * @param route The route to navigate to
   */
  navigateTo(route: string) {
    console.log(`🔀 Navigation vers ${route}`);
    this.router.navigate([`/${route}`]);
    this.menuCtrl.close(); 
  }

  /**
   * Log out and navigate to the login page
   */
  logout() {
    console.log('🔒 Déconnexion en cours...');
    this.authService.logout();
    this.router.navigate(['/login']);
    this.menuCtrl.close(); 
  }

  goToCart() {
    this.router.navigate(['/cart']);
  }
}
