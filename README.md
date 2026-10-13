# Ballmania

**Le tir de billes réinventé.** Une chaîne de billes de verre roule vers un trou ; on tire
des billes pour former des groupes de trois et plus qui explosent, et les réactions en
chaîne font le spectacle. Ballmania garde cette prise en main connue de tous et y ajoute
six mondes à mécaniques nouvelles, quatre modes Arcade, des aléas, des améliorations à
débloquer et une destruction soignée.

Jeu web gratuit, sans inscription ni publicité sur ce site, en **français, anglais et
indonésien**, thèmes clair et sombre, sur mobile comme sur ordinateur.

![Ballmania](public/og.jpg)

## Contenu

- **Campagne** de 6 mondes × 12 niveaux, chacun avec sa mécanique et son Colosse :
  Nébuleuse (règles de base), Néon (miroirs et ricochets), Abysses (aimant), Joaillerie
  (alchimie des couleurs), Volcan (aiguillages), Singularité (gravité d'un trou noir,
  lanceur en orbite). Trois difficultés : Explorateur, Pilote, Légende.
- **Aléas** : billes qui tombent du ciel, arythmie, tempête solaire, froid mordant, vents
  contraires, tracés à deux entrées.
- **Arcade**, ouverte monde après monde : Infini, Énigmes (30 énigmes calculées par un
  solveur, plus une énigme du jour), Rythme (musique synthétisée), Duel contre un rival.
- **Défi du jour** partageable, **objectifs**, **Atelier** de cosmétiques (éclats),
  **Observatoire** de dix améliorations (fragments d'étoiles).
- **Module de tir** : tir au relâchement, tir chargé, aide à la visée activable (bille
  fantôme et groupe prévu).

## Commandes du jeu

| Action                      | Souris / clavier                     | Tactile                         |
| --------------------------- | ------------------------------------ | ------------------------------- |
| Viser                       | Pointeur, flèches (Maj pour affiner) | Glisser le doigt                |
| Tirer                       | Relâcher le clic ou Espace           | Relâcher le doigt               |
| Tir chargé                  | Maintenir le clic ou Espace 0,35 s   | Garder le doigt immobile 0,35 s |
| Échanger / couleur suivante | Clic droit, X, C                     | Toucher le lanceur ou le bouton |
| Aimant (Abysses)            | M                                    | Bouton « Aimant »               |
| Aiguillage (Volcan)         | Clic sur le levier, S                | Toucher le levier               |
| Pause                       | Échap, P                             | Bouton pause                    |

## Accessibilité

- Tout se joue au clavier ; focus visible partout ; libellés ARIA et annonces des
  événements importants aux lecteurs d'écran (réactions, météo, danger, fin de partie).
- Chaque couleur de bille porte un **symbole gravé** (daltonisme).
- Contrastes WCAG AA dans les deux thèmes, vérifiés par axe-core sur chaque écran.
- `prefers-reduced-motion` respecté : ni secousses, ni ralentis, ni distorsions, ni fonds
  animés ; trois niveaux d'intensité des effets dans les réglages.

## Développement

Node 24 (voir `.nvmrc`).

```bash
npm install
npm run dev
```

| Commande             | Rôle                                                         |
| -------------------- | ------------------------------------------------------------ |
| `npm run dev`        | Serveur de développement                                     |
| `npm run build`      | Vérification des types puis build de production (`dist/`)    |
| `npm run verify`     | Lint, format, types, tests unitaires et build (avant commit) |
| `npm test`           | Tests unitaires (Vitest)                                     |
| `npm run test:e2e`   | Parcours Playwright, mobile et ordinateur, audits axe-core   |
| `npm run lighthouse` | Audit Lighthouse mobile du build (`-- --desktop` sinon)      |

Pour un déploiement, `SITE_URL=https://exemple.org/ npm run build` ajoute le lien
canonique, les adresses absolues des cartes de partage, `sitemap.xml` et un `robots.txt`
qui le cite. Le build est statique et fonctionne depuis n'importe quel sous-dossier.

## Portails de jeux

Le jeu se publie aussi sur des portails, avec leurs publicités. Notre site reste sans
publicité ni SDK.

| Commande                         | Build                                                                    |
| -------------------------------- | ------------------------------------------------------------------------ |
| `npm run build:crazygames`       | CrazyGames, dans `dist-crazygames/`                                      |
| `npm run build:poki`             | Poki, dans `dist-poki/`                                                  |
| `npm run build:gamedistribution` | GameDistribution, dans `dist-gamedistribution/` (avec `VITE_GD_GAME_ID`) |
| `npm run build:portals`          | Les trois                                                                |
| `npm run dev:portal`             | Développement contre un portail simulé (fausses publicités)              |

On envoie ensuite au portail une archive zip du dossier. Pour CrazyGames, le
[kit de soumission](marketing/crazygames/README.md) réunit description, commandes,
couvertures et vidéos (`npm run kit:crazygames`). Les publicités récompensées sont
toujours au choix : continuer après une défaite, éclats doublés, indice d'énigme, essai
d'un cosmétique. Une publicité entre deux parties passe au plus une fois toutes les
3 minutes. Détails : § 3.7 du [cahier des charges](docs/CAHIER_DES_CHARGES.md).

## Architecture

| Dossier        | Rôle                                                                                |
| -------------- | ----------------------------------------------------------------------------------- |
| `src/engine`   | Moteur en TypeScript pur, sans DOM : chaînes, tirs, objectifs, aléas, améliorations |
| `src/levels`   | Niveaux en données (recettes de tracés), campagne, modes Arcade, solveur d'énigmes  |
| `src/play`     | Session de jeu, rendu Canvas 2D, effets, thèmes, commandes                          |
| `src/audio`    | Sons et musique synthétisés (Web Audio, aucun fichier)                              |
| `src/player`   | Profil, objectifs, cosmétiques, défi du jour                                        |
| `src/services` | Réglages, sauvegardes, partage, thème                                               |
| `src/app`      | Services injectés et modes de jeu (stratégies)                                      |
| `src/platform` | Notre site et les portails (publicités, sauvegarde, signaux), choisis au build      |
| `src/ui`       | Écrans et composants Vue 3                                                          |

Programmation orientée objet, TypeScript strict, Vue 3 (Composition API), vue-i18n
précompilé, aucune bibliothèque de jeu. Politique de sécurité du contenu stricte (aucun
script ni style en ligne). Détails, décisions et équilibrage : le
[cahier des charges](docs/CAHIER_DES_CHARGES.md) ; historique : le
[journal des modifications](CHANGELOG.md).

## Qualité

- Plus de 750 tests unitaires, dont un robot joueur qui vérifie que chaque niveau se gagne
  et un test qui fait résoudre chaque énigme par le vrai moteur.
- Parcours Playwright sur mobile (390 × 844) et ordinateur (1 280 × 800), audits
  d'accessibilité, absence de défilement horizontal de 320 à 1 920 px.
- Lighthouse 100 dans les quatre catégories, sur mobile et ordinateur.
- Intégration continue GitHub Actions à chaque envoi.

## Conventions

Branche `main` stable, une branche par lot fusionnée sans avance rapide, commits en
français au format Conventional Commits ; code et commentaires en anglais, documentation
en français.

Tous droits réservés : aucune licence de réutilisation n'est accordée pour le moment.
