/**
 * Auth page — Login / Register
 */

import { supabase } from '../lib/supabase.js';
import { showToast } from '../components/toast.js';
import { navigate } from '../utils/router.js';

export async function renderAuth(container) {
  let isLogin = true;
  let loading = false;

  function render() {
    container.innerHTML = `
      <div class="auth-container">
        <div class="auth-card glass-card animate-in">
          <div class="auth-logo">
            <span class="auth-logo-icon">💊</span>
            <div class="auth-logo-text">MediControl</div>
            <p class="auth-logo-sub">Tu control diario de medicamentos</p>
          </div>

          <div id="auth-error-box"></div>

          <form class="auth-form" id="auth-form">
            ${!isLogin ? `
              <div class="form-group">
                <label class="form-label" for="auth-name">Nombre completo</label>
                <input class="form-input" type="text" id="auth-name" 
                       placeholder="Tu nombre" autocomplete="name" />
              </div>
            ` : ''}

            <div class="form-group">
              <label class="form-label" for="auth-email">Correo electrónico</label>
              <input class="form-input" type="email" id="auth-email" 
                     placeholder="tu@email.com" autocomplete="email" required />
            </div>

            <div class="form-group">
              <label class="form-label" for="auth-password">Contraseña</label>
              <input class="form-input" type="password" id="auth-password" 
                     placeholder="${isLogin ? 'Tu contraseña' : 'Mínimo 6 caracteres'}" 
                     autocomplete="${isLogin ? 'current-password' : 'new-password'}" 
                     minlength="6" required />
            </div>

            <button type="submit" class="btn btn--primary btn--lg btn--block" id="auth-submit">
              ${loading ? '<span class="spinner"></span>' : (isLogin ? 'Iniciar Sesión' : 'Crear Cuenta')}
            </button>
          </form>

          <div class="auth-toggle">
            ${isLogin 
              ? '¿No tienes cuenta? <button id="toggle-auth">Regístrate</button>'
              : '¿Ya tienes cuenta? <button id="toggle-auth">Inicia sesión</button>'
            }
          </div>
        </div>
      </div>
    `;

    // Bind events
    document.getElementById('auth-form')?.addEventListener('submit', handleSubmit);
    document.getElementById('toggle-auth')?.addEventListener('click', () => {
      isLogin = !isLogin;
      render();
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (loading) return;

    const email = document.getElementById('auth-email').value.trim();
    const password = document.getElementById('auth-password').value;
    const errorBox = document.getElementById('auth-error-box');

    if (!email || !password) {
      errorBox.innerHTML = '<div class="auth-error">Completa todos los campos</div>';
      return;
    }

    loading = true;
    document.getElementById('auth-submit').innerHTML = '<span class="spinner"></span>';

    try {
      let result;

      if (isLogin) {
        result = await supabase.auth.signInWithPassword({ email, password });
      } else {
        const name = document.getElementById('auth-name')?.value?.trim() || '';
        result = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: name }
          }
        });
      }

      if (result.error) {
        const msg = translateError(result.error.message);
        errorBox.innerHTML = `<div class="auth-error">${msg}</div>`;
        loading = false;
        render();
        return;
      }

      if (!isLogin && result.data?.user && !result.data?.session) {
        showToast('Revisa tu correo para confirmar tu cuenta', 'info', 5000);
        isLogin = true;
        loading = false;
        render();
        return;
      }

      showToast(isLogin ? '¡Bienvenido de vuelta!' : '¡Cuenta creada exitosamente!', 'success');
      navigate('/dashboard');
    } catch (err) {
      errorBox.innerHTML = `<div class="auth-error">Error inesperado. Intenta de nuevo.</div>`;
      loading = false;
      render();
    }
  }

  render();
}

function translateError(msg) {
  const map = {
    'Invalid login credentials': 'Correo o contraseña incorrectos',
    'User already registered': 'Este correo ya está registrado',
    'Password should be at least 6 characters': 'La contraseña debe tener al menos 6 caracteres',
    'Unable to validate email address: invalid format': 'Formato de correo inválido',
    'Email rate limit exceeded': 'Demasiados intentos. Espera un momento.',
    'Signup requires a valid password': 'Ingresa una contraseña válida',
  };
  return map[msg] || msg;
}
