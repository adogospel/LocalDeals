export type AppLanguage = 'fr' | 'en';
export type ListingCondition = 'new' | 'like_new' | 'good' | 'fair';
export type ListingStatus = 'draft' | 'published' | 'reserved' | 'sold' | 'archived';
export type MessageKind = 'text' | 'offer' | 'system';
export type OfferStatus = 'pending' | 'accepted' | 'declined' | 'cancelled';
export type DealStatus = 'pending_handover' | 'completed' | 'cancelled';
export type NotificationKind = 'message' | 'offer_received' | 'offer_accepted' | 'offer_declined' | 'deal_created' | 'deal_confirmed' | 'deal_completed' | 'deal_cancelled' | 'review_received';
export type ReportReason = 'scam' | 'prohibited_item' | 'harassment' | 'spam' | 'counterfeit' | 'other';
export type ReportStatus = 'open' | 'reviewing' | 'resolved' | 'dismissed';

export type City = {
  id: number;
  name: string;
  slug: string;
  region: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
};

export type Neighborhood = {
  id: number;
  city_id: number;
  name: string;
  slug: string;
  is_active: boolean;
  created_at: string;
};

export type Profile = {
  id: string;
  display_name: string | null;
  avatar_path: string | null;
  city: string | null;
  neighborhood: string | null;
  city_id: number | null;
  neighborhood_id: number | null;
  custom_city: string | null;
  custom_neighborhood: string | null;
  preferred_language: AppLanguage;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
};

export type Category = {
  id: number;
  slug: string;
  label_fr: string;
  label_en: string;
  symbol: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
};

export type Listing = {
  id: string;
  seller_id: string;
  category_id: number;
  title: string;
  description: string;
  price: number;
  condition: ListingCondition;
  status: ListingStatus;
  city_id: number | null;
  neighborhood_id: number | null;
  custom_city: string | null;
  custom_neighborhood: string | null;
  city: string;
  neighborhood: string;
  search_vector: string;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ListingImage = {
  id: string;
  listing_id: string;
  storage_path: string;
  position: number;
  width: number | null;
  height: number | null;
  created_at: string;
};

export type Favorite = {
  user_id: string;
  listing_id: string;
  created_at: string;
};

export type Conversation = {
  id: string;
  listing_id: string;
  buyer_id: string;
  seller_id: string;
  buyer_last_read_at: string | null;
  seller_last_read_at: string | null;
  last_message_at: string;
  created_at: string;
  updated_at: string;
};

export type Offer = {
  id: string;
  conversation_id: string;
  listing_id: string;
  buyer_id: string;
  seller_id: string;
  amount: number;
  status: OfferStatus;
  responded_at: string | null;
  created_at: string;
  updated_at: string;
};

export type Message = {
  id: string;
  conversation_id: string;
  sender_id: string | null;
  kind: MessageKind;
  body: string | null;
  offer_id: string | null;
  created_at: string;
};

export type Deal = {
  id: string;
  listing_id: string;
  conversation_id: string;
  offer_id: string;
  buyer_id: string;
  seller_id: string;
  amount: number;
  status: DealStatus;
  buyer_confirmed_at: string | null;
  seller_confirmed_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  cancelled_by: string | null;
  created_at: string;
  updated_at: string;
};

export type Review = {
  id: string;
  deal_id: string;
  author_id: string;
  subject_id: string;
  score: number;
  comment: string | null;
  created_at: string;
};

export type Notification = {
  id: string;
  recipient_id: string;
  actor_id: string | null;
  kind: NotificationKind;
  listing_id: string | null;
  conversation_id: string | null;
  deal_id: string | null;
  review_id: string | null;
  title: string;
  body: string;
  read_at: string | null;
  created_at: string;
};

export type Report = {
  id: string;
  reporter_id: string;
  reported_user_id: string | null;
  listing_id: string | null;
  message_id: string | null;
  reason: ReportReason;
  details: string | null;
  status: ReportStatus;
  created_at: string;
  updated_at: string;
};

type CityInsert = {
  id?: number;
  name: string;
  slug: string;
  region: string;
  sort_order?: number;
  is_active?: boolean;
  created_at?: string;
};

type NeighborhoodInsert = {
  id?: number;
  city_id: number;
  name: string;
  slug: string;
  is_active?: boolean;
  created_at?: string;
};

type CategoryInsert = Omit<Category, 'id' | 'created_at'> & {
  id?: number;
  created_at?: string;
};

type ListingInsert = Omit<Listing, 'id' | 'search_vector' | 'published_at' | 'created_at' | 'updated_at'> & {
  id?: string;
  published_at?: string | null;
  created_at?: string;
  updated_at?: string;
};

type ListingImageInsert = Omit<ListingImage, 'id' | 'created_at'> & {
  id?: string;
  created_at?: string;
};

export type Database = {
  public: {
    Tables: {
      categories: {
        Row: Category;
        Insert: CategoryInsert;
        Update: Partial<Omit<Category, 'id' | 'created_at'>>;
        Relationships: [];
      };
      cities: {
        Row: City;
        Insert: CityInsert;
        Update: Partial<CityInsert>;
        Relationships: [];
      };
      neighborhoods: {
        Row: Neighborhood;
        Insert: NeighborhoodInsert;
        Update: Partial<NeighborhoodInsert>;
        Relationships: [];
      };
      listings: {
        Row: Listing;
        Insert: ListingInsert;
        Update: Partial<Omit<Listing, 'id' | 'seller_id' | 'search_vector' | 'created_at'>>;
        Relationships: [];
      };
      listing_images: {
        Row: ListingImage;
        Insert: ListingImageInsert;
        Update: Partial<Omit<ListingImage, 'id' | 'listing_id' | 'created_at'>>;
        Relationships: [];
      };
      favorites: {
        Row: Favorite;
        Insert: Omit<Favorite, 'created_at'> & { created_at?: string };
        Update: never;
        Relationships: [];
      };
      conversations: {
        Row: Conversation;
        Insert: Omit<Conversation, 'id' | 'last_message_at' | 'created_at' | 'updated_at'> & {
          id?: string;
          last_message_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Pick<Conversation, 'buyer_last_read_at' | 'seller_last_read_at' | 'last_message_at' | 'updated_at'>>;
        Relationships: [];
      };
      offers: {
        Row: Offer;
        Insert: Omit<Offer, 'id' | 'status' | 'responded_at' | 'created_at' | 'updated_at'> & {
          id?: string;
          status?: OfferStatus;
          responded_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Pick<Offer, 'status' | 'responded_at' | 'updated_at'>>;
        Relationships: [];
      };
      messages: {
        Row: Message;
        Insert: Omit<Message, 'id' | 'created_at'> & { id?: string; created_at?: string };
        Update: never;
        Relationships: [];
      };
      deals: {
        Row: Deal;
        Insert: Omit<Deal, 'id' | 'status' | 'buyer_confirmed_at' | 'seller_confirmed_at' | 'completed_at' | 'cancelled_at' | 'cancelled_by' | 'created_at' | 'updated_at'> & Partial<Pick<Deal, 'id' | 'status' | 'buyer_confirmed_at' | 'seller_confirmed_at' | 'completed_at' | 'cancelled_at' | 'cancelled_by' | 'created_at' | 'updated_at'>>;
        Update: Partial<Pick<Deal, 'status' | 'buyer_confirmed_at' | 'seller_confirmed_at' | 'completed_at' | 'cancelled_at' | 'cancelled_by' | 'updated_at'>>;
        Relationships: [];
      };
      reviews: {
        Row: Review;
        Insert: Omit<Review, 'id' | 'created_at'> & { id?: string; created_at?: string };
        Update: never;
        Relationships: [];
      };
      notifications: {
        Row: Notification;
        Insert: Omit<Notification, 'id' | 'read_at' | 'created_at'> & { id?: string; read_at?: string | null; created_at?: string };
        Update: Partial<Pick<Notification, 'read_at'>>;
        Relationships: [];
      };
      reports: {
        Row: Report;
        Insert: Omit<Report, 'id' | 'status' | 'created_at' | 'updated_at'> & { id?: string; status?: ReportStatus; created_at?: string; updated_at?: string };
        Update: Partial<Pick<Report, 'status' | 'updated_at'>>;
        Relationships: [];
      };
      profiles: {
        Row: Profile;
        Insert: {
          id: string;
          display_name?: string | null;
          avatar_path?: string | null;
          city?: string | null;
          neighborhood?: string | null;
          city_id?: number | null;
          neighborhood_id?: number | null;
          custom_city?: string | null;
          custom_neighborhood?: string | null;
          preferred_language?: AppLanguage;
          onboarding_completed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<Profile, 'id' | 'created_at'>>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      cancel_conversation_offer: { Args: { p_offer_id: string }; Returns: undefined };
      create_conversation_offer: { Args: { p_amount: number; p_conversation_id: string }; Returns: string };
      get_or_create_conversation: { Args: { p_listing_id: string }; Returns: string };
      mark_conversation_read: { Args: { p_conversation_id: string }; Returns: undefined };
      respond_to_conversation_offer: { Args: { p_accept: boolean; p_offer_id: string }; Returns: undefined };
      send_conversation_message: { Args: { p_body: string; p_conversation_id: string }; Returns: string };
      cancel_deal: { Args: { p_deal_id: string }; Returns: undefined };
      confirm_deal_handover: { Args: { p_deal_id: string }; Returns: undefined };
      mark_all_notifications_read: { Args: Record<PropertyKey, never>; Returns: undefined };
      mark_notification_read: { Args: { p_notification_id: string }; Returns: undefined };
      submit_deal_review: { Args: { p_comment?: string | null; p_deal_id: string; p_score: number }; Returns: string };
      submit_report: { Args: { p_details?: string | null; p_reason: ReportReason; p_target_id: string; p_target_type: string }; Returns: string };
      get_public_profile_stats: { Args: { p_user_id: string }; Returns: { average_rating: number; completed_sales: number; review_count: number }[] };
    };
    Enums: {
      app_language: AppLanguage;
      listing_condition: ListingCondition;
      listing_status: ListingStatus;
      message_kind: MessageKind;
      offer_status: OfferStatus;
      deal_status: DealStatus;
      notification_kind: NotificationKind;
      report_reason: ReportReason;
      report_status: ReportStatus;
    };
    CompositeTypes: Record<string, never>;
  };
};
