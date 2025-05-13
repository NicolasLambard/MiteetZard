import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { IonicModule, ToastController, ModalController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { OrderService } from '../../order.service';
import { AuthService } from '../../auth.service';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, FormsModule, RouterModule, HttpClientModule]
})
export class ProfilePage implements OnInit {
  userEmail: string = '';
  userPhone: string = '';
  firstName: string = '';
  lastName: string = '';
  address: string = '';
  isLoggedIn: boolean = false;
  isEditing: boolean = false;
  newEmail: string = '';
  
  selectedTab: string = 'profile';
  
  userOrders: any[] = [];
  isLoadingOrders: boolean = false;
  loadingAttempts: number = 0;  

  constructor(
    private router: Router, 
    private http: HttpClient,
    private toastCtrl: ToastController,
    private modalCtrl: ModalController,
    private orderService: OrderService,
    private authService: AuthService
  ) {
    console.log('ProfilePage constructeur initialisé');
  }

  ngOnInit() {
    console.log('ProfilePage ngOnInit appelé');
    this.loadUserProfile();
    
    const requestedTab = sessionStorage.getItem('selectedProfileTab');
    if (requestedTab) {
      this.selectedTab = requestedTab;
      sessionStorage.removeItem('selectedProfileTab');
    }
  }

  ionViewDidEnter() {
    console.log('ProfilePage ionViewDidEnter appelé');
    if (this.isLoggedIn && this.userOrders.length === 0 && !this.isLoadingOrders) {
      console.log('Rechargement des commandes depuis ionViewDidEnter');
      this.loadUserOrders();
    }
  }

  loadUserProfile() {
    console.log('Chargement du profil utilisateur...');
    const email = localStorage.getItem('userEmail');

    if (!email) {
      console.log('⚠️ Aucun email trouvé, affichage du profil comme invité');
      this.userEmail = 'Non connecté';
      this.userPhone = 'Non disponible';
      this.firstName = '';
      this.lastName = '';
      this.address = '';
      this.isLoggedIn = false;
      return;
    }

    this.isLoggedIn = true;
    this.userEmail = email;
    this.newEmail = email;  
    console.log('✅ Utilisateur connecté avec l\'email:', email);

    this.firstName = localStorage.getItem('firstName') || 'Jean';
    this.lastName = localStorage.getItem('lastName') || 'Dupont';
    this.userPhone = localStorage.getItem('userPhone') || '06 12 34 56 78';
    this.address = localStorage.getItem('address') || '123 rue des Lilas, 75001 Paris';

    this.loadUserOrders();
  }

  loadUserOrders() {
    if (this.isLoadingOrders) {
      console.log('⚠️ Chargement des commandes déjà en cours, ignoré');
      return;
    }
    
    this.loadingAttempts++;
    if (this.loadingAttempts > 3) {
      console.error('❌ Trop de tentatives de chargement des commandes, abandon');
      this.isLoadingOrders = false;
      this.showToast('Impossible de charger vos commandes après plusieurs tentatives.');
      return;
    }

    const userId = this.authService.getCurrentUserId();
    
    if (!userId) {
      console.error('❌ Impossible de charger les commandes: aucun ID utilisateur disponible');
      this.isLoadingOrders = false;
      return;
    }
    
    console.log(`🔄 Tentative ${this.loadingAttempts} de chargement des commandes pour l'utilisateur ${userId}`);
    this.isLoadingOrders = true;
    
    const timeout = setTimeout(() => {
      if (this.isLoadingOrders) {
        console.error('❌ Timeout lors du chargement des commandes');
        this.isLoadingOrders = false;
        this.userOrders = [];
        this.showToast('Le chargement des commandes a pris trop de temps.');
      }
    }, 8000); 
    
    this.orderService.getUserOrders(Number(userId)).subscribe(
      (orders) => {
        clearTimeout(timeout);
        console.log('✅ Commandes récupérées:', orders);
        this.userOrders = orders;
        this.isLoadingOrders = false;
        this.loadingAttempts = 0; 
      },
      (error) => {
        clearTimeout(timeout); 
        console.error('❌ Erreur lors du chargement des commandes:', error);
        this.isLoadingOrders = false;
        this.userOrders = []; 
        
        if (error.status === 0) {
          this.showToast('Impossible de se connecter au serveur.');
        } else if (error.status === 404) {
          this.showToast('Aucune commande trouvée.');
        } else {
          this.showToast('Erreur lors du chargement des commandes.');
        }
      }
    );
  }

  async viewOrderDetails(order: any) {
    console.log('Affichage des détails de la commande:', order);
    this.showToast(`Commande #${order.id_commande} - ${this.getStatusLabel(order.id_statut_commande)}`);
  }

  getStatusLabel(statusId: number): string {
    return this.orderService.getStatusLabel(statusId);
  }

  getStatusColor(statusId: number): string {
    return this.orderService.getStatusColor(statusId);
  }

  async showToast(message: string) {
    const toast = await this.toastCtrl.create({
      message: message,
      duration: 2000,
      position: 'bottom'
    });
    toast.present();
  }

  toggleEditMode() {
    this.isEditing = !this.isEditing;
    if (!this.isEditing) {
      this.newEmail = this.userEmail;
    }
  }

  saveProfile() {
    if (this.newEmail && this.newEmail.includes('@')) {
      const userData = {
        firstName: this.firstName,
        lastName: this.lastName,
        email: this.newEmail,
        telephone: this.userPhone,
        address: this.address
      };
      
      this.authService.updateUserProfile(userData).subscribe(
        (response) => {
          console.log('Profil mis à jour avec succès:', response);
          
          this.userEmail = this.newEmail;
          
          this.showToast('Profil mis à jour avec succès');
          this.isEditing = false;
        },
        (error) => {
          console.error('Erreur lors de la mise à jour du profil:', error);
          
          this.userEmail = this.newEmail;
          localStorage.setItem('userEmail', this.newEmail);
          localStorage.setItem('firstName', this.firstName);
          localStorage.setItem('lastName', this.lastName);
          localStorage.setItem('userPhone', this.userPhone);
          localStorage.setItem('address', this.address);
          
          this.showToast('Profil mis à jour localement (échec de synchronisation avec le serveur)');
          this.isEditing = false;
        }
      );
    } else {
      this.showToast('Veuillez entrer une adresse email valide');
    }
  }

  deconnexion() {
    console.log('Déconnexion...');
    localStorage.removeItem('userEmail'); 
    this.isLoggedIn = false;
    this.router.navigate(['/login']); 
  }

  navigateToOrders() {
    console.log('Navigation vers la page des commandes');
    this.router.navigate(['/orders']);
  }
}