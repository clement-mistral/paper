# Changelog

Toutes les évolutions notables de Paper. Format inspiré de
[Keep a Changelog](https://keepachangelog.com/fr/1.1.0/), versions en
[SemVer](https://semver.org/lang/fr/).

Ce fichier est affiché dans l'app (« Nouveautés », en cliquant sur le
numéro de version) : écrire pour l'utilisateur, en français.

Pour publier : déplacer les entrées de « Non publié » sous un nouveau titre
`## [x.y.z] - AAAA-MM-JJ`, mettre la même version dans `package.json`, puis
pousser sur la branche `prod`. La CI refuse de construire une version
absente de ce fichier.

Rubriques : Ajouté, Modifié, Corrigé, Supprimé.

## [Non publié]

### Ajouté

- Fiche « Placements » (Fiches → Placements) : vos PEA, comptes-titres,
  assurances-vie et portefeuilles crypto, ligne par ligne, valorisés au
  dernier cours. Pour chaque ligne : le prix de revient moyen, la
  plus-value latente, la performance depuis le 1er janvier et son poids ;
  pour l'ensemble, la répartition entre actions, fonds, crypto, fonds
  euros, liquidités et épargne. Les fonds non cotés (fonds euros, unités
  de compte) se valorisent avec la valeur de part de votre relevé.
- Achats, ventes, dividendes et frais s'enregistrent sur la fiche du
  compte. Un achat ou une vente ne compte ni comme une dépense ni comme un
  revenu dans Argent ; un dividende est un revenu, des frais une dépense.
- Les comptes ont maintenant une enveloppe (PEA, assurance-vie, livret…)
  et une date d'ouverture.

- Mots croisés sur la page Détente du journal : une nouvelle grille chaque
  jour, à côté du sudoku, avec la solution de celle de la veille.
- Page « Marchés » dans le journal, avant les jeux : les grands indices
  (CAC 40, Euro Stoxx 50, S&P 500, Nasdaq), l'euro en dollars et l'or, puis
  vos actions et cryptomonnaies avec leur évolution sur un jour, un mois et
  un an. L'encadré « À surveiller » signale ce qui ressort (croisement des
  moyennes, titre survendu ou suracheté, plus haut annuel, forte variation),
  à titre d'information et non comme conseil d'investissement. Choisissez
  les valeurs suivies dans Journal → Sources → Réglages de la feuille ;
  laissez le champ vide pour ne pas imprimer cette page.

## [1.2.0] - 2026-11-10

### Ajouté

- Horoscope dans le journal du jour : cochez les signes du foyer dans
  Journal → Sources → Réglages de la feuille, et chacun a sa ligne en bas de
  la une (le climat du jour, un conseil et un porte-bonheur). Le bandeau
  indique aussi dans quel signe se trouve le Soleil.
- Page « Détente » à la fin du journal : un sudoku du jour, facile en début
  de semaine et plus corsé le week-end, avec la solution de celui de la
  veille.
- Le marché du mois sur la page Détente : les fruits et légumes de saison,
  et vos recettes qui en contiennent.
- Encadré « Calendrier » sur la une : la phase de la lune et la prochaine
  pleine lune, le prochain jour férié (avec les ponts possibles) et, si vous
  choisissez votre zone dans les réglages du journal, les vacances scolaires
  d'après le calendrier officiel.

## [1.1.0] - 2026-11-09

### Ajouté

- Notifications du bilan du soir : un rappel à l'heure choisie (21 h par
  défaut) tant que le bilan du jour n'est pas validé, avec ce qu'il reste à
  trier et la série en cours. Un second rappel à 10 h si le bilan de la
  veille est encore à faire avant midi. À activer appareil par appareil dans
  Profil → Notifications (sur iPhone, depuis l'app installée).

## [1.0.0] - 2026-11-04

### Ajouté

- Navigation par dimension : Aujourd'hui, Agenda, Argent, Listes et Fiches, tous domaines confondus.
- Saisie universelle (Ctrl K) : pleins, factures, dépenses, entrées d'argent, virements, repas, courses, tâches, entretiens, relevés de compteurs et dépenses de travaux.
- Budget : comptes, enveloppes, transactions, entrées d'argent et virements.
- Maison : factures, abonnements, contrats, équipements, tableau électrique, compteurs et projets.
- Auto : véhicules, pleins, entretiens et coût au kilomètre.
- Menu : recettes (import par URL), stock frigo et placards, planning des repas, suggestions selon le stock.
- Bilan du jour, avec série de jours validés.
- Journal du jour : une page A4 d'articles choisis, météo et chiffres du foyer.
- Compte rendu du mois.
- Application installable sur téléphone (PWA), navigation mobile « Plus ».
- Numéro de version en bas de la barre de navigation et page « Nouveautés ».
