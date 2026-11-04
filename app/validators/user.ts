import vine from '@vinejs/vine'

/**
 * Shared rules for email and password.
 */
const email = () => vine.string().email().maxLength(254)
const password = () => vine.string().minLength(8).maxLength(32)

/**
 * Validator to use when performing self-signup.
 *
 * The "passwordConfirmation" field is declared explicitly, so that it is part
 * of the request body type shared with the frontend. Otherwise the signup form
 * has no way to know about the errors reported for this field.
 */
export const signupValidator = vine.create({
  fullName: vine.string().nullable(),
  email: email().unique({ table: 'users', column: 'email' }),
  password: password(),
  passwordConfirmation: password().sameAs('password'),
})

/**
 * Validator to use before validating user credentials
 * during login
 */
export const loginValidator = vine.create({
  email: email(),
  password: vine.string(),
  /**
   * « Se souvenir de moi » : keeps the user logged in after the session
   * expires, through a remember me token.
   */
  remember: vine.boolean().optional(),
})

/**
 * Validator of the « Profil » form. The email stays unique, except for the
 * current user.
 */
export const profileValidator = vine.withMetaData<{ userId: number }>().create({
  fullName: vine.string().trim().maxLength(255).nullable(),
  email: email().unique({
    table: 'users',
    column: 'email',
    caseInsensitive: true,
    filter: (query, _, field) => {
      query.whereNot('id', field.meta.userId)
    },
  }),
})

/**
 * Validator of the password change. The current password is checked by the
 * controller against the hash.
 */
export const passwordValidator = vine.create({
  currentPassword: vine.string(),
  password: password(),
  passwordConfirmation: password().sameAs('password'),
})
