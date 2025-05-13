import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MenuController } from '@ionic/angular';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../auth.service';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-accueil',
  templateUrl: './accueil.page.html',
  styleUrls: ['./accueil.page.scss'],
  standalone: true, 
  imports: [IonicModule, CommonModule, RouterModule], 
})
export class AccueilPage implements OnInit {
  isAdmin$: Observable<boolean>;

  constructor(
    private router: Router,
    private menuCtrl: MenuController,
    private authService: AuthService
  ) {
    this.isAdmin$ = this.authService.isAdmin();
  }

  ngOnInit() {
  }


  navigateTo(route: string) {
    console.log(`🔀 Navigation vers la page ${route}`);
    this.router.navigate([`/${route}`]);
    this.menuCtrl.close(); 
  }

  /**
   * Navigate directly to the orders page
   */
  navigateToOrders() {
    console.log('🔀 Navigation vers les commandes');
    this.router.navigate(['/orders']);
    this.menuCtrl.close();
  }

  /**
   * Log out and navigate to the Login page
   */
  logout() {
    console.log('🔒 Déconnexion en cours...');
    this.authService.logout(); 
    this.menuCtrl.close(); 
  }

  /**
   * Open the side menu
   */
  openMenu() {
    this.menuCtrl.open();
  }

  goToAdmin() {
    this.router.navigate(['/admin']);
    this.menuCtrl.close(); 
  }
}
