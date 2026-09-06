export function getErrorMessage(error: unknown): string {
  const code = typeof error === 'object' && error !== null && 'code' in error
    ? String(error.code)
    : '';
  const messages: Record<string, string> = {
    invalid_credentials: 'E-mail ou mot de passe incorrect.',
    email_not_confirmed: 'Confirmez votre adresse e-mail avant de vous connecter.',
    user_already_exists: 'Un compte utilise déjà cette adresse e-mail.',
    weak_password: 'Ce mot de passe ne respecte pas les critères de sécurité.',
    over_email_send_rate_limit: 'Trop de demandes. Patientez une minute avant de réessayer.',
    otp_expired: 'Ce code a expiré. Demandez-en un nouveau.',
    invalid_otp: 'Ce code est incorrect ou a expiré.',
    validation_failed: 'Certaines informations sont invalides. Vérifiez le formulaire.',
  };
  if (messages[code]) return messages[code];
  if (error instanceof TypeError && error.message.toLowerCase().includes('fetch')) {
    return 'Connexion au serveur impossible. Vérifiez votre réseau.';
  }
  if (error instanceof Error) return error.message;
  return 'Une erreur inattendue est survenue.';
}
