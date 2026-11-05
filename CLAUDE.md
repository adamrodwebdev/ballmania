# CLAUDE.md — Ballmania

Contexte de travail pour Claude Code. À lire avant toute modification ; le jeu tel qu'il est
est décrit dans `docs/CAHIER_DES_CHARGES.md`, la suite dans `ROADMAP.md`, l'historique dans
`CHANGELOG.md`. En cas d'écart, ces trois documents font foi.

## Le projet

Tir de billes en chaîne réinventé (titre « Ball Mania » sur Playgama et Yandex) : une
campagne de 6 mondes × 12 niveaux, chacun avec sa mécanique et son Colosse, quatre modes
Arcade, billes bonus, aléas, Atelier et Observatoire, défi et cadeau du jour. Navigateur,
mobile d'abord, en **français, anglais, indonésien et russe**, thèmes clair et sombre.

- Canaux : notre site (`ballmania.netlify.app`, sans pub ni SDK), CrazyGames, Playgama,
  GameDistribution ; **Yandex Games en direct** en préparation (v1.9.0, `ROADMAP.md`).
- **Poki est abandonné** (26/10/2026 : son exclusivité fermerait CrazyGames et Yandex) ; le
  retrait de son adaptateur et de son build est prévu à la feuille de route. Ne rien y ajouter.
- L'auteur décide du design, de l'équilibre et de la publication ; les choix techniques sont
  délégués. Avant tout dépôt sur un portail, son accord.

Documentation : `docs/CAHIER_DES_CHARGES.md` (règles, plateformes et pubs § 3.7, équilibre
téléphone et ordinateur § 3.17, performances § 4.1, responsive § 4.2, architecture § 5,
qualité § 6), `docs/ORIGINALITE.md`, `docs/TEST_DE_COULOIR.md`,
`marketing/crazygames/README.md` (kit de soumission).

## Commandes

```bash
npm run dev               # serveur de développement
npm run dev:portal        # contre un portail simulé (fausses pubs, `?ads=off`)
npm run verify            # lint + format + types + tests unitaires + build : avant chaque commit
npm test                  # Vitest
npm run test:e2e          # Playwright sur le build, Chromium et la matrice de tailles
npx playwright test --project="webkit-*"        # WebKit, ordinateur et iPhone
npm run lighthouse        # mobile ; `-- --desktop`, `-- --lang=ru`
npm run build:portals     # les builds de portail dans dist-<portail>/
npm run couloir           # portail simulé servi au réseau de la maison (port 4190)
npm run kit:crazygames    # couvertures et vidéos du kit CrazyGames
```

Node 24 (`.nvmrc`). Une archive de portail se fait avec `scripts/zip-build.py` (`index.html` à
la racine, noms en ASCII sans espace, taille décompressée affichée). Les parcours servent les
ports 4174, 4175 et 4176 (`E2E_PORT`, `E2E_PORTAL_PORT`, `E2E_YANDEX_PORT` pour les déplacer).
Sur le poste Windows de l'auteur, le Firefox de Playwright ne démarre pas : il tourne en CI.
Les tests qui pilotent le navigateur par CDP portent l'étiquette `@cdp` et restent à Chromium.

## Pile et carte du code

Vue 3.5, TypeScript strict, Vite, `vue-i18n` 11 (messages précompilés), sans routeur ni
Pinia : des services injectés par `provide/inject` (`AppServices`). Rendu derrière une
interface (`Renderer` : WebGL2 et Canvas 2D), sons et musique synthétisés. L'arbre des
dossiers est dans `README.md` (« Architecture »).

## Règles d'architecture — à respecter absolument

- **Moteur pur** (`src/engine/`) : ni Vue ni DOM, testable et rejouable ; boucle à pas fixe,
  hasard à graine (`SeededRandom`).
- **Événements de domaine** (`ballsDestroyed`, `comboReached`, `chainReachedHole`…) : rendu,
  son et vibrations s'abonnent ; le moteur ne connaît aucun d'eux.
- **Stratégies plutôt que `switch`** : modes (`GameMode`), bonus (`PowerUp`), thèmes de monde
  (`WorldTheme`) ; l'IA est un joueur qui passe par les mêmes commandes que l'humain.
- **Campagne en données** (`src/levels`) : `World`, `LevelDefinition`, `LevelCatalog` ;
  `Progression` et `Wallet` ne dépendent que de `SaveStore`.
- **Le jeu ne connaît aucun SDK** : tout passe par `PlatformAdapter` (`src/platform/`),
  choisi au build. `AdPolicy` décide _quand_ une pub est permise, à part de _comment_ elle
  s'affiche : récompensées toujours au choix ; entre deux parties, une fois toutes les
  3 minutes au plus, jamais dans les 8 premières minutes d'un nouveau joueur ni juste après
  une défaite. Le build CrazyGames de dépôt est sans pub (Basic Launch).
- **CSP stricte** (`default-src 'self'`, aucun `'unsafe-inline'`) : jamais d'attribut `style`
  dans les gabarits ; les seuls blocs en ligne sont autorisés par leur empreinte.
- **Aucun texte en dur** (`vue/no-bare-strings-in-template`) ; un fichier par langue aux mêmes
  clés (vérifié par un test) ; nombres et dates par `Intl`, quatre formes du pluriel russe. Le
  russe s'affiche en Nunito : un test vérifie que son fichier contient chaque caractère du
  texte russe.
- 60 images/s au plus sur écran tactile (`FrameCap`) ; canevas limité à environ 4 mégapixels
  (`pixelRatioFor`).

## Exigences

- Lighthouse **à 100** dans les quatre catégories, mobile (la plus faible de trois mesures) et
  ordinateur. JS initial ≤ 60 Ko compressés ; aucune police ni image bloquante ; CLS ≈ 0.
- Matrice Playwright de 320 × 568 à 2560 × 1440, zooms 200 % et 400 % : chaque écran garde la
  page immobile, ne défile pas de côté et passe axe (WCAG 2.2 A et AA, taille des cibles
  comprise).
- **Équilibre** : chaque niveau est réglé pour le téléphone comme pour l'ordinateur sur des
  joueurs-robots (`tests/levels/`, § 3.17). Un changement de niveau ou de règle se revérifie
  avec eux.
- `prefers-reduced-motion` respecté (ni secousses, ni ralentis, ni fonds animés) ; un symbole
  gravé sur chaque couleur ; Échap reste au navigateur.

## Git et publication

- **Tout le travail se fait sur `dev`** : une branche par étape, fusionnée dans `dev`.
- **`main` est la production** : Netlify déploie chaque envoi sur `main`, et chaque
  déploiement coûte des crédits. `dev` passe dans `main` seulement sur la demande de
  l'auteur, en une fois, puis la version s'étiquette : voir `README.md`, « Branches et
  déploiement ».
- Commits _Conventional Commits_ **en français** ; code et commentaires **en anglais** ;
  documentation, CHANGELOG et feuille de route en français.
- Chaque version : entrée dans `CHANGELOG.md`, version dans `package.json` et
  `package-lock.json`, `ROADMAP.md` et cahier des charges mis à jour.

## Compétences utiles

`web-portal-game-strategy` (conception, monétisation, portails), `web-game-performance`
(poids, chargement, images par seconde), `game-web-translator` (les quatre langues),
`game-moderator-review` (revue d'un build avant dépôt, avec `references/yandex-games.md` pour
Yandex).
