import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, AlertController, ToastController } from '@ionic/angular';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../auth.service';

@Component({
  selector: 'app-users',
  templateUrl: './users.page.html',
  styleUrls: ['./users.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule]
})
export class UsersPage implements OnInit {
  apiUrl = environment.apiUrl;
  users: any[] = [];
  roles: any[] = [
    { id_role: 1, nom_role: 'Client' },
    { id_role: 2, nom_role: 'Gérant' },
    { id_role: 3, nom_role: 'Administrateur' }
  ];
  isLoading = true;
  currentUserId: number | null = null;
  
  constructor(
    private router: Router,
    private http: HttpClient,
    private authService: AuthService,
    private alertController: AlertController,
    private toastController: ToastController
  ) { }

  ngOnInit() {
    const userId = this.authService.getCurrentUserId();
    this.currentUserId = userId ? Number(userId) : null;
    this.chargerUtilisateurs();
  }
  
  chargerUtilisateurs() {
    this.isLoading = true;
    const userId = this.authService.getCurrentUserId();
    
    this.http.get(`${this.apiUrl}/admin/users?userId=${Number(userId)}`).subscribe(
      (response: any) => {
        this.users = response;
        this.isLoading = false;
      },
      (error) => {
        console.error('Erreur lors du chargement des utilisateurs:', error);
        this.isLoading = false;
        this.afficherToast('Erreur lors du chargement des utilisateurs', 'danger');
      }
    );
  }
  
  utilisateurARole(user: any, roleName: string): boolean {
    if (!user.roles) return false;
    return user.roles.includes(roleName);
  }
  
  async modifierRole(user: any, roleId: number, roleName: string) {
    if (user.id === this.currentUserId && roleId === 1) {
      this.afficherToast('Vous ne pouvez pas supprimer votre propre rôle de client', 'warning');
      return;
    }
    
    if (user.id === this.currentUserId && roleId === 3 && this.utilisateurARole(user, 'Administrateur')) {
      this.afficherToast('Vous ne pouvez pas supprimer votre propre rôle d\'administrateur', 'warning');
      return;
    }
    
    const userId = this.authService.getCurrentUserId();
    const action = this.utilisateurARole(user, roleName) ? 'retirer' : 'ajouter';
    
    const alert = await this.alertController.create({
      header: 'Confirmation',
      message: `Êtes-vous sûr de vouloir ${action} le rôle "${roleName}" à ${user.prenom} ${user.nom} ?`,
      buttons: [
        {
          text: 'Annuler',
          role: 'cancel'
        },
        {
          text: 'Confirmer',
          handler: () => {
            const donnees = {
              userId: Number(userId),
              targetUserId: user.id,
              roleId
            };
            
            this.http.put(`${this.apiUrl}/admin/users/role`, donnees).subscribe(
              (response: any) => {
                this.afficherToast(`Rôle ${action === 'ajouter' ? 'ajouté' : 'retiré'} avec succès`, 'success');
                this.chargerUtilisateurs();
              },
              (error) => {
                console.error('Erreur lors de la modification du rôle:', error);
                this.afficherToast('Erreur lors de la modification du rôle', 'danger');
              }
            );
          }
        }
      ]
    });
    
    await alert.present();
  }
  
  async afficherToast(message: string, couleur: string = 'primary') {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      color: couleur,
      position: 'bottom'
    });
    
    await toast.present();
  }
  
  retourAdmin() {
    this.router.navigate(['/admin']);
  }
} 