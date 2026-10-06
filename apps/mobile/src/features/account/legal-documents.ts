import type { AppLanguage, LegalDocumentType } from '@/types/database';

export const LEGAL_DOCUMENT_VERSION = '2026-10-05';
export const SIGN_UP_LEGAL_CONSENTS = {
  terms: LEGAL_DOCUMENT_VERSION,
  privacy: LEGAL_DOCUMENT_VERSION,
} as const;

type LegalSection = { title: string; paragraphs: string[] };

export type LegalDocumentContent = {
  title: string;
  summary: string;
  version: string;
  effectiveDate: string;
  sections: LegalSection[];
};

const documents: Record<AppLanguage, Record<LegalDocumentType, LegalDocumentContent>> = {
  fr: {
    privacy: {
      title: 'Politique de confidentialité',
      summary: 'Comment LocalDeals collecte, utilise, protège et supprime vos données.',
      version: LEGAL_DOCUMENT_VERSION,
      effectiveDate: '5 octobre 2026',
      sections: [
        {
          title: 'Données traitées',
          paragraphs: [
            'Nous traitons les informations de connexion, votre nom affiché, votre localisation déclarée, vos annonces, favoris, conversations, offres, transactions, avis et signalements.',
            'Les photos de profil et d’annonces sont stockées afin d’afficher votre contenu. Nous ne vendons pas vos données personnelles.',
          ],
        },
        {
          title: 'Pourquoi nous les utilisons',
          paragraphs: [
            'Ces données servent à créer votre compte, faire fonctionner la marketplace, sécuriser les échanges, prévenir les abus, répondre au support et respecter nos obligations.',
          ],
        },
        {
          title: 'Partage et hébergement',
          paragraphs: [
            'Les données sont traitées par nos prestataires techniques strictement nécessaires, notamment l’hébergement, l’authentification et le stockage Supabase. Les informations publiques sont limitées à ce que les autres membres doivent voir pour utiliser la marketplace.',
          ],
        },
        {
          title: 'Durée et suppression',
          paragraphs: [
            'Quand vous supprimez votre compte, l’identité de connexion, le profil, les préférences et les médias sont supprimés. Les éléments indispensables à une transaction sont anonymisés afin de préserver le dossier de l’autre participant.',
            'Les preuves minimales de sécurité et d’audit sont conservées au maximum 24 mois, puis purgées. Les sauvegardes techniques suivent le cycle de rétention de l’hébergeur.',
          ],
        },
        {
          title: 'Vos choix',
          paragraphs: [
            'Depuis Confidentialité et données, vous pouvez exporter vos informations ou supprimer votre compte. Vous pouvez aussi corriger votre profil directement dans l’application.',
            'Pour une question relative à vos données, écrivez à privacy@localdeals.cm.',
          ],
        },
        {
          title: 'Sécurité et mises à jour',
          paragraphs: [
            'Nous appliquons des contrôles d’accès par compte, des sessions sécurisées et une journalisation limitée des opérations sensibles. Si cette politique change de manière importante, une nouvelle version vous sera présentée avant de continuer.',
          ],
        },
      ],
    },
    terms: {
      title: 'Conditions d’utilisation',
      summary: 'Les règles essentielles pour acheter et vendre sur LocalDeals.',
      version: LEGAL_DOCUMENT_VERSION,
      effectiveDate: '5 octobre 2026',
      sections: [
        {
          title: 'Votre compte',
          paragraphs: [
            'Vous devez fournir des informations exactes, protéger votre accès et être légalement autorisé à utiliser le service. Vous êtes responsable des actions réalisées depuis votre compte.',
          ],
        },
        {
          title: 'Rôle de LocalDeals',
          paragraphs: [
            'LocalDeals met en relation des acheteurs et vendeurs locaux. Sauf indication explicite, LocalDeals n’est ni le vendeur, ni l’acheteur, ni le transporteur et ne détient pas les articles publiés.',
          ],
        },
        {
          title: 'Annonces et échanges',
          paragraphs: [
            'Vous ne pouvez publier que des biens que vous avez le droit de vendre. Les annonces doivent être exactes, licites et ne pas porter atteinte aux droits d’autrui.',
            'Les contenus frauduleux, dangereux, contrefaits, interdits ou trompeurs, ainsi que le harcèlement et le spam, sont interdits.',
          ],
        },
        {
          title: 'Sécurité des transactions',
          paragraphs: [
            'Inspectez l’article, privilégiez un lieu public et ne confirmez une remise qu’après l’échange réel. Chaque partie reste responsable de vérifier l’article, le prix et les conditions convenues.',
          ],
        },
        {
          title: 'Modération',
          paragraphs: [
            'Nous pouvons retirer un contenu ou limiter un compte qui enfreint ces règles, met la communauté en danger ou compromet le service. Les signalements sont examinés avec les informations disponibles.',
          ],
        },
        {
          title: 'Fin du compte',
          paragraphs: [
            'Vous pouvez supprimer votre compte dans l’application. Les conséquences sur vos données sont décrites dans la politique de confidentialité.',
            'Pour toute question sur ces conditions, écrivez à support@localdeals.cm.',
          ],
        },
      ],
    },
  },
  en: {
    privacy: {
      title: 'Privacy Policy',
      summary: 'How LocalDeals collects, uses, protects and deletes your data.',
      version: LEGAL_DOCUMENT_VERSION,
      effectiveDate: 'October 5, 2026',
      sections: [
        {
          title: 'Data we process',
          paragraphs: [
            'We process sign-in information, your display name, declared location, listings, favorites, conversations, offers, transactions, reviews and reports.',
            'Profile and listing photos are stored to display your content. We do not sell your personal data.',
          ],
        },
        {
          title: 'Why we use it',
          paragraphs: [
            'This data is used to create your account, operate the marketplace, secure exchanges, prevent abuse, provide support and meet our obligations.',
          ],
        },
        {
          title: 'Sharing and hosting',
          paragraphs: [
            'Data is processed by strictly necessary technical providers, including Supabase hosting, authentication and storage. Public information is limited to what other members need to use the marketplace.',
          ],
        },
        {
          title: 'Retention and deletion',
          paragraphs: [
            'When you delete your account, your sign-in identity, profile, preferences and media are deleted. Records required for a transaction are anonymized to preserve the other participant’s record.',
            'Minimum safety and audit evidence is retained for no longer than 24 months and then purged. Technical backups follow the host’s retention cycle.',
          ],
        },
        {
          title: 'Your choices',
          paragraphs: [
            'From Privacy and data, you can export your information or delete your account. You can also correct your profile directly in the app.',
            'For a data question, contact privacy@localdeals.cm.',
          ],
        },
        {
          title: 'Security and updates',
          paragraphs: [
            'We use account-scoped access controls, secure sessions and limited logging of sensitive operations. If this policy changes materially, you will be shown a new version before continuing.',
          ],
        },
      ],
    },
    terms: {
      title: 'Terms of Use',
      summary: 'The essential rules for buying and selling on LocalDeals.',
      version: LEGAL_DOCUMENT_VERSION,
      effectiveDate: 'October 5, 2026',
      sections: [
        {
          title: 'Your account',
          paragraphs: [
            'You must provide accurate information, protect your access and be legally allowed to use the service. You are responsible for actions performed through your account.',
          ],
        },
        {
          title: 'LocalDeals’ role',
          paragraphs: [
            'LocalDeals connects local buyers and sellers. Unless expressly stated, LocalDeals is not the seller, buyer or carrier and does not possess listed items.',
          ],
        },
        {
          title: 'Listings and exchanges',
          paragraphs: [
            'You may only list goods you have the right to sell. Listings must be accurate, lawful and respect the rights of others.',
            'Fraudulent, dangerous, counterfeit, prohibited or misleading content, harassment and spam are forbidden.',
          ],
        },
        {
          title: 'Transaction safety',
          paragraphs: [
            'Inspect the item, prefer a public place and confirm a handover only after the real exchange. Each party remains responsible for checking the item, price and agreed terms.',
          ],
        },
        {
          title: 'Moderation',
          paragraphs: [
            'We may remove content or restrict an account that violates these rules, puts the community at risk or compromises the service. Reports are reviewed using the information available.',
          ],
        },
        {
          title: 'Ending your account',
          paragraphs: [
            'You can delete your account in the app. The consequences for your data are described in the Privacy Policy.',
            'For questions about these terms, contact support@localdeals.cm.',
          ],
        },
      ],
    },
  },
};

export function getLegalDocument(
  type: LegalDocumentType,
  language: string,
): LegalDocumentContent {
  return documents[language === 'en' ? 'en' : 'fr'][type];
}
