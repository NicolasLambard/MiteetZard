import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { LoadingController, AlertController, ToastController } from '@ionic/angular';
import { environment } from 'src/environments/environment';
import { AuthService } from 'src/app/auth.service';

@Component({
  selector: 'app-menus',
  templateUrl: './menus.page.html',
  styleUrls: ['./menus.page.scss'],
})
export class MenusPage implements OnInit {
  private apiUrl = environment.apiUrl;
  
  menus: any[] = [];
  availableProducts: any[] = [];
  loading: boolean = true;
  saving: boolean = false;
  showMenuModal: boolean = false;
  editMode: boolean = false;
  
  menuForm: FormGroup;
  selectedFile: File | null = null;
  imagePreview: string | null = null;
  
  constructor(
    private http: HttpClient,
    private formBuilder: FormBuilder,
    private authService: AuthService,
    private loadingCtrl: LoadingController,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController
  ) {
    this.menuForm = this.formBuilder.group({
      id_menu: [null],
      nom_menu: ['', [Validators.required]],
      description: [''],
      prix: ['', [Validators.required, Validators.min(0.01)]],
      produits: [[], [Validators.required, Validators.minLength(1)]],
      actif: [true]
    });
  }

  ngOnInit() {
    this.loadMenus();
    this.loadProducts();
  }

  async loadMenus() {
    this.loading = true;
    try {
      const userId = this.authService.getCurrentUserId();
      const response: any = await this.http.get(`${this.apiUrl}/menus/admin?userId=${userId}`).toPromise();
      this.menus = response;
    } catch (error) {
      console.error('Erreur lors du chargement des menus:', error);
      this.showError('Impossible de charger les menus.');
    } finally {
      this.loading = false;
    }
  }

  async loadProducts() {
    try {
      const userId = this.authService.getCurrentUserId();
      const response: any = await this.http.get(`${this.apiUrl}/admin/products?userId=${userId}`).toPromise();
      this.availableProducts = response.filter((p: any) => p.actif);
    } catch (error) {
      console.error('Erreur lors du chargement des produits:', error);
      this.showError('Impossible de charger les produits disponibles.');
    }
  }

  openNewMenuModal() {
    this.editMode = false;
    this.menuForm.reset({
      actif: true,
      produits: []
    });
    this.imagePreview = null;
    this.selectedFile = null;
    this.showMenuModal = true;
  }

  closeMenuModal() {
    this.showMenuModal = false;
  }

  editMenu(menu: any) {
    this.editMode = true;
    
    const produitsIds = menu.produits.map((p: any) => p.id_produit);
    
    this.menuForm.patchValue({
      id_menu: menu.id_menu,
      nom_menu: menu.nom_menu,
      description: menu.description,
      prix: menu.prix,
      produits: produitsIds,
      actif: menu.actif
    });
    
    this.imagePreview = menu.image_data || null;
    this.selectedFile = null;
    this.showMenuModal = true;
  }

  async toggleMenuStatus(menu: any) {
    try {
      const userId = this.authService.getCurrentUserId();
      const updatedMenu = {
        userId: userId,
        id_menu: menu.id_menu,
        nom_menu: menu.nom_menu,
        description: menu.description,
        prix: menu.prix,
        produits: JSON.stringify(menu.produits.map((p: any) => p.id_produit)),
        actif: !menu.actif
      };
      
      await this.http.put(`${this.apiUrl}/menus/admin`, updatedMenu).toPromise();
      
      menu.actif = !menu.actif;
      
      this.showToast(`Menu ${menu.actif ? 'activé' : 'désactivé'} avec succès`);
    } catch (error) {
      console.error('Erreur lors du changement de statut:', error);
      this.showError('Impossible de modifier le statut du menu.');
    }
  }

  async confirmDeleteMenu(menu: any) {
    const alert = await this.alertCtrl.create({
      header: 'Confirmation',
      message: `Êtes-vous sûr de vouloir supprimer le menu "${menu.nom_menu}" ?`,
      buttons: [
        {
          text: 'Annuler',
          role: 'cancel'
        },
        {
          text: 'Supprimer',
          handler: () => this.deleteMenu(menu)
        }
      ]
    });
    await alert.present();
  }

  async deleteMenu(menu: any) {
    try {
      const userId = this.authService.getCurrentUserId();
      await this.http.delete(`${this.apiUrl}/menus/admin/${menu.id_menu}`, {
        body: { userId }
      }).toPromise();
      
      this.menus = this.menus.filter(m => m.id_menu !== menu.id_menu);
      
      this.showToast('Menu supprimé avec succès');
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      this.showError('Impossible de supprimer le menu.');
    }
  }

  onImageSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile = file;
      
      const reader = new FileReader();
      reader.onload = () => {
        this.imagePreview = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  }

  clearImage() {
    this.imagePreview = null;
    this.selectedFile = null;
  }

  getProductName(productId: number): string {
    const product = this.availableProducts.find(p => p.id_produit === productId);
    return product ? product.nom_produit : '';
  }

  getProductPrice(productId: number): number {
    const product = this.availableProducts.find(p => p.id_produit === productId);
    return product ? product.prix : 0;
  }

  calculateTotalPrice(): number {
    const selectedProductIds = this.menuForm.get('produits')?.value || [];
    return selectedProductIds.reduce((total: number, productId: number) => {
      return total + this.getProductPrice(productId);
    }, 0);
  }

  calculateSavings(): number {
    const totalProductsPrice = this.calculateTotalPrice();
    const menuPrice = this.menuForm.get('prix')?.value || 0;
    return totalProductsPrice - menuPrice;
  }

  compareWith(o1: any, o2: any) {
    return o1 && o2 ? o1 === o2 : o1 === o2;
  }

  async saveMenu() {
    if (this.menuForm.invalid) {
      return;
    }
    
    this.saving = true;
    
    try {
      const userId = this.authService.getCurrentUserId();
      const formData = new FormData();
      
      formData.append('userId', userId ? userId.toString() : '');
      formData.append('nom_menu', this.menuForm.get('nom_menu')?.value);
      formData.append('description', this.menuForm.get('description')?.value || '');
      formData.append('prix', this.menuForm.get('prix')?.value);
      formData.append('actif', this.menuForm.get('actif')?.value ? '1' : '0');
      
      const produits = this.menuForm.get('produits')?.value || [];
      formData.append('produits', JSON.stringify(produits));
      
      if (this.selectedFile) {
        formData.append('image', this.selectedFile);
      }
      
      if (this.editMode) {
        formData.append('id_menu', this.menuForm.get('id_menu')?.value);
        await this.http.put(`${this.apiUrl}/menus/admin`, formData).toPromise();
        this.showToast('Menu mis à jour avec succès');
      } else {
        await this.http.post(`${this.apiUrl}/menus/admin`, formData).toPromise();
        this.showToast('Menu créé avec succès');
      }
      
      this.closeMenuModal();
      this.loadMenus();
    } catch (error) {
      console.error('Erreur lors de l\'enregistrement:', error);
      this.showError('Impossible d\'enregistrer le menu.');
    } finally {
      this.saving = false;
    }
  }

  async showError(message: string) {
    const toast = await this.toastCtrl.create({
      message,
      duration: 3000,
      position: 'bottom',
      color: 'danger'
    });
    toast.present();
  }

  async showToast(message: string) {
    const toast = await this.toastCtrl.create({
      message,
      duration: 3000,
      position: 'bottom',
      color: 'success'
    });
    toast.present();
  }
} 