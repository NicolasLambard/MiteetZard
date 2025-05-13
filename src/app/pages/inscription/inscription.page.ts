import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonicModule, LoadingController, ToastController, AlertController } from '@ionic/angular';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { RouterModule } from '@angular/router';
import axios from 'axios';

@Component({
  selector: 'app-inscription',
  templateUrl: './inscription.page.html',
  styleUrls: ['./inscription.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, RouterModule, HttpClientModule]
})
export class InscriptionPage implements OnInit {
  utilisateur = {
    nom: '',
    prenom: '',
    email: '',
    motDePasse: '',
    telephone: '',
    adresse: '',
    adresseComplementaire: '',
    ville: '',
    codePostal: '',
    latitude: null as number | null,
    longitude: null as number | null,
  };
  
  adresseEnCours = '';
  rechercheEnCours = false;

  constructor(
    private router: Router,
    private http: HttpClient,
    private loadingCtrl: LoadingController,
    private toastCtrl: ToastController,
    private alertCtrl: AlertController
  ) {}

  ngOnInit() {
    console.log('InscriptionPage initialized');
  }
  
  rechercheAdresse(event: any) {
    const valeur = event.detail.value;
    this.adresseEnCours = valeur;
  }
  
  async detecterAdresse() {
    if (!this.adresseEnCours || this.adresseEnCours.length < 3) {
      this.showToast('Veuillez entrer une adresse valide', 'warning');
      return;
    }
    
    const loading = await this.loadingCtrl.create({
      message: 'Recherche de l\'adresse...',
      spinner: 'circles'
    });
    await loading.present();
    
    try {
      const API_KEY = 'd4b02ec978624faf829df351918300e6';
      const response = await axios.get(`https://api.opencagedata.com/geocode/v1/json`, {
        params: {
          q: this.adresseEnCours,
          key: API_KEY,
          countrycode: 'fr',
          limit: 1,
          language: 'fr'
        }
      });
      
      await loading.dismiss();
      
      if (response.data.results && response.data.results.length > 0) {
        const result = response.data.results[0];
        
        this.utilisateur.adresse = result.components.road || 
                                 result.components.street || 
                                 result.components.pedestrian || 
                                 this.adresseEnCours;
        
        if (result.components.house_number) {
          this.utilisateur.adresse = `${result.components.house_number} ${this.utilisateur.adresse}`;
        }
        
        this.utilisateur.ville = result.components.city || 
                              result.components.town || 
                              result.components.village || 
                              result.components.municipality || 
                              '';
                              
        this.utilisateur.codePostal = result.components.postcode || '';
        this.utilisateur.latitude = result.geometry.lat;
        this.utilisateur.longitude = result.geometry.lng;
        
        this.showToast(`📍 Adresse détectée avec succès`, 'success');
      } else {
        this.showToast('Adresse non trouvée. Veuillez vérifier votre saisie.', 'warning');
      }
    } catch (error) {
      await loading.dismiss();
      console.error('❌ Erreur lors de la recherche d\'adresse:', error);
      this.showToast('Erreur lors de la recherche. Veuillez saisir l\'adresse manuellement.', 'danger');
    }
  }

  async showToast(message: string, color: string = 'primary') {
    const toast = await this.toastCtrl.create({
      message: message,
      duration: 3000,
      position: 'bottom',
      color: color
    });
    toast.present();
  }

  async envoyerEmailConfirmation(email: string, nom: string, prenom: string) {
    try {
      console.log('✅ Simulation d\'envoi d\'email à:', email);
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      return true;
    } catch (error) {
      console.error('❌ Erreur lors de l\'envoi de l\'email:', error);
      return false;
    }
  }

  async inscrireUtilisateur() {
    if (!this.utilisateur.nom || !this.utilisateur.prenom || !this.utilisateur.email || 
        !this.utilisateur.motDePasse || !this.utilisateur.telephone || 
        !this.utilisateur.adresse || !this.utilisateur.ville || !this.utilisateur.codePostal) {
      this.showToast('Veuillez remplir tous les champs obligatoires', 'danger');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.utilisateur.email)) {
      this.showToast('Veuillez entrer une adresse email valide', 'danger');
      return;
    }

    const loading = await this.loadingCtrl.create({
      message: 'Inscription en cours...',
      spinner: 'circles'
    });
    await loading.present();

    console.log('📤 Données envoyées au backend :', this.utilisateur);

    const userData = {
      nom: this.utilisateur.nom,
      prenom: this.utilisateur.prenom,
      email: this.utilisateur.email,
      motDePasse: this.utilisateur.motDePasse,
      telephone: this.utilisateur.telephone,
      adresse: this.utilisateur.adresse,
      adresseComplementaire: this.utilisateur.adresseComplementaire || '',
      ville: this.utilisateur.ville,
      codePostal: this.utilisateur.codePostal,
    };

    this.http.post<any>('http://localhost:3000/api/users/register', userData)
      .subscribe({
        next: (response) => {
          console.log('✅ Réponse du backend :', response);
          loading.dismiss();
          
          localStorage.setItem('firstName', this.utilisateur.prenom);
          localStorage.setItem('lastName', this.utilisateur.nom);
          localStorage.setItem('userEmail', this.utilisateur.email);
          localStorage.setItem('userPhone', this.utilisateur.telephone);
          localStorage.setItem('address', `${this.utilisateur.adresse}, ${this.utilisateur.codePostal} ${this.utilisateur.ville}`);

          if (response.emailSent) {
            this.alertCtrl.create({
              header: 'Inscription réussie !',
              message: 'Votre compte a été créé avec succès. Un email de confirmation a été envoyé à votre adresse email.',
              buttons: [{
                text: 'OK',
                handler: () => {
                  this.router.navigate(['/login']);
                }
              }]
            }).then(alert => alert.present());
          } else {
            this.alertCtrl.create({
              header: 'Inscription réussie !',
              message: 'Votre compte a été créé avec succès, mais nous n\'avons pas pu vous envoyer d\'email de confirmation.',
              buttons: [{
                text: 'OK',
                handler: () => {
                  this.router.navigate(['/login']);
                }
              }]
            }).then(alert => alert.present());
          }
        },
        error: (error) => {
          loading.dismiss();
          console.error('❌ Erreur lors de l\'inscription :', error);

          let errorMessage = 'Une erreur est survenue. Veuillez vérifier vos informations.';

          if (error.status === 400) {
            errorMessage = error.error?.message || 'Un utilisateur avec cet email existe déjà.';
          } else if (error.status === 500) {
            errorMessage = 'Le serveur a rencontré un problème. Veuillez réessayer plus tard.';
          }

          this.alertCtrl.create({
            header: 'Erreur d\'inscription',
            message: errorMessage,
            buttons: ['OK']
          }).then(alert => alert.present());
        }
      });
  }

  async localiserAppareil() {
    if (!navigator.geolocation) {
      this.showToast('La géolocalisation n\'est pas prise en charge par votre navigateur.', 'danger');
      return;
    }

    const loading = await this.loadingCtrl.create({
      message: 'Localisation en cours...',
      spinner: 'circles'
    });
    await loading.present();

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;

        this.utilisateur.latitude = latitude;
        this.utilisateur.longitude = longitude;

        try {
          const API_KEY = 'd4b02ec978624faf829df351918300e6';  
          const response = await axios.get(`https://api.opencagedata.com/geocode/v1/json`, {
            params: {
              q: `${latitude},${longitude}`,
              key: API_KEY,
              countrycode: 'fr',
            },
          });

          await loading.dismiss();

          if (response.data.results.length > 0) {
            const result = response.data.results[0];

            this.utilisateur.adresse = result.components.road || result.formatted.split(',')[0];
            this.utilisateur.ville =
              result.components.city ||
              result.components.town ||
              result.components.village ||
              result.components.suburb ||
              'Non détectée';
            this.utilisateur.codePostal = result.components.postcode || 'Non détecté';

            this.showToast(`📍 Adresse détectée : ${this.utilisateur.adresse}`, 'success');
          } else {
            this.showToast('Impossible de détecter l\'adresse. Veuillez réessayer.', 'warning');
          }
        } catch (error) {
          await loading.dismiss();
          console.error('❌ Erreur lors de la récupération de l\'adresse :', error);
          this.showToast('Une erreur est survenue lors de la récupération de l\'adresse.', 'danger');
        }
      },
      async (error) => {
        await loading.dismiss();
        console.error('❌ Erreur lors de la géolocalisation :', error);
        this.showToast('Impossible de récupérer votre position. Veuillez activer la localisation.', 'danger');
      }
    );
  }
}
