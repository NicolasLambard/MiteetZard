import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, AlertController, ToastController } from '@ionic/angular';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../auth.service';
import { AdminService } from '../../../admin.service';

@Component({
  selector: 'app-categories',
  templateUrl: './categories.page.html',
  styleUrls: ['./categories.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule]
})
export class CategoriesPage implements OnInit {
  apiUrl = environment.apiUrl;
  categories: any[] = [];
  isLoading = true;
  
  nouvelleCategorie = {
    nom_categorie: '',
    description: ''
  };
  
  editMode = false;
  categorieEnEdition: any = null;
  
  constructor(
    private router: Router,
    private http: HttpClient,
    private authService: AuthService,
    private adminService: AdminService,
    private alertController: AlertController,
    private toastController: ToastController
  ) { }

  ngOnInit() {
    this.chargerCategories();
  }
  
  chargerCategories() {
    this.isLoading = true;
    
    this.adminService.getAllCategories().subscribe(
      (response: any) => {
        this.categories = response;
        this.isLoading = false;
      },
      (error) => {
        console.error('Erreur lors du chargement des catégories:', error);
        this.isLoading = false;
        this.afficherToast('Erreur lors du chargement des catégories', 'danger');
      }
    );
  }
  
  ajouterCategorie() {
    if (!this.nouvelleCategorie.nom_categorie) {
      this.afficherToast('Veuillez remplir le nom de la catégorie', 'warning');
      return;
    }
    
    this.adminService.createCategory(this.nouvelleCategorie).subscribe(
      (response: any) => {
        this.afficherToast('Catégorie ajoutée avec succès', 'success');
        this.reinitialiserFormulaire();
        this.chargerCategories();
      },
      (error) => {
        console.error('Erreur lors de l\'ajout de la catégorie:', error);
        this.afficherToast('Erreur lors de l\'ajout de la catégorie', 'danger');
      }
    );
  }
  
  modifierCategorie() {
    console.log('Début de la modification de la catégorie:', this.categorieEnEdition);
    
    if (!this.categorieEnEdition.nom_categorie) {
      console.log('Erreur: nom_categorie manquant');
      this.afficherToast('Veuillez remplir le nom de la catégorie', 'warning');
      return;
    }
    
    this.adminService.updateCategory(this.categorieEnEdition).subscribe(
      (response: any) => {
        console.log('Réponse du serveur:', response);
        this.afficherToast('Catégorie mise à jour avec succès', 'success');
        this.annulerEdition();
        this.chargerCategories();
      },
      (error) => {
        console.error('Erreur détaillée lors de la mise à jour de la catégorie:', error);
        this.afficherToast('Erreur lors de la mise à jour de la catégorie', 'danger');
      }
    );
  }
  
  async supprimerCategorie(categorie: any) {
    const alert = await this.alertController.create({
      header: 'Confirmation',
      message: 'Êtes-vous sûr de vouloir supprimer cette catégorie ? Tous les produits associés seront également supprimés.',
      buttons: [
        {
          text: 'Annuler',
          role: 'cancel'
        },
        {
          text: 'Supprimer',
          cssClass: 'danger',
          handler: () => {
            this.adminService.deleteCategory(categorie.id_categorie).subscribe(
              (response: any) => {
                this.afficherToast('Catégorie supprimée avec succès', 'success');
                this.chargerCategories();
              },
              (error) => {
                console.error('Erreur lors de la suppression:', error);
                this.afficherToast('Erreur lors de la suppression de la catégorie', 'danger');
              }
            );
          }
        }
      ]
    });
    
    await alert.present();
  }
  
  editerCategorie(categorie: any) {
    this.categorieEnEdition = { ...categorie };
    this.editMode = true;
  }
  
  annulerEdition() {
    this.categorieEnEdition = null;
    this.editMode = false;
  }
  
  reinitialiserFormulaire() {
    this.nouvelleCategorie = {
      nom_categorie: '',
      description: ''
    };
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