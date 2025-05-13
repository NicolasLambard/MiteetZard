import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { environment } from '../environments/environment';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private apiUrl = environment.apiUrl;

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) { }

  private getHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    if (!token) {
      console.error('❌ Pas de token d\'authentification trouvé');
    } else {
      console.log('✅ Token trouvé:', token.substring(0, 20) + '...');
    }
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  getAllCategories(): Observable<any> {
    console.log('📋 Récupération des catégories...');
    return this.http.get(
      `${this.apiUrl}/admin/categories`,
      { headers: this.getHeaders() }
    );
  }

  createCategory(categoryData: any): Observable<any> {
    console.log('➕ Création d\'une nouvelle catégorie:', categoryData);
    return this.http.post(
      `${this.apiUrl}/admin/categories`,
      categoryData,
      { headers: this.getHeaders() }
    );
  }

  updateCategory(categoryData: any): Observable<any> {
    console.log('🔄 Mise à jour de la catégorie:', categoryData);
    return this.http.put(
      `${this.apiUrl}/admin/categories/${categoryData.id_categorie}`,
      categoryData,
      { headers: this.getHeaders() }
    );
  }

  deleteCategory(categoryId: number): Observable<any> {
    console.log('🗑️ Suppression de la catégorie:', categoryId);
    return this.http.delete(
      `${this.apiUrl}/admin/categories/${categoryId}`,
      { headers: this.getHeaders() }
    );
  }

  getAllProducts(): Observable<any> {
    console.log('📋 Récupération des produits...');
    return this.http.get(
      `${this.apiUrl}/admin/products`,
      { headers: this.getHeaders() }
    );
  }

  createProduct(productData: FormData): Observable<any> {
    console.log('➕ Création d\'un nouveau produit');
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${this.authService.getToken()}`
    });
    return this.http.post(
      `${this.apiUrl}/admin/products`,
      productData,
      { headers }
    );
  }

  updateProduct(productData: FormData): Observable<any> {
    console.log('🔄 Mise à jour du produit');
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${this.authService.getToken()}`
    });
    return this.http.put(
      `${this.apiUrl}/admin/products`,
      productData,
      { headers }
    );
  }

  deleteProduct(productId: number): Observable<any> {
    console.log('🗑️ Suppression du produit:', productId);
    return this.http.delete(
      `${this.apiUrl}/admin/products/${productId}`,
      { headers: this.getHeaders() }
    );
  }

  toggleProductStatus(productId: number, newStatus: number): Observable<any> {
    console.log('🔄 Changement du statut du produit:', { productId, newStatus });
    return this.http.put(
      `${this.apiUrl}/admin/products/toggle-status`,
      { id_produit: productId, actif: newStatus },
      { headers: this.getHeaders() }
    );
  }

  getCurrentUserId(): number | null {
    const userId = this.authService.getCurrentUserId();
    return userId ? Number(userId) : null;
  }

  getAllUsers(): Observable<any> {
    return this.http.get(
      `${this.apiUrl}/admin/users`,
      { headers: this.getHeaders() }
    );
  }

  updateUserRole(userId: number, roleId: number): Observable<any> {
    return this.http.put(
      `${this.apiUrl}/admin/users/${userId}/role`,
      { roleId },
      { headers: this.getHeaders() }
    );
  }

  checkRoleConfig(): Observable<any> {
    console.log('🔍 Vérification de la configuration des rôles...');
    return this.http.get(
      `${this.apiUrl}/admin/check-roles`,
      { headers: this.getHeaders() }
    );
  }

  initRoles(): Observable<any> {
    console.log('🔧 Initialisation des rôles...');
    return this.http.post(
      `${this.apiUrl}/admin/init-roles`,
      {},
      { headers: this.getHeaders() }
    );
  }

  assignAdminRole(): Observable<any> {
    console.log('🔑 Attribution du rôle admin...');
    return this.http.post(
      `${this.apiUrl}/admin/assign-admin`,
      {},
      { headers: this.getHeaders() }
    );
  }
} 