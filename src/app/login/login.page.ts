import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonContent,
  IonIcon,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  walletOutline,
  chevronBackOutline,
  mailOutline,
  lockClosedOutline,
  eyeOutline,
  eyeOffOutline,
  personOutline,
  logoApple,
  checkmarkCircleOutline,
  alertCircleOutline,
} from 'ionicons/icons';
import { SupabaseServicio } from '../servicios/supabase.servicio';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: true,
  imports: [
    IonContent,
    IonIcon,
    CommonModule,
    FormsModule,
  ],
})
export class LoginPage {

  tabActivo: 'login' | 'registro' = 'login';

  // Login
  loginEmail = '';
  loginPassword = '';
  mostrarPassword = false;

  // Registro
  regNombre = '';
  regEmail = '';
  regPassword = '';
  regConfirmar = '';
  mostrarConfirmar = false;
  aceptaTerminos = false;
  fuerzaPassword = 0;
  textoFuerza = '';

  // Estado
  cargando = false;
  errores: { [key: string]: string } = {};

  // Toast
  mostrarToast = false;
  toastExito = false;
  mensajeToast = '';

  constructor(
    private router: Router,
    private supabase: SupabaseServicio
  ) {
    addIcons({
      walletOutline,
      chevronBackOutline,
      mailOutline,
      lockClosedOutline,
      eyeOutline,
      eyeOffOutline,
      personOutline,
      logoApple,
      checkmarkCircleOutline,
      alertCircleOutline,
    });
  }

  cambiarTab(tab: 'login' | 'registro') {
    this.tabActivo = tab;
    this.errores = {};
  }

  volver() {
    this.router.navigate(['/home']);
  }

  togglePassword() {
    this.mostrarPassword = !this.mostrarPassword;
  }

  toggleConfirmar() {
    this.mostrarConfirmar = !this.mostrarConfirmar;
  }

  limpiarError(campo: string) {
    delete this.errores[campo];
  }

  verificarPassword() {
    const p = this.regPassword;
    let fuerza = 0;
    if (p.length >= 8) fuerza++;
    if (/[A-Z]/.test(p) || /[a-z]/.test(p)) fuerza++;
    if (/[0-9]/.test(p) && /[^a-zA-Z0-9]/.test(p)) fuerza++;
    this.fuerzaPassword = fuerza;
    if (fuerza === 1) this.textoFuerza = 'Débil';
    else if (fuerza === 2) this.textoFuerza = 'Media';
    else if (fuerza >= 3) this.textoFuerza = 'Fuerte';
  }

  // =====================================
  // INICIAR SESIÓN CON SUPABASE
  // =====================================
  async iniciarSesion() {
    this.errores = {};
    let valido = true;

    if (!this.loginEmail || !this.loginEmail.includes('@')) {
      this.errores['email'] = 'Ingresa un correo válido';
      valido = false;
    }

    if (!this.loginPassword || this.loginPassword.length < 6) {
      this.errores['password'] = 'La contraseña debe tener al menos 6 caracteres';
      valido = false;
    }

    if (!valido) return;

    this.cargando = true;

    try {
      await this.supabase.iniciarSesion(this.loginEmail, this.loginPassword);
      this.mostrarMensaje('¡Bienvenido de vuelta!', true);
      setTimeout(() => this.router.navigate(['/home']), 1500);
    } catch (error: any) {
      const msg = this.traducirError(error.message);
      this.mostrarMensaje(msg, false);
    } finally {
      this.cargando = false;
    }
  }

  // =====================================
  // REGISTRARSE CON SUPABASE
  // =====================================
  async registrarse() {
    this.errores = {};
    let valido = true;

    if (!this.regNombre || this.regNombre.trim().length < 2) {
      this.errores['nombre'] = 'Ingresa tu nombre completo';
      valido = false;
    }

    if (!this.regEmail || !this.regEmail.includes('@')) {
      this.errores['regEmail'] = 'Ingresa un correo válido';
      valido = false;
    }

    if (!this.regPassword || this.regPassword.length < 8) {
      this.errores['regPassword'] = 'La contraseña debe tener al menos 8 caracteres';
      valido = false;
    }

    if (this.regConfirmar !== this.regPassword) {
      this.errores['confirmar'] = 'Las contraseñas no coinciden';
      valido = false;
    }

    if (!this.aceptaTerminos) {
      this.errores['terminos'] = 'Debes aceptar los términos y condiciones';
      valido = false;
    }

    if (!valido) return;

    this.cargando = true;

    try {
      await this.supabase.registrar(this.regEmail, this.regPassword, this.regNombre);
      this.mostrarMensaje('¡Cuenta creada! Revisa tu correo para confirmar.', true);
      setTimeout(() => {
        this.tabActivo = 'login';
        this.regNombre = '';
        this.regEmail = '';
        this.regPassword = '';
        this.regConfirmar = '';
        this.aceptaTerminos = false;
      }, 2000);
    } catch (error: any) {
      const msg = this.traducirError(error.message);
      this.mostrarMensaje(msg, false);
    } finally {
      this.cargando = false;
    }
  }

  // =====================================
  // OLVIDÉ MI CONTRASEÑA
  // =====================================
  async olvidastePassword() {
    if (!this.loginEmail || !this.loginEmail.includes('@')) {
      this.mostrarMensaje('Escribe tu correo arriba y luego pulsa aquí', false);
      return;
    }
    try {
      await this.supabase.restablecerPassword(this.loginEmail);
      this.mostrarMensaje('¡Revisa tu correo para restablecer tu contraseña!', true);
    } catch (error: any) {
      this.mostrarMensaje(this.traducirError(error.message), false);
    }
  }

  loginGoogle() {
    this.mostrarMensaje('Google login próximamente', false);
  }

  loginApple() {
    this.mostrarMensaje('Apple login próximamente', false);
  }

  // =====================================
  // TRADUCIR ERRORES DE SUPABASE
  // =====================================
  traducirError(mensaje: string): string {
    if (mensaje.includes('Invalid login credentials'))
      return 'Correo o contraseña incorrectos';
    if (mensaje.includes('Email not confirmed'))
      return 'Confirma tu correo antes de iniciar sesión';
    if (mensaje.includes('User already registered'))
      return 'Este correo ya está registrado';
    if (mensaje.includes('Password should be at least'))
      return 'La contraseña debe tener al menos 6 caracteres';
    if (mensaje.includes('Unable to validate email'))
      return 'El correo no es válido';
    return 'Ocurrió un error. Intenta de nuevo.';
  }

  mostrarMensaje(mensaje: string, exito: boolean) {
    this.mensajeToast = mensaje;
    this.toastExito = exito;
    this.mostrarToast = true;
    setTimeout(() => this.mostrarToast = false, 3500);
  }
}
