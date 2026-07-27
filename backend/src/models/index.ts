import mongoose, { Schema, Document } from 'mongoose';

// ----------------------------------------------------
// 1. SUPER ADMIN SCHEMA
// ----------------------------------------------------
export interface ISuperAdmin extends Document {
  name: string;
  email: string;
  passwordHash: string;
  role: 'super_admin';
  googleId?: string;
  authProviders?: string[];
}

const SuperAdminSchema = new Schema<ISuperAdmin>({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, index: true },
  passwordHash: { type: String, required: true },
  role: { type: String, default: 'super_admin' },
  googleId: { type: String, default: null },
  authProviders: { type: [String], default: ['password'] }
}, { timestamps: true });

export const SuperAdmin = mongoose.model<ISuperAdmin>('SuperAdmin', SuperAdminSchema);

// ----------------------------------------------------
// 2. PLATFORM LEAD SCHEMA
// ----------------------------------------------------
export interface IPlatformLead extends Document {
  name: string;
  phone: string;
  city: string;
  interestedPlan: '1_month' | '3_month' | '6_month' | '12_month';
  source: 'whatsapp' | 'website' | 'instagram' | 'facebook' | 'other';
  status: 'new' | 'contacted' | 'negotiation' | 'converted' | 'lost';
  isDeleted: boolean;
}

const PlatformLeadSchema = new Schema<IPlatformLead>({
  name: { type: String, required: true },
  phone: { type: String, required: true, index: true },
  city: { type: String, required: true },
  interestedPlan: { type: String, enum: ['1_month', '3_month', '6_month', '12_month'], required: true },
  source: { type: String, enum: ['whatsapp', 'website', 'instagram', 'facebook', 'other'], default: 'other' },
  status: { type: String, enum: ['new', 'contacted', 'negotiation', 'converted', 'lost'], default: 'new' },
  isDeleted: { type: Boolean, default: false }
}, { timestamps: true });

export const PlatformLead = mongoose.model<IPlatformLead>('PlatformLead', PlatformLeadSchema);

// ----------------------------------------------------
// 3. GYM OWNER (TENANT) SCHEMA
// ----------------------------------------------------
export interface ISubscriptionHistory {
  planType: string;
  amountPaid: number;
  startDate: Date;
  expiryDate: Date;
  renewedBy: string;
  transactionDate: Date;
  transactionId?: string;
  paymentMethod?: string;
  status?: string;
}

export interface IGymOwner extends Document {
  gymName: string;
  ownerName: string;
  email: string;
  passwordHash: string;
  phone: string;
  address: string;
  role: 'gym_owner';
  status: 'pending_activation' | 'active' | 'suspended';
  activationToken?: string | null;
  activationTokenExpiry?: Date | null;
  branding: {
    logo?: string;
    gymName?: string;
    address?: string;
    contactNumber?: string;
    whatsAppNumber?: string;
  };
  subscription: {
    planType: string;
    startDate: Date;
    expiryDate: Date;
    status: 'active' | 'expired' | 'suspended';
    amountPaid: number;
  };
  subscriptionHistory?: ISubscriptionHistory[];
  isTrial: boolean;
  isDeleted: boolean;
  googleId?: string;
  authProviders?: string[];
}

const GymOwnerSchema = new Schema<IGymOwner>({
  gymName: { type: String, required: true },
  ownerName: { type: String, required: true },
  email: { type: String, required: true, unique: true, index: true },
  passwordHash: { type: String, default: '' },
  phone: { type: String, required: true },
  address: { type: String, default: '' },
  role: { type: String, default: 'gym_owner' },
  status: { type: String, enum: ['pending_activation', 'active', 'suspended'], default: 'pending_activation', index: true },
  activationToken: { type: String, default: null },
  activationTokenExpiry: { type: Date, default: null },
  branding: {
    logo: { type: String, default: '' },
    gymName: { type: String, default: '' },
    address: { type: String, default: '' },
    contactNumber: { type: String, default: '' },
    whatsAppNumber: { type: String, default: '' }
  },
  subscription: {
    planType: { type: String, default: '1_month' },
    startDate: { type: Date, required: true },
    expiryDate: { type: Date, required: true, index: true },
    status: { type: String, enum: ['active', 'expired', 'suspended'], default: 'active', index: true },
    amountPaid: { type: Number, required: true }
  },
  subscriptionHistory: [{
    planType: { type: String, required: true },
    amountPaid: { type: Number, required: true },
    startDate: { type: Date, required: true },
    expiryDate: { type: Date, required: true },
    renewedBy: { type: String, required: true },
    transactionDate: { type: Date, default: Date.now },
    transactionId: { type: String, default: '' },
    paymentMethod: { type: String, default: 'cash' },
    status: { type: String, default: 'Completed' }
  }],
  isTrial: { type: Boolean, default: false },
  isDeleted: { type: Boolean, default: false },
  googleId: { type: String, default: null },
  authProviders: { type: [String], default: ['password'] }
}, { timestamps: true });

export const GymOwner = mongoose.model<IGymOwner>('GymOwner', GymOwnerSchema);

// ----------------------------------------------------
// 4. AUDIT LOG SCHEMA
// ----------------------------------------------------
export interface IAuditLog extends Document {
  action: string;
  user: string;
  ipAddress: string;
  timestamp: Date;
  oldValue: string;
  newValue: string;
  operator: string;
  browser: string;
  device: string;
  ip: string;
  reason: string;
}

const AuditLogSchema = new Schema<IAuditLog>({
  action: { type: String, required: true },
  user: { type: String, required: true },
  ipAddress: { type: String, required: true },
  timestamp: { type: Date, default: Date.now, index: true },
  oldValue: { type: String, default: '' },
  newValue: { type: String, default: '' },
  operator: { type: String, default: 'Admin' },
  browser: { type: String, default: '' },
  device: { type: String, default: '' },
  ip: { type: String, default: '' },
  reason: { type: String, default: '' }
});

export const AuditLog = mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);

// ----------------------------------------------------
// 5. MEMBERSHIP PLAN SCHEMA
// ----------------------------------------------------
export interface IMembershipPlan extends Document {
  gymOwnerId: any;
  name: string;
  durationMonths: number;
  price: number;
  status: 'active' | 'inactive';
  isDeleted: boolean;
}

const MembershipPlanSchema = new Schema<IMembershipPlan>({
  gymOwnerId: { type: Schema.Types.ObjectId, ref: 'GymOwner', required: true, index: true },
  name: { type: String, required: true },
  durationMonths: { type: Number, required: true },
  price: { type: Number, required: true },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  isDeleted: { type: Boolean, default: false }
}, { timestamps: true });

export const MembershipPlan = mongoose.model<IMembershipPlan>('MembershipPlan', MembershipPlanSchema);

// ----------------------------------------------------
// 6. MEMBER SCHEMA
// ----------------------------------------------------
export interface IMember extends Document {
  gymOwnerId: any;
  name: string;
  phone: string;
  email: string;
  gender: 'male' | 'female' | 'other';
  dob: Date;
  height: number;
  weight: number;
  address: string;
  joiningDate: Date;
  planId: any;
  membershipStart: Date;
  membershipEnd: Date;
  amountPaid: number;
  remainingAmount: number;
  paymentStatus: 'paid' | 'partial' | 'unpaid';
  qrCode: string;
  notes: string;
  bmi: number;
  emergencyContact: string;
  isArchived: boolean;
  isDeleted: boolean;
  isMigrated: boolean;
  migrationMethod?: 'excel' | 'manual';
  openingBalance?: number;
  discount?: number;
  previousOutstanding?: number;
}

const MemberSchema = new Schema<IMember>({
  gymOwnerId: { type: Schema.Types.ObjectId, ref: 'GymOwner', required: true, index: true },
  name: { type: String, required: true, index: true },
  phone: { type: String, required: true, index: true },
  email: { type: String, default: '' },
  gender: { type: String, enum: ['male', 'female', 'other'] },
  dob: { type: Date },
  height: { type: Number },
  weight: { type: Number },
  address: { type: String, default: '' },
  joiningDate: { type: Date, default: Date.now },
  planId: { type: Schema.Types.ObjectId, ref: 'MembershipPlan' },
  membershipStart: { type: Date },
  membershipEnd: { type: Date, index: true },
  amountPaid: { type: Number, default: 0 },
  remainingAmount: { type: Number, default: 0, index: true },
  paymentStatus: { type: String, enum: ['paid', 'partial', 'unpaid'], default: 'unpaid' },
  qrCode: { type: String, required: true, unique: true, index: true },
  emergencyContact: { type: String, default: '' },
  notes: { type: String, default: '' },
  bmi: { type: Number, default: 0 },
  isArchived: { type: Boolean, default: false, index: true },
  isDeleted: { type: Boolean, default: false },
  isMigrated: { type: Boolean, default: false },
  migrationMethod: { type: String, enum: ['excel', 'manual'] },
  openingBalance: { type: Number, default: 0 },
  discount: { type: Number, default: 0 },
  previousOutstanding: { type: Number, default: 0 }
}, { timestamps: true });

export const Member = mongoose.model<IMember>('Member', MemberSchema);

// ----------------------------------------------------
// 7. PAYMENT SCHEMA
// ----------------------------------------------------
export interface IPayment extends Document {
  gymOwnerId: any;
  memberId: any;
  amount: number;
  pendingAmount: number;
  paymentDate: Date;
  paymentMethod: 'upi' | 'cash' | 'card' | 'bank_transfer';
  receiptNumber: string;
  notes: string;
  operatorName?: string;
  isVoided?: boolean;
  originalAmount?: number;
  updatedAmount?: number;
  updatedBy?: string;
  updatedDate?: Date;
  isDeleted: boolean;
  originalPrice?: number;
  discount?: number;
  finalPayable?: number;
  previousOutstanding?: number;
  currentOutstanding?: number;
  totalOutstanding?: number;
}

const PaymentSchema = new Schema<IPayment>({
  gymOwnerId: { type: Schema.Types.ObjectId, ref: 'GymOwner', required: true, index: true },
  memberId: { type: Schema.Types.ObjectId, ref: 'Member', required: true, index: true },
  amount: { type: Number, required: true },
  pendingAmount: { type: Number, default: 0 },
  paymentDate: { type: Date, default: Date.now, index: true },
  paymentMethod: { type: String, enum: ['upi', 'cash', 'card', 'bank_transfer'], required: true },
  receiptNumber: { type: String, required: true, unique: true },
  notes: { type: String, default: '' },
  operatorName: { type: String, default: 'Admin' },
  isVoided: { type: Boolean, default: false, index: true },
  originalAmount: { type: Number },
  updatedAmount: { type: Number },
  updatedBy: { type: String },
  updatedDate: { type: Date },
  isDeleted: { type: Boolean, default: false },
  originalPrice: { type: Number, default: 0 },
  discount: { type: Number, default: 0 },
  finalPayable: { type: Number, default: 0 },
  previousOutstanding: { type: Number, default: 0 },
  currentOutstanding: { type: Number, default: 0 },
  totalOutstanding: { type: Number, default: 0 }
}, { timestamps: true });

export const Payment = mongoose.model<IPayment>('Payment', PaymentSchema);

// ----------------------------------------------------
// 8. ATTENDANCE SCHEMA
// ----------------------------------------------------
export interface IAttendance extends Document {
  gymOwnerId: any;
  memberId: any;
  date: string;
  checkInTime: string;
  checkOutTime: string;
  workoutDuration: string;
  status: 'present' | 'absent' | 'checked_out';
  receptionist: string;
  qrScanTime: string;
  deviceInfo: string;
  browserInfo: string;
}

const AttendanceSchema = new Schema<IAttendance>({
  gymOwnerId: { type: Schema.Types.ObjectId, ref: 'GymOwner', required: true, index: true },
  memberId: { type: Schema.Types.ObjectId, ref: 'Member', required: true, index: true },
  date: { type: String, required: true, index: true }, // Format YYYY-MM-DD
  checkInTime: { type: String, required: true },
  checkOutTime: { type: String, default: '' },
  workoutDuration: { type: String, default: '' },
  status: { type: String, enum: ['present', 'absent', 'checked_out'], default: 'present' },
  receptionist: { type: String, default: 'Admin' },
  qrScanTime: { type: String, default: '' },
  deviceInfo: { type: String, default: '' },
  browserInfo: { type: String, default: '' }
}, { timestamps: true });

export const Attendance = mongoose.model<IAttendance>('Attendance', AttendanceSchema);

// ----------------------------------------------------
// 9. TRAINER SCHEMA
// ----------------------------------------------------
export interface ITrainer extends Document {
  gymOwnerId: any;
  name: string;
  phone: string;
  specialization: string;
  status: 'active' | 'inactive';
  isDeleted: boolean;
}

const TrainerSchema = new Schema<ITrainer>({
  gymOwnerId: { type: Schema.Types.ObjectId, ref: 'GymOwner', required: true, index: true },
  name: { type: String, required: true },
  phone: { type: String, required: true },
  specialization: { type: String, default: '' },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  isDeleted: { type: Boolean, default: false }
}, { timestamps: true });

export const Trainer = mongoose.model<ITrainer>('Trainer', TrainerSchema);

// ----------------------------------------------------
// 10. WORKOUT PLAN SCHEMA
// ----------------------------------------------------
export interface IWorkoutPlan extends Document {
  gymOwnerId: any;
  memberId: any;
  instructions: string;
  exercises: { day: string; name: string; sets: number; reps: string }[];
  isDeleted: boolean;
}

const WorkoutPlanSchema = new Schema<IWorkoutPlan>({
  gymOwnerId: { type: Schema.Types.ObjectId, ref: 'GymOwner', required: true, index: true },
  memberId: { type: Schema.Types.ObjectId, ref: 'Member', required: true, index: true },
  instructions: { type: String, default: '' },
  exercises: [{
    day: { type: String, required: true },
    name: { type: String, required: true },
    sets: { type: Number, required: true },
    reps: { type: String, required: true }
  }],
  isDeleted: { type: Boolean, default: false }
}, { timestamps: true });

export const WorkoutPlan = mongoose.model<IWorkoutPlan>('WorkoutPlan', WorkoutPlanSchema);

// ----------------------------------------------------
// 11. DIET PLAN SCHEMA
// ----------------------------------------------------
export interface IDietPlan extends Document {
  gymOwnerId: any;
  memberId: any;
  instructions: string;
  meals: { time: string; items: string; calories: number }[];
  isDeleted: boolean;
}

const DietPlanSchema = new Schema<IDietPlan>({
  gymOwnerId: { type: Schema.Types.ObjectId, ref: 'GymOwner', required: true, index: true },
  memberId: { type: Schema.Types.ObjectId, ref: 'Member', required: true, index: true },
  instructions: { type: String, default: '' },
  meals: [{
    time: { type: String, required: true },
    items: { type: String, required: true },
    calories: { type: Number, default: 0 }
  }],
  isDeleted: { type: Boolean, default: false }
}, { timestamps: true });

export const DietPlan = mongoose.model<IDietPlan>('DietPlan', DietPlanSchema);

// ----------------------------------------------------
// 12. PROGRESS METRIC SCHEMA
// ----------------------------------------------------
export interface IProgressMetric extends Document {
  memberId: any;
  date: Date;
  weight: number;
  bmi: number;
  chest: number;
  waist: number;
  biceps: number;
}

const ProgressMetricSchema = new Schema<IProgressMetric>({
  memberId: { type: Schema.Types.ObjectId, ref: 'Member', required: true, index: true },
  date: { type: Date, default: Date.now, index: true },
  weight: { type: Number, required: true },
  bmi: { type: Number, required: true },
  chest: { type: Number, default: 0 },
  waist: { type: Number, default: 0 },
  biceps: { type: Number, default: 0 }
}, { timestamps: true });

export const ProgressMetric = mongoose.model<IProgressMetric>('ProgressMetric', ProgressMetricSchema);

// ----------------------------------------------------
// 13. PLATFORM PLAN SCHEMA
// ----------------------------------------------------
export interface IPlatformPlan extends Document {
  name: string;
  price: number;
  durationMonths: number;
  description: string;
  features: string[];
  status: 'active' | 'inactive';
  isMostPopular?: boolean;
  displayOrder?: number;
  colorBadge?: string;
  couponCompatible?: boolean;
  trialDuration?: 'none' | '7' | '14' | '30' | 'lifetime';
  isDeleted: boolean;
}

const PlatformPlanSchema = new Schema<IPlatformPlan>({
  name: { type: String, required: true },
  price: { type: Number, required: true },
  durationMonths: { type: Number, required: true },
  description: { type: String, default: '' },
  features: { type: [String], default: [] },
  status: { type: String, enum: ['active', 'inactive'], default: 'active', index: true },
  isMostPopular: { type: Boolean, default: false },
  displayOrder: { type: Number, default: 0 },
  colorBadge: { type: String, default: 'amber' },
  couponCompatible: { type: Boolean, default: true },
  trialDuration: { type: String, enum: ['none', '7', '14', '30', 'lifetime'], default: 'none' },
  isDeleted: { type: Boolean, default: false }
}, { timestamps: true });

export const PlatformPlan = mongoose.model<IPlatformPlan>('PlatformPlan', PlatformPlanSchema);

// ----------------------------------------------------
// 14. COUPON SCHEMA
// ----------------------------------------------------
export interface ICoupon extends Document {
  code: string;
  discountType: 'percentage' | 'flat';
  discountValue: number;
  expiryDate: Date;
  usageLimit: number;
  timesUsed: number;
  isActive: boolean;
  isDeleted: boolean;
}

const CouponSchema = new Schema<ICoupon>({
  code: { type: String, required: true, unique: true, index: true },
  discountType: { type: String, enum: ['percentage', 'flat'], required: true },
  discountValue: { type: Number, required: true },
  expiryDate: { type: Date, required: true },
  usageLimit: { type: Number, default: 0 }, // 0 = unlimited
  timesUsed: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true, index: true },
  isDeleted: { type: Boolean, default: false }
}, { timestamps: true });

export const Coupon = mongoose.model<ICoupon>('Coupon', CouponSchema);

// ----------------------------------------------------
// 15. MEMBER ACTIVITY SCHEMA
// ----------------------------------------------------
export interface IMemberActivity extends Document {
  gymOwnerId: any;
  memberId: any;
  activityType: 'registration' | 'payment_initial' | 'payment_partial' | 'payment_due_collection' | 'plan_renewal' | 'plan_upgrade' | 'plan_downgrade' | 'refund' | 'correction' | 'void' | 'workout_updated' | 'diet_updated' | 'check_in' | 'check_out' | 'migration' | 'opening_balance';
  title: string;
  date: Date;
  time: string;
  operator: string;
  remarks: string;
  receiptNumber?: string;
  transactionId?: string;
  oldAmount?: number;
  newAmount?: number;
  remainingDue?: number;
  paymentMethod?: string;
  originalPrice?: number;
  discount?: number;
  finalPayable?: number;
  previousOutstanding?: number;
  currentOutstanding?: number;
  totalOutstanding?: number;
}

const MemberActivitySchema = new Schema<IMemberActivity>({
  gymOwnerId: { type: Schema.Types.ObjectId, ref: 'GymOwner', required: true, index: true },
  memberId: { type: Schema.Types.ObjectId, ref: 'Member', required: true, index: true },
  activityType: { type: String, required: true, index: true },
  title: { type: String, required: true },
  date: { type: Date, default: Date.now, index: true },
  time: { type: String, required: true },
  operator: { type: String, default: 'Admin' },
  remarks: { type: String, default: '' },
  receiptNumber: { type: String, default: '' },
  transactionId: { type: String, default: '' },
  oldAmount: { type: Number },
  newAmount: { type: Number },
  remainingDue: { type: Number },
  paymentMethod: { type: String, default: '' },
  originalPrice: { type: Number, default: 0 },
  discount: { type: Number, default: 0 },
  finalPayable: { type: Number, default: 0 },
  previousOutstanding: { type: Number, default: 0 },
  currentOutstanding: { type: Number, default: 0 },
  totalOutstanding: { type: Number, default: 0 }
}, { timestamps: true });

export const MemberActivity = mongoose.model<IMemberActivity>('MemberActivity', MemberActivitySchema);

// ----------------------------------------------------
// 16. NOTIFICATION SCHEMA
// ----------------------------------------------------
export interface INotification extends Document {
  gymOwnerId?: any; // empty for superadmin/system alerts
  title: string;
  message: string;
  category: 'registration' | 'payment' | 'due_collection' | 'attendance' | 'renewal' | 'trial' | 'suspension' | 'expiry';
  isRead: boolean;
  isDismissed: boolean;
}

const NotificationSchema = new Schema<INotification>({
  gymOwnerId: { type: Schema.Types.ObjectId, ref: 'GymOwner', index: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  category: { type: String, required: true, index: true },
  isRead: { type: Boolean, default: false },
  isDismissed: { type: Boolean, default: false, index: true }
}, { timestamps: true });

export const Notification = mongoose.model<INotification>('Notification', NotificationSchema);

// ----------------------------------------------------
// 17. IMPORT HISTORY SCHEMA
// ----------------------------------------------------
export interface IImportHistory extends Document {
  gymOwnerId: any;
  importedBy: string;
  fileName: string;
  totalRecords: number;
  successCount: number;
  failedCount: number;
  duplicateCount: number;
  updatedCount: number;
  mergedCount: number;
  rowErrors: Array<{ row: number; name?: string; error: string }>;
  createdAt: Date;
}

const ImportHistorySchema = new Schema<IImportHistory>({
  gymOwnerId: { type: Schema.Types.ObjectId, ref: 'GymOwner', required: true, index: true },
  importedBy: { type: String, required: true },
  fileName: { type: String, required: true },
  totalRecords: { type: Number, required: true },
  successCount: { type: Number, required: true },
  failedCount: { type: Number, required: true },
  duplicateCount: { type: Number, required: true },
  updatedCount: { type: Number, default: 0 },
  mergedCount: { type: Number, default: 0 },
  rowErrors: [{
    row: { type: Number },
    name: { type: String },
    error: { type: String }
  }]
}, { timestamps: true });

export const ImportHistory = mongoose.model<IImportHistory>('ImportHistory', ImportHistorySchema);

// ----------------------------------------------------
// 18. IMPORT MAPPING SCHEMA
// ----------------------------------------------------
export interface IImportMapping extends Document {
  gymOwnerId: any;
  mapping: Record<string, string>;
  createdAt: Date;
  updatedAt: Date;
}

const ImportMappingSchema = new Schema<IImportMapping>({
  gymOwnerId: { type: Schema.Types.ObjectId, ref: 'GymOwner', required: true, unique: true, index: true },
  mapping: { type: Schema.Types.Map, of: String, required: true }
}, { timestamps: true });

export const ImportMapping = mongoose.model<IImportMapping>('ImportMapping', ImportMappingSchema);
