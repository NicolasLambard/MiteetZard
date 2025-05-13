import { Component, OnInit, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, AlertController, ToastController, ModalController } from '@ionic/angular';
import { AdminService } from '../../../admin.service';
import { AuthService } from '../../../auth.service';

@Component({
  selector: 'app-produits',
  templateUrl: './produits.page.html',
  styleUrls: ['./produits.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule]
})
export class ProduitsPage implements OnInit {
  produits: any[] = [];
  categories: any[] = [];
  loading: boolean = false;
  accessDenied: boolean = false;
  
  constructor(
    private adminService: AdminService,
    private authService: AuthService,
    private alertController: AlertController,
    private toastController: ToastController,
    private modalController: ModalController
  ) { }

  ngOnInit() {
    this.loadProducts();
    this.loadCategories();
  }

  loadProducts() {
    this.loading = true;
    this.adminService.getAllProducts().subscribe(
      (data) => {
        console.log('🔍 Produits récupérés:', data);
        this.produits = data;
        this.produits.forEach(produit => {
          console.log(`Produit ${produit.nom_produit} - image_data:`, produit.image_data ? 'présente' : 'absente');
        });
        this.loading = false;
        this.accessDenied = false;
      },
      (error) => {
        console.error('Erreur lors du chargement des produits:', error);
        if (error.status === 403) {
          this.accessDenied = true;
          this.presentToast('Accès refusé - Droits administrateur requis');
        } else {
          this.presentToast('Erreur lors du chargement des produits');
        }
        this.loading = false;
      }
    );
  }

  loadCategories() {
    this.adminService.getAllCategories().subscribe(
      (data) => {
        this.categories = data;
      },
      (error) => {
        console.error('Erreur lors du chargement des catégories:', error);
        this.presentToast('Erreur lors du chargement des catégories');
      }
    );
  }

  async showAddProductModal() {
    const userId = this.authService.getCurrentUserId();
    console.log('ID utilisateur actuel:', userId);
    
    if (!userId) {
      this.presentToast('Erreur: Vous n\'êtes pas connecté');
      return;
    }
    
    const modal = await this.modalController.create({
      component: ProductModalComponent,
      componentProps: {
        categories: this.categories,
        isEditMode: false,
        product: this.getEmptyProduct()
      }
    });

    await modal.present();

    const { data } = await modal.onDidDismiss();
    if (data && data.refresh) {
      this.loadProducts();
    }
  }

  async editProduct(product: any) {
    const modal = await this.modalController.create({
      component: ProductModalComponent,
      componentProps: {
        categories: this.categories,
        isEditMode: true,
        product: { ...product }
      }
    });

    await modal.present();

    const { data } = await modal.onDidDismiss();
    if (data && data.refresh) {
      this.loadProducts();
    }
  }

  toggleProductStatus(product: any) {
    const newStatus = product.actif === 1 ? 0 : 1;
    
    this.adminService.toggleProductStatus(product.id_produit, newStatus).subscribe(
      (response) => {
        const message = newStatus === 1 ? 'Produit activé' : 'Produit désactivé';
        this.presentToast(message);
        this.loadProducts();
      },
      (error) => {
        console.error('Erreur lors de la mise à jour du statut:', error);
        this.presentToast('Erreur lors de la mise à jour du statut');
        product.actif = product.actif === 1 ? 0 : 1;
      }
    );
  }

  async confirmDelete(product: any) {
    const alert = await this.alertController.create({
      header: 'Confirmer la suppression',
      message: `Êtes-vous sûr de vouloir supprimer ${product.nom_produit} ?`,
      buttons: [
        {
          text: 'Annuler',
          role: 'cancel'
        }, 
        {
          text: 'Supprimer',
          role: 'destructive',
          handler: () => {
            this.deleteProduct(product);
          }
        }
      ]
    });

    await alert.present();
  }

  deleteProduct(product: any) {
    this.adminService.deleteProduct(product.id_produit).subscribe(
      (response) => {
        this.presentToast('Produit supprimé avec succès');
        this.loadProducts();
      },
      (error) => {
        console.error('Erreur lors de la suppression du produit:', error);
        this.presentToast('Erreur lors de la suppression du produit');
      }
    );
  }

  async presentToast(message: string) {
    const toast = await this.toastController.create({
      message: message,
      duration: 2000,
      position: 'bottom',
      color: 'dark'
    });
    await toast.present();
  }

  getEmptyProduct() {
    return {
      nom_produit: '',
      description: '',
      prix: null,
      categorie: '',
      image_data: null,
      actif: 1
    };
  }

  fixAdminRights() {
    this.loading = true;
    this.presentToast('Tentative de réparation des droits administrateur...');
    
    this.adminService.assignAdminRole().subscribe(
      (response) => {
        console.log('Réponse de la réparation des droits:', response);
        this.presentToast('Droits administrateur réparés avec succès');
        this.loading = false;
        this.loadProducts();
      },
      (error) => {
        console.error('Erreur lors de la réparation des droits:', error);
        this.presentToast('Erreur lors de la réparation des droits: ' + (error.error?.message || error.message));
        this.loading = false;
      }
    );
  }
}

@Component({
  selector: 'app-product-modal',
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>{{ isEditMode ? 'Modifier' : 'Ajouter' }} un produit</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="dismiss()">
            <ion-icon name="close-outline"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <form (ngSubmit)="saveProduct()">
        <ion-item>
          <ion-label position="stacked">Nom du produit *</ion-label>
          <ion-input [(ngModel)]="product.nom_produit" name="nom_produit" required></ion-input>
        </ion-item>

        <ion-item>
          <ion-label position="stacked">Description</ion-label>
          <ion-textarea [(ngModel)]="product.description" name="description" rows="3"></ion-textarea>
        </ion-item>

        <ion-item>
          <ion-label position="stacked">Prix *</ion-label>
          <ion-input type="number" [(ngModel)]="product.prix" name="prix" required></ion-input>
        </ion-item>

        <ion-item>
          <ion-label position="stacked">Catégorie *</ion-label>
          <ion-select [(ngModel)]="product.categorie" name="categorie" required>
            <ion-select-option *ngFor="let cat of categories" [value]="cat.nom_categorie">
              {{ cat.nom_categorie }}
            </ion-select-option>
          </ion-select>
        </ion-item>

        <ion-item lines="none">
          <ion-label position="stacked">Image du produit</ion-label>
        </ion-item>
        
        <div class="image-upload-container">
          <!-- Aperçu de l'image -->
          <div class="image-preview" *ngIf="imagePreview || product.image_data">
            <img [src]="imagePreview || product.image_data" alt="Aperçu de l'image">
            <ion-button fill="clear" color="danger" (click)="removeSelectedImage()">
              <ion-icon name="trash-outline"></ion-icon>
            </ion-button>
          </div>
          
          <!-- Zone de drop ou bouton d'upload -->
          <div class="image-upload-zone" *ngIf="!imagePreview && !product.image_data" (click)="triggerImageSelection()">
            <ion-icon name="image-outline" size="large"></ion-icon>
            <p>Cliquez pour sélectionner une image</p>
          </div>
          
          <!-- Input file caché -->
          <input
            #fileInput
            type="file"
            accept="image/*"
            (change)="onImageSelected($event)"
            style="display: none">
        </div>

        <ion-item>
          <ion-label>Actif</ion-label>
          <ion-toggle [(ngModel)]="product.actif" name="actif"></ion-toggle>
        </ion-item>

        <div class="ion-padding">
          <ion-button expand="block" type="submit" [disabled]="!product.nom_produit || !product.prix || !product.categorie">
            {{ isEditMode ? 'Enregistrer les modifications' : 'Ajouter le produit' }}
          </ion-button>
        </div>
      </form>
    </ion-content>
  `,
  styles: [`
    .image-upload-container {
      padding: 16px;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .image-preview {
      position: relative;
      width: 200px;
      height: 200px;
      margin-bottom: 16px;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }
    .image-preview img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .image-preview ion-button {
      position: absolute;
      top: 8px;
      right: 8px;
      --border-radius: 50%;
      --padding-start: 8px;
      --padding-end: 8px;
      --padding-top: 8px;
      --padding-bottom: 8px;
      --background: rgba(255, 255, 255, 0.7);
      --color: #ff4961;
    }
    .image-upload-zone {
      width: 200px;
      height: 200px;
      border: 2px dashed #ccc;
      border-radius: 8px;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      cursor: pointer;
      transition: all 0.3s ease;
      color: #999;
    }
    .image-upload-zone:hover {
      border-color: #3880ff;
      color: #3880ff;
    }
    .image-upload-zone ion-icon {
      font-size: 48px;
      margin-bottom: 8px;
    }
    .image-upload-zone p {
      margin: 0;
    }
  `],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule]
})
export class ProductModalComponent implements OnInit {
  @ViewChild('fileInput') fileInput!: ElementRef;
  
  categories: any[] = [];
  isEditMode: boolean = false;
  product: any = {};
  imagePreview: string | null = null;
  selectedFile: File | null = null;

  constructor(
    private modalController: ModalController,
    private adminService: AdminService,
    private authService: AuthService,
    private toastController: ToastController
  ) {}

  ngOnInit() {
    if (this.product.image_data) {
      this.imagePreview = this.product.image_data;
    }
  }

  dismiss(refresh = false) {
    this.modalController.dismiss({
      refresh: refresh
    });
  }

  triggerImageSelection() {
    this.fileInput.nativeElement.click();
  }

  onImageSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        this.presentToast('Veuillez sélectionner une image valide');
        return;
      }

      if (file.size > 2 * 1024 * 1024) {
        this.presentToast('L\'image ne doit pas dépasser 2MB');
        return;
      }

      this.selectedFile = file;
      
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.imagePreview = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  removeSelectedImage() {
    this.selectedFile = null;
    this.imagePreview = null;
    this.product.image_data = null;
    this.fileInput.nativeElement.value = '';
  }

  saveProduct() {
    if (!this.product.nom_produit || !this.product.prix || !this.product.categorie) {
      this.presentToast('Veuillez remplir tous les champs obligatoires');
      return;
    }

    const formData = new FormData();
    formData.append('nom_produit', this.product.nom_produit);
    formData.append('description', this.product.description || '');
    formData.append('prix', this.product.prix.toString());
    formData.append('categorie', this.product.categorie);
    formData.append('actif', this.product.actif ? '1' : '0');

    if (this.selectedFile) {
      formData.append('image', this.selectedFile);
    }

    if (this.isEditMode) {
      formData.append('id_produit', this.product.id_produit.toString());
      
      this.adminService.updateProduct(formData).subscribe(
        (response) => {
          this.presentToast('Produit mis à jour avec succès');
          this.dismiss(true);
        },
        (error) => {
          console.error('Erreur lors de la mise à jour du produit:', error);
          this.presentToast('Erreur lors de la mise à jour du produit');
        }
      );
    } else {
      this.adminService.createProduct(formData).subscribe(
        (response) => {
          this.presentToast('Produit ajouté avec succès');
          this.dismiss(true);
        },
        (error) => {
          console.error('Erreur lors de l\'ajout du produit:', error);
          this.presentToast('Erreur lors de l\'ajout du produit');
        }
      );
    }
  }

  async presentToast(message: string) {
    const toast = await this.toastController.create({
      message: message,
      duration: 2000,
      position: 'bottom',
      color: 'dark'
    });
    await toast.present();
  }
} 