/**
 * The people of the household and the invitations to join it.
 */
export type HouseholdMember = {
  id: number
  name: string
  /** First name, for « coché par Léa ». */
  shortName: string
  initials: string
}

export type PendingInvitation = {
  id: number
  createdBy: string
  expiresAt: string
}

export type HouseholdPanel = {
  members: Array<HouseholdMember & { email: string; isYou: boolean }>
  invitations: PendingInvitation[]
}
