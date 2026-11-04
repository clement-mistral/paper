import {
  Car,
  ChefHat,
  Carrot,
  FileText,
  House,
  Landmark,
  ReceiptText,
  Repeat,
  WalletCards,
  type LucideIcon,
} from 'lucide-react'
import { urlFor } from '~/client'
import type { Domain } from '#shared/types/domain'

/**
 * The fiche types are defined in code, not by the user. The slug is the
 * URL segment (`/fiches/vehicules`).
 */
export const FICHE_TYPES = [
  'comptes',
  'enveloppes',
  'vehicules',
  'logement',
  'abonnements',
  'contrats',
  'factures',
  'recettes',
  'ingredients',
] as const

export type FicheType = (typeof FICHE_TYPES)[number]

export const ficheMeta: Record<
  FicheType,
  { label: string; singular: string; domain: Domain; icon: LucideIcon; description: string }
> = {
  comptes: {
    label: 'Comptes',
    singular: 'Compte',
    domain: 'budget',
    icon: Landmark,
    description: 'Comptes courants, épargne et placements.',
  },
  enveloppes: {
    label: 'Enveloppes',
    singular: 'Enveloppe',
    domain: 'budget',
    icon: WalletCards,
    description: 'Budgets mensuels où se rangent les dépenses.',
  },
  vehicules: {
    label: 'Véhicules',
    singular: 'Véhicule',
    domain: 'auto',
    icon: Car,
    description: 'Pleins, compteur, consommation et coût au kilomètre.',
  },
  logement: {
    label: 'Logement',
    singular: 'Logement',
    domain: 'maison',
    icon: House,
    description: 'Équipements, ménage, travaux, sinistres, tableau électrique et compteurs.',
  },
  abonnements: {
    label: 'Abonnements',
    singular: 'Abonnement',
    domain: 'maison',
    icon: Repeat,
    description: 'Prélèvements récurrents, enregistrés automatiquement dans Budget.',
  },
  contrats: {
    label: 'Contrats',
    singular: 'Contrat',
    domain: 'maison',
    icon: FileText,
    description: 'Engagements, reconductions et préavis : un rappel avant chaque échéance.',
  },
  factures: {
    label: 'Factures',
    singular: 'Facture',
    domain: 'maison',
    icon: ReceiptText,
    description: 'Factures à payer et payées.',
  },
  recettes: {
    label: 'Recettes',
    singular: 'Recette',
    domain: 'menu',
    icon: ChefHat,
    description: 'Ingrédients, portions et repas planifiés.',
  },
  ingredients: {
    label: 'Ingrédients',
    singular: 'Ingrédient',
    domain: 'menu',
    icon: Carrot,
    description: 'Catalogue créé au fil des recettes : unités et basiques.',
  },
}

/**
 * URL of a fiche collection.
 */
export function ficheHref(type: FicheType): string {
  switch (type) {
    case 'comptes':
      return urlFor('accounts.index')
    case 'enveloppes':
      return urlFor('envelopes.index')
    case 'vehicules':
      return urlFor('vehicles.index')
    case 'abonnements':
      return urlFor('subscriptions.index')
    case 'contrats':
      return urlFor('contracts.index')
    case 'factures':
      return urlFor('bills.index')
    case 'recettes':
      return urlFor('recipes.index')
    case 'ingredients':
      return urlFor('ingredients.index')
    case 'logement':
      return urlFor('homes.index')
  }
}
