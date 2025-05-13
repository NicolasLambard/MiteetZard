import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AdminGuard } from './admin.guard';
import { authGuard } from './auth.guard';

const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', loadChildren: () => import('./pages/login/login.module').then(m => m.LoginPageModule) },
  { path: 'inscription', loadComponent: () => import('./pages/inscription/inscription.page').then(m => m.InscriptionPage) },
  { path: 'menu', loadComponent: () => import('./pages/menu/menu.page').then(m => m.MenuPage) }, 
  { path: 'profile', loadComponent: () => import('./pages/profile/profile.page').then(m => m.ProfilePage) },
  { path: 'accueil', loadComponent: () => import('./pages/accueil/accueil.page').then(m => m.AccueilPage) },
  { path: 'cart', loadComponent: () => import('./pages/cart/cart.page').then(m => m.CartPage) },
  { path: 'orders', loadComponent: () => import('./pages/orders/orders.page').then(m => m.OrdersPage), canActivate: [authGuard] },
  { 
    path: 'admin', 
    loadComponent: () => import('./pages/admin/admin.page').then(m => m.AdminPage),
    canActivate: [AdminGuard]
  },
  { 
    path: 'admin/produits', 
    loadComponent: () => import('./pages/admin/produits/produits.page').then(m => m.ProduitsPage),
    canActivate: [AdminGuard]
  },
  { 
    path: 'admin/categories', 
    loadComponent: () => import('./pages/admin/categories/categories.page').then(m => m.CategoriesPage),
    canActivate: [AdminGuard]
  },
  { 
    path: 'admin/users', 
    loadComponent: () => import('./pages/admin/users/users.page').then(m => m.UsersPage),
    canActivate: [AdminGuard]
  },
  { 
    path: 'admin/orders', 
    loadComponent: () => import('./pages/admin/orders').then(m => m.OrdersPage),
    canActivate: [AdminGuard]
  },
  { path: '**', redirectTo: 'login' },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
