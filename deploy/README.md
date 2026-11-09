# Déployer Paper sur le serveur du foyer

Podman (rootless) + Tailscale. L'app, Postgres et Redis tournent dans
`compose.prod.yaml` ; seule l'app est publiée, sur `127.0.0.1`, et
`tailscale serve` l'expose en HTTPS sur le tailnet (le HTTPS est
obligatoire pour installer la PWA).

## Première installation

```bash
git clone <dépôt> ~/paper && cd ~/paper
cp .env.production.example .env.production
```

Dans `.env.production` :

- `DB_PASSWORD` : un mot de passe long (`openssl rand -base64 24`).
- `APP_KEY` : une chaîne aléatoire d'au moins 32 caractères
  (`openssl rand -base64 32`). Ne plus la changer ensuite : elle chiffre
  les cookies de session et de « Se souvenir de moi ».
- `APP_URL` : l'adresse donnée par Tailscale (étape suivante).
- `BACKUP_DIR` : un dossier hors du dépôt, idéalement sur un autre disque.

```bash
podman compose -f compose.prod.yaml --env-file .env.production up -d --build
podman logs -f paper-app        # « started HTTP server on 0.0.0.0:3333 »
```

Les migrations en attente s'exécutent à chaque démarrage de l'app
(uniquement vers l'avant).

### HTTPS sur le tailnet

```bash
sudo tailscale serve --bg 3333
tailscale serve status          # → https://<machine>.<tailnet>.ts.net
```

Reporter cette adresse dans `APP_URL`, puis
`podman compose -f compose.prod.yaml --env-file .env.production up -d`.
Sur le téléphone : ouvrir l'adresse, puis « Ajouter à l'écran d'accueil ».

### Notifications du bilan du soir

Les rappels du bilan sont des notifications Web Push, signées par une clé
propre au serveur. La générer une fois :

```bash
podman exec paper-app node ace push:keys
```

Reporter la ligne `VAPID_PRIVATE_KEY=…` dans le fichier d'environnement, puis
relancer l'app (`up -d`). Ne plus la changer : une nouvelle clé oblige chaque
appareil à réactiver les notifications. `VAPID_SUBJECT` (facultatif) est le
contact transmis aux services de notification (`mailto:…`), `APP_URL` par
défaut.

Sur chaque appareil : Profil → Notifications → « Activer sur cet appareil ».
Sur iPhone/iPad, uniquement depuis l'app ajoutée à l'écran d'accueil.

### Redémarrage automatique

```bash
loginctl enable-linger "$USER"                 # les services survivent à la déconnexion
systemctl --user enable --now podman-restart.service
```

## Sauvegardes

`deploy/backup.sh` fait un `pg_dump` vérifié chaque nuit dans
`$BACKUP_DIR/daily` (30 jours) et garde le dump du 1er de chaque mois dans
`$BACKUP_DIR/monthly` (12 mois).

```bash
mkdir -p ~/.config/systemd/user
cp deploy/paper-backup.service deploy/paper-backup.timer ~/.config/systemd/user/
# Adapter WorkingDirectory / ExecStart si le dépôt n'est pas dans ~/paper.
systemctl --user daemon-reload
systemctl --user enable --now paper-backup.timer
systemctl --user start paper-backup.service    # une première sauvegarde tout de suite
journalctl --user -u paper-backup.service      # « Sauvegarde …dump (… K) »
```

Une sauvegarde sur le même disque ne protège pas d'une panne de disque :
copier `$BACKUP_DIR` ailleurs (autre disque, autre machine, cloud chiffré).

### Restaurer

```bash
deploy/restore.sh /srv/paper/backups/daily/paper-2026-11-03.dump
```

Le script demande confirmation, sauvegarde d'abord l'état actuel
(`before-restore-….dump`), arrête l'app le temps de la restauration puis
la relance. Tester une restauration de temps en temps : une sauvegarde
jamais restaurée n'est pas une sauvegarde.

## Publier une version (CI/CD)

Chaque push sur la branche `prod` déclenche
[`.github/workflows/release.yml`](../.github/workflows/release.yml) :

1. lint, types, tests unitaires et fonctionnels (le même job que la CI
   des autres branches, [`ci.yml`](../.github/workflows/ci.yml)) ;
2. contrôle de version : la version de `package.json` doit avoir sa
   section `## [x.y.z] - AAAA-MM-JJ` dans `CHANGELOG.md`, et le tag
   `vx.y.z` ne doit pas déjà exister sur un autre commit ;
3. construction de l'image et envoi sur `ghcr.io/<owner>/paper`, avec les
   tags `x.y.z`, `x.y`, `latest` et `sha-<commit>` ;
4. release GitHub `vx.y.z`, avec les notes du changelog.

La version et le changelog sont visibles dans l'app : numéro en bas de
la barre de navigation (ordinateur), page « Nouveautés » (`/nouveautes`).

```bash
# sur main : décrire la version, puis
#   CHANGELOG.md : « Non publié » → « ## [1.1.0] - 2026-11-20 »
#   package.json : "version": "1.1.0"
git commit -am "Version 1.1.0"
git push origin main:prod
```

## Mettre à jour

Avec l'image de la CI (`PAPER_IMAGE` renseigné dans `.env.production`) :

```bash
cd ~/paper && git pull           # compose.prod.yaml et scripts à jour
podman compose -f compose.prod.yaml --env-file .env.production pull app
podman compose -f compose.prod.yaml --env-file .env.production up -d
```

Si le paquet ghcr.io est privé, se connecter une fois sur le serveur :
`podman login ghcr.io -u <utilisateur>` avec un jeton GitHub
(`read:packages`). Pour revenir à une version précédente, mettre
`PAPER_IMAGE=ghcr.io/<owner>/paper:1.0.0` puis `up -d` (les migrations ne
reviennent jamais en arrière : vérifier qu'aucune n'a été ajoutée entre
les deux versions).

Sans CI (`PAPER_IMAGE` vide), construire sur le serveur :

```bash
cd ~/paper && git pull
podman compose -f compose.prod.yaml --env-file .env.production up -d --build
```
