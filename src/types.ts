export interface Shout {
  id: string;
  authorType: 'customer' | 'employee';
  authorName: string;
  targetName: string;
  message: string;
  badge: string;
  likes: number;
  createdAt: string;
}

export interface DispatchLog {
  id: string;
  timestamp: string;
  text: string;
}

export interface ScreamResult {
  translatedText: string;
  drinkRecommendation: string;
  pulseSpeedHz: number;
  vibeMetrics: {
    panicPct: number;
    productivityPct: number;
    shakeFreq: string;
  };
}

export interface DonutDesign {
  baseType: 'classic' | 'chocolate' | 'yeast' | 'blueberry' | 'red_velvet' | 'maple' | 'filled_jelly' | 'filled_cream';
  glazeType: 'pink' | 'orange' | 'chocolate' | 'coconut' | 'vanilla' | 'maple' | 'matcha' | 'blueberry' | 'none';
  sprinklesType: 'rainbow' | 'orange' | 'pink' | 'chocolate' | 'pearls' | 'gold' | 'none';
  drizzleType?: 'chocolate' | 'vanilla' | 'caramel' | 'strawberry' | 'none';
  customToppings: string[]; // 'marshmallows', 'raccoon', 'coffee_beans', 'gold_foil', 'bacon', 'strawberries', 'blueberries', 'bananas', 'oreo'
  icingMessage: string;
  funnyReceiptTitle?: string;
  donutPrice?: string;
}

export interface CommunityDonut {
  id: string;
  creatorName: string;
  creatorEmail?: string | null;
  creatorPhone?: string | null;
  creatorCity?: string | null;
  creatorImage?: string | null;
  twitterHandle?: string | null;
  instagramHandle?: string | null;
  tiktokHandle?: string | null;
  design: DonutDesign;
  videoUrl?: string | null;
  likes: number;
  createdAt: string;
  status: 'pending' | 'approved' | 'rejected';
}

export interface NetlifyUser {
  id: string;
  displayName: string;
  avatarUrl?: string | null;
  email?: string;
}
