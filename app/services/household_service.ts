import { createHash, randomBytes } from 'node:crypto'
import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'
import { Exception } from '@adonisjs/core/exceptions'
import User from '#models/user'
import HouseholdInvitation from '#models/household_invitation'
import type { HouseholdMember, HouseholdPanel } from '#shared/types/household'

/** An invitation link works this long, once. */
const INVITATION_DAYS = 7

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export function displayName(user: Pick<User, 'fullName' | 'email'>): string {
  return user.fullName?.trim() || user.email.split('@')[0]
}

export function toMember(user: User): HouseholdMember {
  const name = displayName(user)
  return { id: user.id, name, shortName: name.split(/\s+/)[0], initials: user.initials }
}

/**
 * The household: one set of data, several people. The first account
 * creates it; the others join through an invitation link sent by a
 * member (Paper sends no e-mail). Only a hash of the link's token is kept.
 */
export default class HouseholdService {
  /** Self-signup only creates the household: closed once someone has an account. */
  async signupOpen(): Promise<boolean> {
    const first = await User.query().select('id').first()
    return first === null
  }

  async members(): Promise<HouseholdMember[]> {
    const users = await User.query().orderBy('id')
    return users.map((user) => toMember(user))
  }

  async panel(userId: number): Promise<HouseholdPanel> {
    const [users, invitations] = await Promise.all([
      User.query().orderBy('id'),
      HouseholdInvitation.query()
        .whereNull('accepted_at')
        .where('expires_at', '>', DateTime.now().toSQL()!)
        .preload('createdBy')
        .orderBy('created_at'),
    ])
    return {
      members: users.map((user) => ({
        ...toMember(user),
        email: user.email,
        isYou: user.id === userId,
      })),
      invitations: invitations.map((invitation) => ({
        id: invitation.id,
        createdBy: displayName(invitation.createdBy),
        expiresAt: invitation.expiresAt.toISO()!,
      })),
    }
  }

  /**
   * A new invitation. Returns the token to put in the link: it is shown
   * once and cannot be found again.
   */
  async invite(createdById: number): Promise<{ token: string; expiresAt: DateTime }> {
    const token = randomBytes(24).toString('base64url')
    const expiresAt = DateTime.now().plus({ days: INVITATION_DAYS })
    await HouseholdInvitation.create({ tokenHash: hashToken(token), createdById, expiresAt })
    return { token, expiresAt }
  }

  async revoke(id: number) {
    await HouseholdInvitation.query().where('id', id).whereNull('accepted_at').delete()
  }

  /**
   * The invitation behind a link, if it can still be used.
   */
  async findValid(token: string): Promise<HouseholdInvitation | null> {
    return HouseholdInvitation.query()
      .where('token_hash', hashToken(token))
      .whereNull('accepted_at')
      .where('expires_at', '>', DateTime.now().toSQL()!)
      .preload('createdBy')
      .first()
  }

  /**
   * Joins the household: creates the account and uses up the invitation,
   * in one transaction (a link cannot create two accounts).
   */
  async accept(
    token: string,
    input: { fullName: string | null; email: string; password: string }
  ): Promise<User> {
    return db.transaction(async (trx) => {
      const invitation = await HouseholdInvitation.query({ client: trx })
        .where('token_hash', hashToken(token))
        .whereNull('accepted_at')
        .where('expires_at', '>', DateTime.now().toSQL()!)
        .forUpdate()
        .first()
      if (!invitation) {
        throw new Exception('Ce lien d’invitation n’est plus valable', { status: 410 })
      }
      const user = await User.create(input, { client: trx })
      invitation.merge({ acceptedAt: DateTime.now(), acceptedById: user.id })
      await invitation.useTransaction(trx).save()
      return user
    })
  }

  /**
   * Removes a person from the household. Their devices, settings, reviews
   * and habits go with them; what they did stays, unattributed. One cannot
   * remove oneself, so the household always keeps a member.
   */
  async remove(memberId: number, byId: number) {
    if (memberId === byId) {
      throw new Exception('Vous ne pouvez pas vous retirer vous-même du foyer', { status: 422 })
    }
    const user = await User.findOrFail(memberId)
    const tokens = await User.rememberMeTokens.all(user)
    await Promise.all(tokens.map((item) => User.rememberMeTokens.delete(user, item.identifier)))
    await user.delete()
    return displayName(user)
  }
}
