import { Component } from '@angular/core';
import { Router, NavigationExtras } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: true,
  imports: [IonicModule, FormsModule, CommonModule]
})
export class LoginPage {
  utilisateur = {
    email: '',
    motDePasse: '',
  };
  loginError = '';

  constructor(
    private router: Router,
    private authService: AuthService
  ) {}

  seConnecter() {
    console.log('🔑 Tentative de connexion avec :', this.utilisateur);

    if (!this.utilisateur.email || !this.utilisateur.motDePasse) {
      this.loginError = 'Veuillez remplir tous les champs';
      return;
    }

    this.loginError = '';
    
    this.authService.login(this.utilisateur.email, this.utilisateur.motDePasse)
      .subscribe(
        (response) => {
          console.log('✅ Réponse du backend :', response);
          
          if (response.success === false) {
            this.loginError = response.message || 'Erreur de connexion';
            return;
          }
          
          if (response.utilisateur) {
            console.log('👤 Utilisateur connecté :', response.utilisateur);
            
            console.log('🔄 Redirection vers l\'accueil depuis la page de login...');
            
            window.location.href = '/accueil';
          } else {
            console.warn('⚠️ Données utilisateur manquantes :', response);
            this.loginError = 'Erreur : Données utilisateur manquantes.';
          }
        },
        (error) => {
          console.error('❌ Erreur de connexion:', error);
          this.loginError = error.error?.message || 'Erreur de connexion au serveur';
        }
      );
  }
  
  naviguerVersInscription() {
    console.log('📩 Redirection vers la page d\'inscription');
    this.router.navigate(['/inscription']);
  }
}