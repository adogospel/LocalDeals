export type Listing = {
  id: string;
  sellerId?: string;
  title: string;
  price: number;
  imageUrl: string;
  imageUrls?: string[];
  category: string;
  categoryId?: number;
  categorySlug?: string;
  condition: string;
  conditionCode?: 'new' | 'like_new' | 'good' | 'fair';
  status?: 'draft' | 'published' | 'reserved' | 'sold' | 'archived';
  city: string;
  neighborhood: string;
  postedLabel: string;
  createdAt?: string;
  description: string;
  isFavorite?: boolean;
  seller: {
    id?: string;
    name: string;
    avatarPath?: string | null;
    rating: number;
    reviews: number;
    sales: number;
    responseTime: string;
  };
};

export const listings: Listing[] = [
  {
    id: 'iphone-13-pro',
    categoryId: 1,
    categorySlug: 'telephones',
    conditionCode: 'good',
    status: 'published',
    createdAt: '2026-08-31T11:48:00.000Z',
    title: 'iPhone 13 Pro · 256 Go',
    price: 345000,
    imageUrl: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=900&q=85',
    category: 'Téléphones',
    condition: 'Très bon état',
    city: 'Douala',
    neighborhood: 'Bonapriso',
    postedLabel: 'Il y a 12 min',
    description: 'iPhone 13 Pro très bien entretenu, batterie à 88 %. Livré avec sa boîte, un câble et deux coques. Aucun échange, remise en main propre à Douala.',
    seller: { name: 'Kevin M.', rating: 4.9, reviews: 38, sales: 24, responseTime: 'Répond en moins de 10 min' },
  },
  {
    id: 'nike-air-max',
    categoryId: 4,
    categorySlug: 'mode',
    conditionCode: 'like_new',
    status: 'published',
    createdAt: '2026-08-31T11:25:00.000Z',
    title: 'Nike Air Max 270',
    price: 42000,
    imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=85',
    category: 'Mode',
    condition: 'Comme neuf',
    city: 'Yaoundé',
    neighborhood: 'Bastos',
    postedLabel: 'Il y a 35 min',
    description: 'Paire authentique portée deux fois seulement. Pointure 42, aucune trace notable et boîte d’origine disponible.',
    seller: { name: 'Sonia K.', rating: 4.8, reviews: 21, sales: 17, responseTime: 'Répond généralement en 20 min' },
  },
  {
    id: 'fauteuil-scandinave',
    categoryId: 5,
    categorySlug: 'maison',
    conditionCode: 'good',
    status: 'published',
    createdAt: '2026-08-31T11:00:00.000Z',
    title: 'Fauteuil scandinave',
    price: 55000,
    imageUrl: 'https://images.unsplash.com/photo-1503602642458-232111445657?auto=format&fit=crop&w=900&q=85',
    category: 'Maison',
    condition: 'Bon état',
    city: 'Douala',
    neighborhood: 'Bonamoussadi',
    postedLabel: 'Il y a 1 h',
    description: 'Fauteuil confortable en bois massif avec assise beige. Idéal pour salon, chambre ou coin lecture. À récupérer sur place.',
    seller: { name: 'Grâce T.', rating: 5, reviews: 12, sales: 9, responseTime: 'Répond en moins de 30 min' },
  },
  {
    id: 'canon-eos',
    categoryId: 3,
    categorySlug: 'electronique',
    conditionCode: 'good',
    status: 'published',
    createdAt: '2026-08-31T10:00:00.000Z',
    title: 'Canon EOS 250D',
    price: 285000,
    imageUrl: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=900&q=85',
    category: 'Électronique',
    condition: 'Très bon état',
    city: 'Bafoussam',
    neighborhood: 'Centre-ville',
    postedLabel: 'Il y a 2 h',
    description: 'Appareil photo reflex avec objectif 18-55 mm, batterie, chargeur et sac de transport. Parfait pour débuter la photo et la vidéo.',
    seller: { name: 'Landry P.', rating: 4.7, reviews: 31, sales: 19, responseTime: 'Répond dans l’heure' },
  },
  {
    id: 'macbook-air',
    categoryId: 2,
    categorySlug: 'informatique',
    conditionCode: 'like_new',
    status: 'published',
    createdAt: '2026-08-31T09:00:00.000Z',
    title: 'MacBook Air M1',
    price: 475000,
    imageUrl: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=900&q=85',
    category: 'Informatique',
    condition: 'Excellent état',
    city: 'Yaoundé',
    neighborhood: 'Mvan',
    postedLabel: 'Aujourd’hui',
    description: 'MacBook Air M1, 8 Go de RAM et SSD 256 Go. Cycle batterie faible, chargeur original inclus. Utilisé principalement pour les études.',
    seller: { name: 'Yann E.', rating: 4.9, reviews: 44, sales: 28, responseTime: 'Répond en moins de 15 min' },
  },
  {
    id: 'sac-cuir',
    categoryId: 4,
    categorySlug: 'mode',
    conditionCode: 'like_new',
    status: 'published',
    createdAt: '2026-08-30T18:00:00.000Z',
    title: 'Sac à main en cuir',
    price: 28000,
    imageUrl: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=900&q=85',
    category: 'Accessoires',
    condition: 'Comme neuf',
    city: 'Douala',
    neighborhood: 'Akwa',
    postedLabel: 'Hier',
    description: 'Sac élégant en cuir brun, format quotidien avec plusieurs compartiments. Très peu utilisé et parfaitement propre.',
    seller: { name: 'Estelle N.', rating: 4.8, reviews: 18, sales: 14, responseTime: 'Répond en moins de 30 min' },
  },
];

export function getListingById(id: string): Listing | undefined {
  return listings.find((listing) => listing.id === id);
}

export function formatPrice(price: number): string {
  return `${new Intl.NumberFormat('fr-FR').format(price)} FCFA`;
}
