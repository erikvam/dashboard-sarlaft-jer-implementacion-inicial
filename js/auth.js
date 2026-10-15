(function () {
  'use strict';
  const authScreen = document.getElementById('auth-screen');
  const appShell = document.getElementById('app-shell');
  const message = document.getElementById('auth-message');
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');
  const showLogin = document.getElementById('show-login');
  const showRegister = document.getElementById('show-register');
  const resetButton = document.getElementById('reset-password');
  const signOutButton = document.getElementById('sign-out');
  let auth = null;
  let operationInProgress = false;
  let wasAuthenticated = false;

  function configIsReady() {
    const config = window.JER_FIREBASE_CONFIG;
    return config && config.apiKey && !String(config.apiKey).includes('PEGA_AQUI') && config.authDomain && !String(config.authDomain).includes('PEGA_AQUI') && config.projectId && !String(config.projectId).includes('PEGA_AQUI') && config.appId && !String(config.appId).includes('PEGA_AQUI');
  }
  function setMessage(text, kind) {
    message.textContent = text || '';
    message.className = 'auth-message' + (kind ? ' ' + kind : '');
  }
  function translateError(error) {
    const code = error && error.code ? error.code : '';
    const map = {
      'auth/invalid-email': 'El correo electrónico no tiene un formato válido.',
      'auth/user-disabled': 'Esta cuenta está deshabilitada. Contacta al administrador.',
      'auth/user-not-found': 'No existe una cuenta con ese correo. Puedes crear una cuenta.',
      'auth/wrong-password': 'La contraseña no es correcta.',
      'auth/invalid-credential': 'El correo o la contraseña no son correctos.',
      'auth/email-already-in-use': 'Ese correo ya tiene una cuenta. Inicia sesión.',
      'auth/weak-password': 'La contraseña es muy débil. Usa al menos 8 caracteres.',
      'auth/too-many-requests': 'Hubo demasiados intentos. Espera un momento antes de volver a intentarlo.',
      'auth/network-request-failed': 'No se pudo conectar con Firebase. Comprueba tu conexión.',
      'auth/operation-not-allowed': 'Activa el método Correo electrónico/Contraseña en Firebase Authentication.',
      'auth/invalid-api-key': 'La API key de Firebase no parece válida. Revisa js/firebase-config.js.'
    };
    return map[code] || (error && error.message) || 'Ocurrió un error de autenticación.';
  }
  function showTab(tab) {
    const register = tab === 'register';
    loginForm.hidden = register;
    registerForm.hidden = !register;
    showLogin.classList.toggle('active', !register);
    showRegister.classList.toggle('active', register);
    showLogin.setAttribute('aria-selected', String(!register));
    showRegister.setAttribute('aria-selected', String(register));
    setMessage('');
  }
  function showApp(user) {
    wasAuthenticated = true;
    authScreen.hidden = true;
    appShell.hidden = false;
    document.getElementById('signed-in-user').textContent = user.email || user.displayName || 'Usuario autenticado';
    window.JEREditor?.setEnabled(true);
    window.dispatchEvent(new CustomEvent('jer-authenticated', { detail: { user } }));
  }
  function showLoginScreen() {
    appShell.hidden = true;
    authScreen.hidden = false;
    document.getElementById('signed-in-user').textContent = '';
    if (window.JEREditor) window.JEREditor.setEnabled(false);
  }

  if (!configIsReady()) {
    setMessage('Falta configurar Firebase. Abre js/firebase-config.js y pega los valores de la aplicación web creada en Firebase Console.', 'error');
    loginForm.querySelector('button[type="submit"]').disabled = true;
    registerForm.querySelector('button[type="submit"]').disabled = true;
  } else if (!window.firebase || !window.firebase.auth) {
    setMessage('No se pudo cargar el SDK de Firebase. Revisa la conexión y los scripts del encabezado.', 'error');
  } else {
    try {
      if (!firebase.apps.length) firebase.initializeApp(window.JER_FIREBASE_CONFIG);
      auth = firebase.auth();
      auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL).catch((error) => console.warn('Persistencia Firebase:', error));
      auth.onAuthStateChanged((user) => {
        if (operationInProgress) return;
        if (user) {
          if (user.emailVerified) showApp(user);
          else {
            showLoginScreen();
            setMessage('Tu correo no está verificado. Abre el enlace de verificación que Firebase envió a tu bandeja de entrada y luego inicia sesión.', 'error');
            auth.signOut().catch(() => {});
          }
        } else {
          showLoginScreen();
          if (wasAuthenticated) {
            wasAuthenticated = false;
            window.dispatchEvent(new CustomEvent('jer-logged-out'));
          }
        }
      });
    } catch (error) {
      setMessage('No se pudo inicializar Firebase: ' + translateError(error), 'error');
    }
  }

  showLogin.addEventListener('click', () => showTab('login'));
  showRegister.addEventListener('click', () => showTab('register'));

  loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!auth) return setMessage('Primero configura Firebase en js/firebase-config.js.', 'error');
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const submit = loginForm.querySelector('button[type="submit"]');
    submit.disabled = true; setMessage('Verificando credenciales…'); operationInProgress = true;
    try {
      const result = await auth.signInWithEmailAndPassword(email, password);
      if (!result.user.emailVerified) {
        try { await result.user.sendEmailVerification(); } catch (_) {}
        await auth.signOut();
        setMessage('Tu correo no está verificado. Te enviamos un enlace de verificación; revísalo y luego vuelve a iniciar sesión.', 'error');
      } else {
        showApp(result.user);
        setMessage('');
      }
    } catch (error) {
      setMessage(translateError(error), 'error');
    } finally { operationInProgress = false; submit.disabled = false; }
  });

  registerForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!auth) return setMessage('Primero configura Firebase en js/firebase-config.js.', 'error');
    const name = document.getElementById('register-name').value.trim();
    const email = document.getElementById('register-email').value.trim();
    const password = document.getElementById('register-password').value;
    const submit = registerForm.querySelector('button[type="submit"]');
    submit.disabled = true; setMessage('Creando la cuenta…'); operationInProgress = true;
    try {
      const result = await auth.createUserWithEmailAndPassword(email, password);
      if (name) await result.user.updateProfile({ displayName: name });
      await result.user.sendEmailVerification();
      await auth.signOut();
      showTab('login');
      setMessage('Cuenta creada. Revisa tu correo y confirma la dirección. Después podrás iniciar sesión; el acceso al informe requiere que el administrador autorice ese correo en Apps Script.', 'success');
      document.getElementById('login-email').value = email;
    } catch (error) {
      setMessage(translateError(error), 'error');
    } finally { operationInProgress = false; submit.disabled = false; }
  });

  resetButton.addEventListener('click', async () => {
    if (!auth) return setMessage('Primero configura Firebase en js/firebase-config.js.', 'error');
    const email = document.getElementById('login-email').value.trim();
    if (!email) return setMessage('Escribe primero tu correo en el campo de correo electrónico.', 'error');
    try {
      await auth.sendPasswordResetEmail(email);
      setMessage('Enviamos un enlace para restablecer tu contraseña. Revisa tu correo.', 'success');
    } catch (error) { setMessage(translateError(error), 'error'); }
  });

  signOutButton.addEventListener('click', async () => {
    if (!auth) return;
    try { await auth.signOut(); showLoginScreen(); setMessage('Sesión cerrada.', 'success'); }
    catch (error) { const banner = document.getElementById('status-banner'); banner.textContent = 'No se pudo cerrar sesión: ' + translateError(error); banner.className = 'status-banner error'; }
  });

  window.JERAuth = {
    get currentUser() { return auth ? auth.currentUser : null; },
    async getIdToken(forceRefresh) {
      if (!auth || !auth.currentUser) throw new Error('Inicia sesión para consultar el informe.');
      if (!auth.currentUser.emailVerified) throw new Error('Verifica tu correo electrónico antes de acceder.');
      return auth.currentUser.getIdToken(Boolean(forceRefresh));
    },
    async signOut() { if (auth) await auth.signOut(); }
  };
})();
