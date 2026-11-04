import type { AccountType } from '#shared/types/budget'

export const accountTypeLabels: Record<AccountType, string> = {
  checking: 'Courant',
  savings: 'Épargne',
  investment: 'Placement',
}
