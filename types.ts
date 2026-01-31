
export enum TransactionStatus {
  UNPAID = 'Unpaid',
  PAID = 'Paid',
  PENDING = 'Pending'
}

export interface FinancialEntry {
  id: string;
  label: string;
  amount: number; // This represents the Monthly Payable
  totalAmount?: number; // This represents the Total Debt balance
  status?: TransactionStatus;
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
}
