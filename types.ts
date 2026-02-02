
export enum TransactionStatus {
  UNPAID = 'Unpaid',
  PAID = 'Paid',
  PENDING = 'Pending'
}

export enum TransactionType {
  DEBIT = 'Debit',
  CREDIT = 'Credit'
}

export interface Transaction {
  id: string;
  description: string;
  type: TransactionType;
  amount: number;
  date: string;
  sourceId: string; // ID of the asset account (BDO, BPI, etc)
  sourceLabel: string;
}

export interface FinancialEntry {
  id: string;
  label: string;
  amount: number; // This represents the Monthly Payable or Current Balance
  totalAmount?: number; // This represents the Total Debt balance
  status?: TransactionStatus;
  deadline?: string; // Optional due date for obligations
}

export interface FinancialSection {
  title: string;
  entries: FinancialEntry[];
  type: 'balance' | 'expense' | 'savings' | 'receivable';
}

export interface DashboardData {
  savingsAccounts: FinancialEntry[];
  accountBalances: FinancialEntry[];
  receivables: FinancialEntry[];
  loans: FinancialEntry[];
  subscriptions: FinancialEntry[];
  savingsContribution: FinancialEntry[];
  utilities: FinancialEntry[];
  plans: FinancialEntry[];
  mandatories: FinancialEntry[];
  otherExpenses: FinancialEntry[];
  transactions: Transaction[];
}
