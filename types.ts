
// Serverdagi Prisma Enum bilan bir xil bo'lishi kerak
export enum UserRole {
  ADMIN = 'ADMIN',
  OPERATOR = 'OPERATOR',
  COURIER = 'COURIER',
  CASHIER = 'CASHIER'
}

export interface User {
  id: string;
  username: string;
  fullName: string;
  role: UserRole;
  password?: string;
  avatar?: string;
  createdAt?: string;
  status?: 'ACTIVE' | 'INACTIVE';
  telegramId?: string;
}

export interface DailyKPIRecord {
  id: string;
  operatorId: string;
  date: string;
  scriptScore: number;
  scriptComment: string;
  errorRate: number;
  errorComment: string;
  disciplineScore: number;
  disciplineComment: string;
}

export interface ConsolidatedKPI {
  scriptAvg: number;
  errorsAvg: number;
  disciplineAvg: number;
  speedAvg: number;
  orderCount: number;
  avgCheck: number;
  finalScore: number;
}

export enum PayoutStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  BLOCKED = 'BLOCKED'
}

export enum PayoutFrequency {
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY'
}

export interface PaymentRecord {
  id: string;
  userId: string;
  userName: string;
  role: UserRole;
  amount: number;
  frequency: PayoutFrequency;
  status: PayoutStatus;
  feedbackCompleted: boolean;
  period: string;
  processedAt?: string;
}

export interface Order {
  id: string;
  customerName: string;
  address: string;
  amount: number;
  status: string;
  operatorId?: string;
  courierId?: string;
  createdAt: string;
}

export interface KPIMetric {
  label: string;
  ball: number;
  weight: number;
  value: string;
}

export interface OperatorKPIReport {
  userId: string;
  period: string;
  speed: KPIMetric;
  systemErrors: KPIMetric;
  discipline: KPIMetric;
  orderCount: KPIMetric;
  scriptControl: KPIMetric;
  avgCheck: KPIMetric;
  finalScore: number;
}

export interface CourierOrder {
  id: string;
  price: number;
  time: string;
}

export interface CourierKPIReport {
  userId: string;
  fullName: string;
  period: string;
  deliveriesCount: number;
  totalEarnings: number;
  avgDeliveryTime: string;
  orders: CourierOrder[];
}

// Telegram WebApp Types
declare global {
  interface Window {
    Telegram: {
      WebApp: {
        initData: string;
        initDataUnsafe: {
          user?: {
            id: number;
            first_name: string;
            last_name?: string;
            username?: string;
          };
        };
        ready: () => void;
        expand: () => void;
        close: () => void;
      };
    };
  }
}
