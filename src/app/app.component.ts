import { Component, HostListener, OnInit } from '@angular/core';
import { IonApp, IonRouterOutlet, IonIcon } from '@ionic/angular/standalone';
import { Platform } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { closeOutline, downloadOutline, shareOutline, squareOutline } from 'ionicons/icons';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: true,
  imports: [IonApp, IonRouterOutlet, IonIcon],
  providers: [Platform]
})
export class AppComponent implements OnInit {
  
  // Variables PWA
  deferredPrompt: any;
  mostrarModalPWA = false;
  esIOS = false;
  yaRechazado = false;

  constructor(private platform: Platform) {
    addIcons({ closeOutline, downloadOutline, shareOutline, squareOutline });
  }

  ngOnInit() {
    // Comprobar si es iOS (para mostrar instrucciones manuales de Share -> Add to Home Screen)
    this.esIOS = this.platform.is('ios') && !this.platform.is('pwa');

    // Verificar si el modal ya fue descartado en esta sesión o guardado en LocalStorage
    const pwaDescartado = localStorage.getItem('pwa_descartado');
    
    // Si es iOS, no hay evento beforeinstallprompt, mostramos el modal si no estamos en modo PWA y no lo descartó
    if (this.esIOS && !pwaDescartado && !this.estaEnModoStandalone()) {
      setTimeout(() => {
        this.mostrarModalPWA = true;
      }, 3000); // Esperamos 3s antes de molestar al usuario
    }
  }

  // Detectar si ya está instalada o corriendo en ventana propia
  estaEnModoStandalone(): boolean {
    return window.matchMedia('(display-mode: standalone)').matches || 
           (window.navigator as any).standalone === true;
  }

  // Interceptar el evento de instalación nativo en Chrome/Android
  @HostListener('window:beforeinstallprompt', ['$event'])
  onbeforeinstallprompt(e: Event) {
    e.preventDefault(); // Prevenir que el navegador muestre su propio mini-banner
    this.deferredPrompt = e; // Guardar el evento

    const pwaDescartado = localStorage.getItem('pwa_descartado');
    if (!pwaDescartado) {
      this.mostrarModalPWA = true; // Mostrar nuestro hermoso modal
    }
  }

  async instalarPWA() {
    if (this.deferredPrompt) {
      // Mostrar el prompt nativo
      this.deferredPrompt.prompt();
      
      // Esperar la respuesta del usuario
      const { outcome } = await this.deferredPrompt.userChoice;
      console.log(`User choice: ${outcome}`);
      
      // Limpiar el evento
      this.deferredPrompt = null;
      this.cerrarModal();
    }
  }

  cerrarModal() {
    this.mostrarModalPWA = false;
    this.yaRechazado = true;
    localStorage.setItem('pwa_descartado', 'true');
  }
}
