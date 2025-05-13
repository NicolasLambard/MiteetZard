import { Component, OnInit } from '@angular/core';
import { AdminService } from '../../admin.service';

@Component({
  selector: 'app-admin',
  templateUrl: './admin.page.html',
  styleUrls: ['./admin.page.scss'],
})
export class AdminPage implements OnInit {
  roleSummary: any = {};
  loading = false;
  error: string | null = null;

  constructor(private adminService: AdminService) { }

  ngOnInit() {
    this.checkRoleConfig();
  }

  checkRoleConfig() {
    this.loading = true;
    this.error = null;
    
    this.adminService.checkRoleConfig().subscribe(
      (data) => {
        this.roleSummary = data;
        this.loading = false;
      },
      (error) => {
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
      (data) => {
        console.log('Initialisation des rôles réussie:', data);
        this.loading = false;
        this.checkRoleConfig();
      },
      (error) => {
        console.error('Erreur lors de l\'initialisation des rôles:', error);
        this.error = 'Impossible d\'initialiser les rôles. ' + 
          (error.error?.message || error.message || 'Erreur inconnue');
        this.loading = false;
      }
    );
  }
} 