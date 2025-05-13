import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../auth.service';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { AdminService } from '../../admin.service';
import { OrderService } from '../../order.service';
import { interval } from 'rxjs';
import { switchMap } from 'rxjs/operators';

@Component({
  selector: 'app-admin',
  templateUrl: './admin.page.html',
  styleUrls: ['./admin.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule, RouterModule]
})
export class AdminPage implements OnInit, OnDestroy {
  apiUrl = environment.apiUrl;
  roleSummary: any = {};
  loading = false;
  error: string | null = null;
  newOrdersCount: number = 0;
  private refreshInterval: any;
  
  constructor(
    private router: Router,
    private authService: AuthService,
    private http: HttpClient,
    private adminService: AdminService,
    private orderService: OrderService
  ) { }

  ngOnInit() {
    this.authService.isAdmin().subscribe(isAdmin => {
      if (!isAdmin) {
        console.log('Accès non autorisé à la page admin');
        this.router.navigate(['/accueil']);
      } else {
        this.checkRoleConfig();
        this.loadNewOrdersCount();
        
        this.refreshInterval = interval(120000) 
          .subscribe(() => {
            this.loadNewOrdersCount();
          });
      }
    });
  }

  ngOnDestroy() {
    if (this.refreshInterval) {
      this.refreshInterval.unsubscribe();
    }
  }

  checkRoleConfig() {
    this.loading = true;
    this.error = null;
    
    this.adminService.checkRoleConfig().subscribe(
      (data: any) => {
        this.roleSummary = data;
        this.loading = false;
      },
      (error: any) => {
        console.error('Erreur lors de la vérification des rôles:', error);
        this.error = 'Impossible de vérifier la configuration des rôles. ' + 
          (error.error?.message || error.message || 'Erreur inconnue');
        this.loading = false;
      }
    );
  }

  initRoles() {
    this.loading = true;
    this.error = null;
    
    this.adminService.initRoles().subscribe(
      (data: any) => {
        console.log('Initialisation des rôles réussie:', data);
        this.loading = false;
        this.checkRoleConfig();
      },
      (error: any) => {
        console.error('Erreur lors de l\'initialisation des rôles:', error);
        this.error = 'Impossible d\'initialiser les rôles. ' + 
          (error.error?.message || error.message || 'Erreur inconnue');
        this.loading = false;
      }
    );
  }

  loadNewOrdersCount() {
    this.orderService.getAllOrders().subscribe(
      (orders) => {
        this.newOrdersCount = orders.filter(o => o.id_statut_commande === 1).length;
      },
      (error) => {
        console.error('Erreur lors du chargement des commandes:', error);
      }
    );
  }

  gotoProductsManagement() {
    this.router.navigate(['/admin/produits']);
  }

  gotoCategoriesManagement() {
    this.router.navigate(['/admin/categories']);
  }

  gotoUsersManagement() {
    this.router.navigate(['/admin/users']);
  }

  gotoOrdersManagement() {
    this.router.navigate(['/admin/orders']);
  }

  backToHome() {
    this.router.navigate(['/accueil']);
  }
} 