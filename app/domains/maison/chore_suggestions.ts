import type { ChoreSuggestion } from '#shared/types/maison'

/**
 * Household chores offered in one click on the « Logement » fiche. The
 * user adjusts the rhythm afterwards on the task.
 */
export const CHORE_SUGGESTIONS: ChoreSuggestion[] = [
  {
    key: 'vacuum',
    title: 'Passer l’aspirateur',
    room: null,
    recurrence: 'weekly',
    recurrenceInterval: 1,
  },
  {
    key: 'floors',
    title: 'Laver les sols',
    room: null,
    recurrence: 'weekly',
    recurrenceInterval: 1,
  },
  {
    key: 'bathroom',
    title: 'Nettoyer la salle de bain',
    room: 'Salle de bain',
    recurrence: 'weekly',
    recurrenceInterval: 1,
  },
  {
    key: 'toilets',
    title: 'Nettoyer les toilettes',
    room: 'Toilettes',
    recurrence: 'weekly',
    recurrenceInterval: 1,
  },
  {
    key: 'sheets',
    title: 'Changer les draps',
    room: 'Chambre',
    recurrence: 'weekly',
    recurrenceInterval: 2,
  },
  {
    key: 'bins',
    title: 'Sortir les poubelles',
    room: null,
    recurrence: 'weekly',
    recurrenceInterval: 1,
  },
  {
    key: 'dust',
    title: 'Faire la poussière',
    room: null,
    recurrence: 'weekly',
    recurrenceInterval: 2,
  },
  {
    key: 'fridge',
    title: 'Nettoyer le frigo',
    room: 'Cuisine',
    recurrence: 'monthly',
    recurrenceInterval: 1,
  },
  {
    key: 'oven',
    title: 'Nettoyer le four',
    room: 'Cuisine',
    recurrence: 'monthly',
    recurrenceInterval: 2,
  },
  {
    key: 'descale',
    title: 'Détartrer la bouilloire et la cafetière',
    room: 'Cuisine',
    recurrence: 'monthly',
    recurrenceInterval: 1,
  },
  {
    key: 'windows',
    title: 'Laver les vitres',
    room: null,
    recurrence: 'monthly',
    recurrenceInterval: 3,
  },
  {
    key: 'freezer',
    title: 'Dégivrer le congélateur',
    room: 'Cuisine',
    recurrence: 'monthly',
    recurrenceInterval: 6,
  },
]
