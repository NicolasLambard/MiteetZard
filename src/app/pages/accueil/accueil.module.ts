import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { MenuController } from '@ionic/angular';
import { IonicModule } from '@ionic/angular';

@Component({
  selector: 'app-accueil',
  templateUrl: './accueil.page.html',
  styleUrls: ['./accueil.page.scss'],
  standalone: true, 
  imports: [IonicModule], 
})
export class AccueilPage {
  constructor(private router: Router, private menuCtrl: MenuController) {}

  seDeconnecter() {
    console.log('🔒 Déconnexion en cours...');
    alert('Déconnexion réussie');
    this.router.navigate(['/login']);
  }

  ouvrirMenu() {
    this.menuCtrl.open();
  }
}

export class AccueilPageModule {} 

