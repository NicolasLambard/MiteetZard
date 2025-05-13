import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, ToastController, AlertController } from '@ionic/angular';
import { Router, RouterModule } from '@angular/router';
import { OrderService } from '../../../order.service';
import { AuthService } from '../../../auth.service';
import { LoadingController } from '@ionic/angular';
import axios from 'axios';

@Component({
  selector: 'app-orders',
  templateUrl: './orders.page.html',
  styleUrls: ['./orders.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule, RouterModule]
})
export class OrdersPage implements OnInit {
  orders: any[] = [];
  loading: boolean = false;
  error: string = '';
  selectedOrder: any = null;
  displayMode: 'all' | 'pending' | 'completed' = 'all';

  constructor(
    private orderService: OrderService,
    private authService: AuthService,
    private router: Router,
    private toastCtrl: ToastController,
    private alertCtrl: AlertController,
    private loadingCtrl: LoadingController
  ) { }

  ngOnInit() {
    this.loadOrders();
  }

  loadOrders() {
    this.loading = true;
    this.orderService.getAllOrders().subscribe(
      (data) => {
        this.orders = data;
        this.loading = false;
      },
      (error) => {
        console.error('❌ Erreur lors du chargement des commandes:', error);
        this.error = 'Erreur lors du chargement des commandes.';
        this.loading = false;
      }
    );
  }

  filterOrders() {
    if (this.displayMode === 'all') {
      return this.orders;
    } else if (this.displayMode === 'pending') {
      return this.orders.filter(o => [1, 2, 3].includes(o.id_statut_commande));
    } else {
      return this.orders.filter(o => [4, 5].includes(o.id_statut_commande));
    }
  }

  viewOrderDetails(order: any) {
    this.selectedOrder = order;
  }

  closeDetails() {
    this.selectedOrder = null;
  }

  async updateOrderStatus(orderId: number, newStatus: number) {
    const alert = await this.alertCtrl.create({
      header: 'Confirmation',
      message: `Êtes-vous sûr de vouloir changer le statut de cette commande ?`,
      buttons: [
        {
          text: 'Annuler',
          role: 'cancel'
        },
        {
          text: 'Confirmer',
          handler: () => {
            this.loading = true;
            this.orderService.updateOrderStatus(orderId, String(newStatus)).subscribe(
              (response) => {
                this.showToast('Statut de la commande mis à jour avec succès.');
                this.loadOrders();
              },
              (error) => {
                console.error('❌ Erreur lors de la mise à jour du statut:', error);
                this.showToast('Erreur lors de la mise à jour du statut.');
                this.loading = false;
              }
            );
          }
        }
      ]
    });
    await alert.present();
  }

  async showToast(message: string) {
    const toast = await this.toastCtrl.create({
      message: message,
      duration: 2000,
      position: 'bottom'
    });
    toast.present();
  }

  getStatusLabel(statusId: number): string {
    return this.orderService.getStatusLabel(statusId);
  }

  getStatusColor(statusId: number): string {
    return this.orderService.getStatusColor(statusId);
  }

  backToAdmin() {
    this.router.navigate(['/admin']);
  }

  openMapsNavigation(order?: any, event?: Event) {
    if (event) {
      event.stopPropagation();
    }
    
    const targetOrder = order || this.selectedOrder;
    
    if (!targetOrder) {
      this.showToast('Aucune adresse disponible pour la navigation.');
      return;
    }
    
    try {
      const address = `${targetOrder.adresse}, ${targetOrder.code_postal} ${targetOrder.ville}, France`;
      
      const encodedAddress = encodeURIComponent(address);
      
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      
      let mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodedAddress}&travelmode=driving`;
      
      if (isMobile && /iPhone|iPad|iPod/i.test(navigator.userAgent)) {
        mapsUrl = `maps://?daddr=${encodedAddress}&dirflg=d`;
      }
      
      console.log(`🗺️ Ouverture de la navigation GPS vers: ${address}`);
      
      window.open(mapsUrl, '_blank');
      
      this.showToast('Navigation GPS lancée');
    } catch (error) {
      console.error('Erreur lors de l\'ouverture de la navigation GPS:', error);
      this.showToast('Impossible d\'ouvrir la navigation. Vérifiez l\'adresse.');
    }
  }

  /**
   * Affiche les options de tournée optimisée avec différentes méthodes de tri
   */
  async showRouteOptions() {
    const alert = await this.alertCtrl.create({
      header: 'Tournée optimisée',
      message: 'Choisissez comment organiser votre tournée de livraison. L\'itinéraire s\'ouvrira automatiquement dans Google Maps :',
      buttons: [
        {
          text: 'Annuler',
          role: 'cancel'
        },
        {
          text: 'Du plus proche au plus lointain',
          handler: () => {
            this.calculateOptimizedRoute('nearest_first');
          }
        },
        {
          text: 'Du plus lointain au plus proche',
          handler: () => {
            this.calculateOptimizedRoute('farthest_first');
          }
        },
        {
          text: 'Optimisation Google Maps',
          handler: () => {
            this.calculateOptimizedRoute('google_optimize');
          }
        }
      ]
    });

    await alert.present();
  }

  /**
   * Calcule et affiche l'itinéraire optimal pour les livraisons
   * @param sortMethod Méthode de tri: 'nearest_first', 'farthest_first', ou 'google_optimize'
   * @private
   */
  private async calculateOptimizedRoute(sortMethod: 'nearest_first' | 'farthest_first' | 'google_optimize' = 'google_optimize') {
    const ordersToDeliver = this.orders.filter(order => 
      order.id_statut_commande === 2 || order.id_statut_commande === 3
    );
    
    if (ordersToDeliver.length === 0) {
      this.showToast('Aucune commande à livrer pour le moment');
      return;
    }

    const loading = await this.loadingCtrl.create({
      message: 'Préparation de votre itinéraire...',
      spinner: 'circles'
    });
    await loading.present();

    try {
      if (sortMethod === 'nearest_first' || sortMethod === 'farthest_first') {
        try {
      let deliveryLocations = ordersToDeliver.map(order => {
        return {
          order: order,
          address: `${order.adresse}, ${order.code_postal} ${order.ville}, France`,
          latitude: order.latitude || null,
          longitude: order.longitude || null
        };
      });
      
          deliveryLocations = await this.sortLocationsByDistance(
            "Position actuelle", 
            deliveryLocations, 
            sortMethod === 'farthest_first'
          );
          
          ordersToDeliver.length = 0;
          deliveryLocations.forEach(loc => {
            ordersToDeliver.push(loc.order);
          });
        } catch (error) {
          console.error('Erreur lors du tri des adresses:', error);
          this.showToast('Impossible de trier par distance. Utilisation des adresses non triées.');
        }
      }
      
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const currentLatitude = position.coords.latitude;
            const currentLongitude = position.coords.longitude;
            
            console.log(`Position actuelle: Lat ${currentLatitude}, Long ${currentLongitude}`);
            let url = 'https://www.google.com/maps/dir/Current+Location/';
            
            for (const order of ordersToDeliver) {
              const address = `${order.adresse}, ${order.code_postal} ${order.ville}`;
              url += encodeURIComponent(address) + '/';
            }
            
            if (sortMethod === 'google_optimize') {
              url += '?optimize=true';
            }
            
            console.log('URL de navigation Maps: ' + url);
            
            await loading.dismiss();
            
            const mapWindow = window.open(url, '_blank');
            
            if (!mapWindow || mapWindow.closed || typeof mapWindow.closed === 'undefined') {
              console.error('Impossible d\'ouvrir la fenêtre Maps. Blocage de popup possible.');
              
              const confirmRedirect = confirm('Pour ouvrir l\'itinéraire dans Google Maps, cliquez sur OK');
              if (confirmRedirect) {
                window.location.href = url;
              }
            }
            
            let methodText = '';
            switch(sortMethod) {
              case 'nearest_first': methodText = 'du plus proche au plus lointain'; break;
              case 'farthest_first': methodText = 'du plus lointain au plus proche'; break;
              case 'google_optimize': methodText = 'optimisée par Google Maps'; break;
            }
            
            this.showToast(`Tournée ${methodText} pour ${ordersToDeliver.length} livraisons depuis votre position actuelle.`);
          } catch (error) {
            await loading.dismiss();
            console.error('Erreur lors de la création de l\'itinéraire:', error);
            this.showToast('Impossible de créer l\'itinéraire. Veuillez réessayer.');
          }
        },
        async (error) => {
          await loading.dismiss();
          console.error('Erreur de géolocalisation:', error);
          
          const confirmFallback = await this.alertCtrl.create({
            header: 'Position non disponible',
            message: 'Impossible d\'accéder à votre position actuelle. Voulez-vous créer l\'itinéraire à partir du restaurant?',
            buttons: [
              {
                text: 'Annuler',
                role: 'cancel'
              },
              {
                text: 'Oui, utiliser le restaurant',
                handler: () => {
                  this.createRouteFromRestaurant(ordersToDeliver, sortMethod);
                }
              }
            ]
          });
          
          await confirmFallback.present();
        },
        { 
          enableHighAccuracy: true, 
          timeout: 10000, 
          maximumAge: 0 
        }
      );
      
    } catch (error) {
      await loading.dismiss();
      console.error('Erreur lors de la création de l\'itinéraire:', error);
      this.showToast('Impossible de créer l\'itinéraire. Veuillez réessayer.');
    }
  }
  

  private createRouteFromRestaurant(ordersToDeliver: any[], sortMethod: 'nearest_first' | 'farthest_first' | 'google_optimize') {
    try {
      const restaurantAddress = "Mite et Zard Restaurant";
      
      let url = 'https://www.google.com/maps/dir/';
      
      url += encodeURIComponent(restaurantAddress) + '/';
      
      for (const order of ordersToDeliver) {
        const address = `${order.adresse}, ${order.code_postal} ${order.ville}`;
        url += encodeURIComponent(address) + '/';
      }
      
      if (sortMethod === 'google_optimize') {
        url += '?optimize=true';
      }
      
      console.log('URL de navigation Maps (depuis restaurant):', url);
      
      const mapWindow = window.open(url, '_blank');
      
      if (!mapWindow || mapWindow.closed || typeof mapWindow.closed === 'undefined') {
        const confirmRedirect = confirm('Pour ouvrir l\'itinéraire dans Google Maps, cliquez sur OK');
        if (confirmRedirect) {
          window.location.href = url;
        }
      }
      
      let methodText = '';
      switch(sortMethod) {
        case 'nearest_first': methodText = 'du plus proche au plus lointain'; break;
        case 'farthest_first': methodText = 'du plus lointain au plus proche'; break;
        case 'google_optimize': methodText = 'optimisée par Google Maps'; break;
      }
      
      this.showToast(`Tournée ${methodText} pour ${ordersToDeliver.length} livraisons depuis le restaurant.`);
      
    } catch (error) {
      console.error('Erreur lors de la création de l\'itinéraire alternatif:', error);
      this.showToast('Impossible de créer l\'itinéraire. Veuillez réessayer.');
    }
  }
  
  async showAlert(header: string, message: string) {
    const alert = await this.alertCtrl.create({
      header: header,
      message: message,
      buttons: ['OK']
    });
    await alert.present();
  }

  async sortLocationsByDistance(origin: string, locations: any[], farthestFirst: boolean = false): Promise<any[]> {
    try {
      const API_KEY = 'd4b02ec978624faf829df351918300e6';
      const originResponse = await axios.get(`https://api.opencagedata.com/geocode/v1/json`, {
        params: {
          q: origin,
          key: API_KEY,
          limit: 1
        }
      });
      
      if (!originResponse.data.results || originResponse.data.results.length === 0) {
        throw new Error('Impossible de géocoder l\'adresse d\'origine');
      }
      
      const originCoords = {
        lat: originResponse.data.results[0].geometry.lat,
        lng: originResponse.data.results[0].geometry.lng
      };
      
      const locationsWithDistance = await Promise.all(locations.map(async (loc) => {
        if (loc.latitude && loc.longitude) {
          const distance = this.calculateDistance(
            originCoords.lat, originCoords.lng,
            loc.latitude, loc.longitude
          );
          return { ...loc, distance };
        }
        
        try {
          const response = await axios.get(`https://api.opencagedata.com/geocode/v1/json`, {
            params: {
              q: loc.address,
              key: API_KEY,
              limit: 1
            }
          });
          
          if (response.data.results && response.data.results.length > 0) {
            const coords = response.data.results[0].geometry;
            const distance = this.calculateDistance(
              originCoords.lat, originCoords.lng,
              coords.lat, coords.lng
            );
            
            return { 
              ...loc, 
              latitude: coords.lat, 
              longitude: coords.lng, 
              distance 
            };
          } else {
            return { ...loc, distance: 99999 };
          }
        } catch (error) {
          console.error(`Erreur de géocodage pour ${loc.address}:`, error);
          return { ...loc, distance: 99999 };
        }
      }));
      
      return locationsWithDistance.sort((a, b) => {
        if (farthestFirst) {
          return b.distance - a.distance;
        } else {
          return a.distance - b.distance; 
        }
      });
    } catch (error) {
      console.error('Erreur lors du tri par distance:', error);
      return locations; 
    }
  }
  
  calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; 
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2); 
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
    const distance = R * c; 
    return distance;
  }
  
  deg2rad(deg: number): number {
    return deg * (Math.PI/180);
  }
} 