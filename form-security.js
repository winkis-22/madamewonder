// ============================================
// form-security.js - Sécurisation des formulaires
// ============================================

(function() {
    'use strict';
    
    // Configuration
    const CONFIG = {
        MAX_SUBMISSIONS_PER_HOUR: 5,
        TIME_WINDOW: 60 * 60 * 1000, // 1 heure en millisecondes
        STORAGE_KEY: 'form_submissions'
    };
    
    // ========== 1. NETTOYAGE DES CARACTÈRES SPÉCIAUX ==========
    function sanitizeInput(str) {
        if (!str) return '';
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;')
            .replace(/`/g, '&#96;')
            .replace(/\//g, '&#47;')
            .replace(/\\/g, '&#92;')
            .replace(/javascript:/gi, 'blocked:')
            .replace(/onload=/gi, 'data-onload=')
            .replace(/onerror=/gi, 'data-onerror=')
            .replace(/onclick=/gi, 'data-onclick=');
    }
    
    // ========== 2. VALIDATION DES CHAMPS ==========
    function validateEmail(email) {
        const re = /^[^\s@]+@([^\s@]+\.)+[^\s@]+$/;
        return re.test(email);
    }
    
    function validatePhone(phone) {
        // Accepte: +243834732324, 0834732324, 243834732324
        const re = /^[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{4,12}$/;
        return re.test(phone);
    }
    
    function hasSuspiciousContent(str) {
        if (!str) return false;
        const suspicious = [
            /<script/i, /<\/script/i, /<iframe/i, /<object/i,
            /onclick/i, /onerror/i, /onload/i, /javascript:/i,
            /eval\(/i, /expression\(/i, /url\(/i
        ];
        return suspicious.some(pattern => pattern.test(str));
    }
    
    // ========== 3. RATE LIMITING (LOCALSTORAGE) ==========
    function checkRateLimit() {
        const now = Date.now();
        let submissions = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEY) || '[]');
        
        // Garder uniquement les soumissions des dernières heures
        submissions = submissions.filter(timestamp => now - timestamp < CONFIG.TIME_WINDOW);
        
        if (submissions.length >= CONFIG.MAX_SUBMISSIONS_PER_HOUR) {
            const oldest = submissions[0];
            const minutesToWait = Math.ceil((CONFIG.TIME_WINDOW - (now - oldest)) / 60000);
            return { allowed: false, minutesToWait };
        }
        
        return { allowed: true };
    }
    
    function recordSubmission() {
        const now = Date.now();
        let submissions = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEY) || '[]');
        submissions.push(now);
        // Garder seulement les dernières 24h maximum
        submissions = submissions.filter(t => now - t < 24 * 60 * 60 * 1000);
        localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(submissions));
    }
    
    // ========== 4. NETTOYAGE D'UN FORMULAIRE COMPLET ==========
    function sanitizeFormData(form) {
        const inputs = form.querySelectorAll('input, textarea');
        let hasError = false;
        let errorMessage = '';
        
        inputs.forEach(input => {
            // Ne pas nettoyer les champs cachés, submit, button
            if (input.type === 'hidden' || input.type === 'submit' || input.type === 'button') {
                return;
            }
            
            const originalValue = input.value;
            
            // Vérifier contenu suspect
            if (hasSuspiciousContent(originalValue)) {
                hasError = true;
                errorMessage = `Le champ "${input.name || input.id || 'inconnu'}" contient du contenu non autorisé.`;
                return;
            }
            
            // Nettoyer la valeur
            const cleanedValue = sanitizeInput(originalValue);
            if (cleanedValue !== originalValue) {
                input.value = cleanedValue;
            }
            
            // Validation spécifique selon le type de champ
            if (input.type === 'email' && input.value && !validateEmail(input.value)) {
                hasError = true;
                errorMessage = 'Veuillez entrer une adresse email valide.';
            }
            
            if (input.type === 'tel' && input.value && !validatePhone(input.value)) {
                hasError = true;
                errorMessage = 'Veuillez entrer un numéro de téléphone valide.';
            }
        });
        
        return { success: !hasError, error: errorMessage };
    }
    
    // ========== 5. VÉRIFICATION DU HONEYPOT ET TIMESTAMP ==========
    function checkHoneypot(form) {
        const honeypot = form.querySelector('[data-honeypot]');
        if (honeypot && honeypot.value !== '') {
            return false; // C'est un robot
        }
        return true;
    }
    
    function checkTimestamp(form) {
        const timestampField = form.querySelector('[data-timestamp]');
        if (!timestampField) return true;
        
        const submitTime = Date.now();
        const formLoadTime = parseInt(timestampField.value, 10);
        
        // Si le formulaire a été soumis en moins de 3 secondes, c'est suspect
        if (submitTime - formLoadTime < 3000) {
            return false;
        }
        return true;
    }
    
    // ========== 6. AFFICHAGE DES MESSAGES D'ERREUR ==========
    function showMessage(form, message, isError = true) {
        // Supprimer l'ancien message
        const oldMsg = form.querySelector('.form-security-message');
        if (oldMsg) oldMsg.remove();
        
        // Créer le nouveau message
        const msgDiv = document.createElement('div');
        msgDiv.className = `form-security-message ${isError ? 'error' : 'success'}`;
        msgDiv.textContent = message;
        msgDiv.style.cssText = `
            padding: 12px;
            margin: 15px 0;
            border-radius: 8px;
            text-align: center;
            font-weight: bold;
            ${isError ? 'background-color: #ffebee; color: #c62828; border: 1px solid #ef9a9a;' : 'background-color: #e8f5e9; color: #2e7d32; border: 1px solid #a5d6a7;'}
        `;
        
        // Insérer au début du formulaire
        form.insertBefore(msgDiv, form.firstChild);
        
        // Faire défiler jusqu'au message
        msgDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        // Disparaître après 5 secondes
        setTimeout(() => {
            if (msgDiv.parentNode) msgDiv.remove();
        }, 5000);
    }
    
    // ========== 7. GESTIONNAIRE PRINCIPAL ==========
    function setupFormSecurity(form) {
        // Ajouter timestamp si pas déjà présent
        if (!form.querySelector('[data-timestamp]')) {
            const timestampInput = document.createElement('input');
            timestampInput.type = 'hidden';
            timestampInput.setAttribute('data-timestamp', '');
            timestampInput.value = Date.now().toString();
            form.appendChild(timestampInput);
        }
        
        // Intercepter la soumission
        form.addEventListener('submit', function(e) {
            // 1. Vérifier le honeypot
            if (!checkHoneypot(form)) {
                e.preventDefault();
                console.log('Formulaire bloqué: honeypot détecté');
                // Rediriger silencieusement ou juste bloquer
                return false;
            }
            
            // 2. Vérifier le timestamp (anti-soumission rapide)
            if (!checkTimestamp(form)) {
                e.preventDefault();
                showMessage(form, 'Veuillez patienter quelques secondes avant de soumettre le formulaire.');
                return false;
            }
            
            // 3. Vérifier le rate limiting
            const rateLimit = checkRateLimit();
            if (!rateLimit.allowed) {
                e.preventDefault();
                showMessage(form, `Vous avez atteint la limite de ${CONFIG.MAX_SUBMISSIONS_PER_HOUR} soumissions par heure. Veuillez réessayer dans ${rateLimit.minutesToWait} minute(s).`);
                return false;
            }
            
            // 4. Nettoyer et valider les champs
            const sanitizeResult = sanitizeFormData(form);
            if (!sanitizeResult.success) {
                e.preventDefault();
                showMessage(form, sanitizeResult.error);
                return false;
            }
            
            // 5. Tout est OK, enregistrer la soumission
            recordSubmission();
            
            // Afficher un message de confirmation
            showMessage(form, 'Envoi en cours...', false);
            
            // Laisser le formulaire s'envoyer normalement vers Netlify
            return true;
        });
    }
    
    // ========== 8. INITIALISATION ==========
    // Attendre que le DOM soit chargé
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            const forms = document.querySelectorAll('form[data-netlify="true"]');
            forms.forEach(setupFormSecurity);
        });
    } else {
        const forms = document.querySelectorAll('form[data-netlify="true"]');
        forms.forEach(setupFormSecurity);
    }
    
    console.log('form-security.js chargé - Sécurité active');
})();