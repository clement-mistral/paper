/*
|--------------------------------------------------------------------------
| Validator file
|--------------------------------------------------------------------------
|
| The validator file is used for configuring global transforms for VineJS.
| The transform below converts all VineJS date outputs from JavaScript
| Date objects to Luxon DateTime instances, so that validated dates are
| ready to use with Lucid models and other parts of the app that expect
| Luxon DateTime.
|
*/

import { DateTime } from 'luxon'
import vine, { SimpleMessagesProvider, VineDate } from '@vinejs/vine'

declare module '@vinejs/vine/types' {
  interface VineGlobalTransforms {
    date: DateTime
  }
}

VineDate.transform((value) => DateTime.fromJSDate(value))

/**
 * Validation messages are shown to the user, so they are in French. Field
 * names are translated through the `fields` map.
 */
vine.messagesProvider = new SimpleMessagesProvider(
  {
    'required': 'Le champ {{ field }} est obligatoire.',
    'string': 'Le champ {{ field }} doit être un texte.',
    'number': 'Le champ {{ field }} doit être un nombre.',
    'boolean': 'Le champ {{ field }} est invalide.',
    'email': 'Adresse e-mail invalide.',
    'minLength': 'Le champ {{ field }} doit contenir au moins {{ min }} caractères.',
    'maxLength': 'Le champ {{ field }} ne doit pas dépasser {{ max }} caractères.',
    'min': 'Le champ {{ field }} doit être supérieur ou égal à {{ min }}.',
    'max': 'Le champ {{ field }} doit être inférieur ou égal à {{ max }}.',
    'withoutDecimals': 'Le champ {{ field }} doit être un nombre entier.',
    'regex': 'Le format du champ {{ field }} est invalide.',
    'enum': 'Choisissez une valeur dans la liste.',
    'sameAs': 'Les deux valeurs ne correspondent pas.',
    'url': 'Adresse invalide (ex. : https://…).',
    'database.unique': 'Cette valeur est déjà utilisée.',
    'email.database.unique': 'Cette adresse e-mail est déjà utilisée.',
    'database.exists': 'L’élément choisi n’existe pas.',
    'openingBalance.regex': 'Montant invalide (ex. : 1 200,50).',
    'monthlyBudget.regex': 'Montant invalide (ex. : 150 ou 150,00).',
    'occurredOn.regex': 'Date invalide.',
    'cost.regex': 'Montant invalide (ex. : 89,90).',
    'price.regex': 'Montant invalide (ex. : 499,00).',
    'budget.regex': 'Montant invalide (ex. : 1 500).',
    'amount.regex': 'Montant invalide (ex. : 89,90).',
    'damage.regex': 'Montant invalide (ex. : 1 200).',
    'deductible.regex': 'Montant invalide (ex. : 150).',
    'compensation.regex': 'Montant invalide (ex. : 1 050).',
    'surfaceM2.regex': 'Surface invalide (ex. : 72,5).',
    'sectionMm2.regex': 'Section invalide (ex. : 2,5).',
    'value.regex': 'Index invalide (ex. : 12345,6).',
    'dueOn.requiredIfMissing': 'Indiquez une date ou un kilométrage d’échéance.',
  },
  {
    name: 'nom',
    type: 'type',
    institution: 'banque',
    openingBalance: 'solde initial',
    monthlyBudget: 'budget mensuel',
    keywords: 'mots-clés',
    notes: 'notes',
    amountCents: 'montant',
    label: 'libellé',
    occurredOn: 'date',
    envelopeId: 'enveloppe',
    accountId: 'compte',
    email: 'e-mail',
    password: 'mot de passe',
    passwordConfirmation: 'confirmation',
    currentPassword: 'mot de passe actuel',
    fullName: 'nom',
    kind: 'type',
    occupancy: 'statut',
    address: 'adresse',
    surfaceM2: 'surface',
    builtYear: 'année de construction',
    category: 'catégorie',
    brand: 'marque',
    model: 'modèle',
    room: 'pièce',
    purchasedOn: 'date d’achat',
    price: 'prix',
    warrantyUntil: 'fin de garantie',
    provider: 'intervenant',
    reference: 'repère',
    breakerAmps: 'calibre',
    differential: 'différentiel',
    sectionMm2: 'section',
    rooms: 'pièces',
    powerWatts: 'puissance',
    number: 'numéro',
    readOn: 'date du relevé',
    value: 'index',
    title: 'titre',
    customerNumber: 'numéro client',
    contractNumber: 'numéro de contrat',
    contact: 'contact',
    startedOn: 'date de début',
    commitmentUntil: 'fin d’engagement',
    renewalMonths: 'durée de reconduction',
    noticeDays: 'préavis',
    endedOn: 'date de résiliation',
    subscriptionId: 'abonnement',
    status: 'statut',
    budget: 'budget',
    startsOn: 'début',
    targetOn: 'objectif',
    amount: 'montant',
    contractId: 'contrat',
    declaredOn: 'date de déclaration',
    claimNumber: 'numéro de sinistre',
    damage: 'montant des dégâts',
    deductible: 'franchise',
    compensation: 'indemnisation',
    compensatedOn: 'date d’indemnisation',
    recurrence: 'fréquence',
    fromAccountId: 'compte de départ',
    location: 'emplacement',
    section: 'rubrique',
    city: 'ville',
    perSection: 'articles par rubrique',
    itemIds: 'articles',
    expiresOn: 'date de péremption',
    url: 'adresse',
    slot: 'repas',
    servings: 'portions',
    quantity: 'quantité',
    unit: 'unité',
    toAccountId: 'compte d’arrivée',
    recurrenceInterval: 'intervalle',
    doneOn: 'date',
    odometerKm: 'kilométrage',
    cost: 'coût',
    garage: 'garage',
    dueOn: 'date d’échéance',
    dueOdometerKm: 'kilométrage d’échéance',
    intervalKm: 'intervalle en km',
    intervalMonths: 'intervalle en mois',
  }
)
