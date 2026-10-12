# Cahier des charges — Ballmania

| Version | Date       | Statut                                |
| ------- | ---------- | ------------------------------------- |
| 0.1     | 12/10/2026 | Proposition initiale, modes à valider |

Document vivant : il est mis à jour à chaque étape livrée (voir § 12, journal).

---

## 1. Contexte et objectifs

Le **tir de billes en chaîne** (une file de billes colorées avance sur un chemin vers un
trou ; le joueur tire des billes pour former des groupes de trois et plus qui explosent) est
un genre culte, mais l'offre web gratuite se limite presque toujours à des copies du même
niveau en spirale. **Ballmania** garde la prise en main connue de tous et ajoute des **modes
à mécanique nouvelle**, servis par des **effets de destruction spectaculaires**.

Objectifs :

1. **Prise en main immédiate** : on joue en moins de 5 secondes, en un clic ou un toucher.
2. **Rejouabilité** : des modes qui changent la façon de viser et de penser la chaîne, et un
   **défi du jour** identique pour tous les joueurs.
3. **Effet « waouh » mémorable** : chaque explosion est une récompense visuelle et sonore ;
   les grosses réactions en chaîne deviennent des moments que l'on a envie de partager.
4. **Viralité** : le résultat du défi du jour se partage en un geste (texte court + lien).
5. **Qualité web exemplaire** : Lighthouse ≥ 95 dans les quatre catégories, sur mobile.
6. **International dès le lancement** : français, anglais et indonésien.

## 2. Positionnement marketing

### 2.1 Cibles

| Segment                     | Attentes                                        | Réponse produit                               |
| --------------------------- | ----------------------------------------------- | --------------------------------------------- |
| Joueurs occasionnels (25+)  | Partie courte, gratuite, sans inscription       | Un clic pour jouer, parties de 2 à 6 min      |
| Nostalgiques du genre       | Retrouver les sensations, avec de la nouveauté  | Visée et règles familières, modes inédits     |
| Joueurs mobiles (Indonésie) | Jouer sur un téléphone modeste, réseau variable | Mobile d'abord, visée au doigt, bundle léger  |
| Joueurs « spectacle »       | Du feedback, de la puissance ressentie          | Destruction physique, ralentis, ondes de choc |

**Pourquoi l'indonésien** : l'Indonésie est l'un des plus grands marchés du jeu mobile, joué
majoritairement sur Android d'entrée de gamme. Cela impose **légèreté**, **jouabilité
tactile** et **dégradation gracieuse des effets**, ce qui profite à tous les marchés.

### 2.2 Proposition de valeur

> « Vous connaissez la chaîne. Vous ne l'avez jamais vue exploser comme ça. »

Différenciation :

- **Modes à mécanique nouvelle** (ricochets, alchimie des couleurs, aimant, orbite,
  aiguillages, duel…) plutôt que de simples niveaux plus rapides.
- **Destruction comme signature** : billes qui se fissurent et volent en éclats, ondes de
  choc qui déforment l'écran, ralentis sur les combos (§ 3.5).
- **Défi du jour** à graine commune, résultat partageable.
- **Aucun compte, aucun traceur, aucune bannière de cookies** sur notre site.

### 2.3 Nom et propriété intellectuelle

- Les noms des jeux de référence du genre (« Zuma », « Luxor »…) ne sont **jamais
  utilisés**, ni dans le jeu, ni dans le code, ni dans le référencement : ce sont des marques
  de leurs éditeurs.
- Les règles d'un jeu ne sont pas protégeables, mais **l'apparence** l'est (_Tetris Holding
  v. Xio Interactive_, 2012) : pas de grenouille-idole, pas de temple de pierre ni d'univers
  précolombien, pas de cartouches de niveaux imités. Univers, palette, lanceur, chemins et noms
  de modes sont **propres à Ballmania**.
- Nom de travail : **Ballmania**, compréhensible dans les trois langues. Vérification de
  disponibilité (marque, domaine, magasins d'applis, réseaux) à faire avant lancement.

## 3. Périmètre fonctionnel

### 3.1 Règles communes

- Une ou plusieurs **chaînes** de billes avancent sur un **chemin** (courbe paramétrée) vers
  un **trou**. Si une bille atteint le trou, la partie (ou la manche) est perdue.
- Le **lanceur** tire la bille courante vers le point visé ; il montre aussi la **bille
  suivante** et permet de les **échanger**.
- Une bille tirée **s'insère** dans la chaîne au point d'impact. Un groupe contigu de **3
  billes ou plus** de même couleur **explose**.
- Quand un trou se forme dans la chaîne, la partie arrière **recule** pour le refermer ; si
  les deux billes qui se rejoignent ont la même couleur et forment un groupe ≥ 3, nouvelle
  explosion : c'est la **réaction en chaîne** (combo).
- Les couleurs proposées au lanceur sont tirées **parmi celles encore présentes** sur le
  plateau (pas de tir impossible en fin de manche).
- **Bonus** apparaissant sur certaines billes, déclenchés quand elles explosent : bombe
  (rayon), ralenti, recul de la chaîne, foudre (toutes les billes d'une couleur), joker
  multicolore.
- **Score** : base par bille détruite × multiplicateur de combo × bonus de série (explosions
  consécutives sans tir raté) + bonus de vitesse en fin de manche.
- Tout l'aléatoire passe par un **générateur à graine** : une partie se rejoue à l'identique
  avec la même graine (défi du jour, tests, replays).

### 3.2 Modes de jeu (proposition v0.1, à valider)

Chaque mode est une **stratégie** branchée sur un moteur commun ; aucun mode ne modifie le
moteur.

| #   | Mode             | Idée                                                                                                                                              | Ce que ça change                         |
| --- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| 1   | **Classique**    | Le genre tel qu'on l'aime : niveaux à chemins variés, vitesse croissante.                                                                         | Référence, apprentissage                 |
| 2   | **Défi du jour** | Même mode, même chemin et même suite de billes pour tous ; une tentative classée par jour, résultat partageable.                                  | Rendez-vous quotidien, viralité          |
| 3   | **Ricochet**     | Murs réfléchissants et prismes : les tirs rebondissent. Les billes touchées après un rebond valent ×2, ×3…                                        | Visée en bande, coups « impossibles »    |
| 4   | **Alchimie**     | Trois couleurs primaires. Une bille tirée sur une bille d'une autre primaire **fusionne** avec elle (rouge + bleu = violet) au lieu de s'insérer. | Couleurs créées, stratégie profonde      |
| 5   | **Aimant**       | Le lanceur peut **aspirer** une bille de la chaîne (jauge limitée) puis la retirer ailleurs.                                                      | On retire autant qu'on ajoute            |
| 6   | **Orbite**       | Le lanceur glisse sur un anneau ; les chaînes spiralent vers un trou noir central dont la **gravité courbe les tirs**.                            | Visée courbe, placement du tireur        |
| 7   | **Aiguillages**  | Le chemin a des bifurcations que le joueur bascule pour rallonger la route d'une chaîne ou fusionner deux chaînes.                                | Gérer le parcours, pas seulement la file |
| 8   | **Rythme**       | La chaîne avance sur le tempo de la musique ; un tir sur le temps donne un multiplicateur de groove (×1 à ×4).                                    | Timing, flow                             |
| 9   | **Duel**         | Une chaîne commune entre deux trous, contre une IA (3 niveaux) : chaque explosion **pousse la chaîne vers le trou adverse**.                      | Tir à la corde, tension                  |
| 10  | **Énigme**       | Chaîne figée, nombre de tirs limité : tout effacer. 30 énigmes et une énigme du jour.                                                             | Réflexion, zéro pression de temps        |
| 11  | **Colosse**      | Un gardien géant pousse la chaîne ; les explosions à son contact lui retirent des points de vie ; il change de comportement par phases.           | Combats de boss, objectifs clairs        |
| 12  | **Infini**       | Chaîne sans fin, vitesse et nombre de couleurs croissants ; record personnel.                                                                     | Score pur, longues sessions              |

Recommandation : livrer **Classique** et **Défi du jour** en premier (le moteur complet),
puis les modes validés par lots, les plus différenciants d'abord.

### 3.3 Commandes

| Action                    | Souris / clavier             | Tactile                           |
| ------------------------- | ---------------------------- | --------------------------------- |
| Viser                     | Pointeur                     | Glisser le doigt (ligne de visée) |
| Tirer                     | Clic gauche, Espace          | Relâcher le doigt                 |
| Échanger bille / suivante | Clic droit, Tab, X           | Toucher le lanceur                |
| Pause                     | Échap, P                     | Bouton pause (≥ 44 × 44 px)       |
| Viser au clavier (a11y)   | Flèches gauche/droite (+Maj) | —                                 |

La visée tactile se fait **en relâchant**, jamais au toucher, pour qu'on puisse corriger
avant de tirer. Aucune action n'est réservée au survol.

### 3.4 Paramètres et données

- Langue, thème (clair / sombre / système), volume musique et effets, vibrations, intensité
  des effets (Spectaculaire / Équilibré / Sobre), réduction des mouvements.
- Sauvegarde locale (`localStorage`, versionnée) : records par mode, progression des niveaux,
  historique du défi du jour. Aucune donnée ne quitte l'appareil.

### 3.5 Direction artistique et destruction (pistes, à valider)

Principe : **chaque bille est un objet physique** qui réagit quand on la détruit.

- **Bris** : la bille se fissure (≈ 80 ms), puis éclate en fragments avec vitesse, rotation et
  rebond ; un éclat de lumière de sa couleur.
- **Onde de choc** : distorsion radiale de l'écran (shader) et léger tremblement, dosés selon
  la taille du groupe.
- **Réaction en chaîne** : chaque étage de combo monte d'un cran (son plus aigu, lumière plus
  forte, ralenti de 120 ms à partir du combo ×3).
- **Explosion finale** de manche : la fin de chaîne se désintègre en cascade jusqu'au trou.
- **Son entièrement synthétisé** (Web Audio) : aucun fichier audio lourd ; vibrations sur
  mobile.
- **Niveaux d'intensité** : _Spectaculaire_ (par défaut sur machine capable), _Équilibré_,
  _Sobre_ ; bascule automatique si la fréquence d'images chute ; `prefers-reduced-motion`
  supprime tremblements, ralentis et distorsions.

### 3.6 Distribution

Version de base sur notre propre site d'abord. Builds pour portails de jeux et démo pour le
portfolio une fois le jeu terminé.

## 4. Exigences non fonctionnelles

### 4.1 Performance et Lighthouse

- Lighthouse **≥ 95** en Performance, Accessibilité, Bonnes pratiques et SEO, sur mobile
  (profil simulé Lighthouse).
- Écran d'accueil rendu sans attendre le moteur : moteur, rendu et modes chargés à la
  demande (`import()`) au lancement d'une partie.
- Budget : JS initial ≤ 60 Ko compressés ; aucune police ni image bloquante ; CLS ≈ 0.
- 60 images/s visées sur Android d'entrée de gamme en mode _Équilibré_.

### 4.2 Responsive

- Mobile d'abord (≈ 360 px), puis points de rupture 640 / 768 / 1024 / 1280 px.
- Aucun défilement horizontal de 320 à 1920 px ; aire de jeu mise à l'échelle en conservant
  ses proportions, portrait et paysage.
- Typographie fluide (`clamp()`), espacements en `rem`, cibles tactiles ≥ 44 × 44 px.

### 4.3 Accessibilité

- Menus entièrement utilisables au clavier, focus visible, libellés ARIA.
- Couleurs des billes **doublées d'un motif** (symbole gravé) pour les daltoniens.
- Contrastes AA dans les deux thèmes ; annonces des événements clés via `aria-live`.

### 4.4 Internationalisation

- `vue-i18n`, textes dans `fr.json`, `en.json`, `id.json` (mêmes clés, vérifié par test).
- Langue détectée depuis le navigateur, modifiable ; nombres et dates via `Intl`.
- `<html lang>` et métadonnées SEO mis à jour selon la langue.

### 4.5 Thèmes

- Thème **clair** et **sombre**, plus « système » (`prefers-color-scheme`) par défaut.
- Couleurs exclusivement via des jetons CSS ; le rendu du jeu lit la même palette.

### 4.6 Confidentialité et sécurité

- Aucun cookie, aucun traceur, aucun appel réseau tiers.
- Politique de sécurité du contenu (CSP) stricte, pas de script en ligne.

### 4.7 Compatibilité

- Deux dernières versions de Chrome, Edge, Firefox, Safari ; Safari iOS 16+, Chrome Android.
- Rendu WebGL2 avec repli Canvas 2D si indisponible.

## 5. Architecture technique

### 5.1 Pile

- **Vue 3.5** (version stable maintenue), **TypeScript** strict, **Vite**.
- `vue-i18n` (messages précompilés), pas de routeur ni de Pinia au départ : services
  orientés objet injectés par `provide/inject`.
- Qualité : ESLint (règles typées + interdiction du texte en dur dans les gabarits),
  Prettier, `vue-tsc`, Vitest, Playwright.

### 5.2 Principes orientés objet

- **Moteur indépendant de Vue et du DOM** (`src/engine/`) : testable, rejouable.
- Une classe = une responsabilité : `Path` (courbe et abscisse curviligne), `Chain`,
  `Ball`, `Shooter`, `Projectile`, `CollisionSolver`, `MatchResolver`, `Scoring`,
  `SeededRandom`, `Game` (boucle à pas fixe).
- **Modes = stratégies** (`GameMode`) avec crochets (début, tick, insertion, explosion,
  fin) ; **bonus = stratégies** (`PowerUp`) ; **IA = joueur** qui passe par les mêmes
  commandes que l'humain.
- **Événements de domaine** (`ballsDestroyed`, `comboReached`, `chainReachedHole`…) : le
  rendu, le son et les vibrations s'abonnent ; le moteur ne connaît aucun d'eux.
- **Rendu derrière une interface** (`Renderer`) : implémentations WebGL2 et Canvas 2D.
- Registre des modes avec chargement paresseux par mode.

## 6. Qualité et tests

- Tests unitaires du moteur (géométrie du chemin, insertion, correspondances, recul,
  combos, graine) et des modes.
- Tests de bout en bout Playwright en 390 × 844 et 1280 × 800.
- Script Lighthouse local ; `npm run verify` (lint, format, types, tests, build) avant chaque
  commit.

## 7. Conventions Git

- Branche `main` stable ; une branche par lot (`feat/…`, `docs/…`), fusion `--no-ff`.
- Commits en français, format Conventional Commits.
- Code et commentaires en anglais ; documentation, CHANGELOG et commits en français.

## 8. Critères d'acceptation (v1.0)

- Tous les modes retenus jouables de bout en bout, au clavier, à la souris et au doigt.
- Lighthouse ≥ 95 × 4 sur mobile ; aucun défilement horizontal de 320 à 1920 px.
- Trois langues complètes ; thèmes clair et sombre conformes.
- Effets de destruction aux trois niveaux d'intensité, respect de `prefers-reduced-motion`.

## 9. Lots et planning (provisoire)

| Lot | Contenu                                                                         |
| --- | ------------------------------------------------------------------------------- |
| 0   | Dépôt, outillage, cahier des charges                                            |
| 1   | Moteur : chemin, chaîne, tir, insertion, correspondances, recul, combos, graine |
| 2   | Interface jouable : accueil, écran de jeu, rendu, commandes, i18n, thèmes       |
| 3   | Destruction et son : bris, ondes de choc, ralentis, synthèse audio, intensités  |
| 4   | Classique (niveaux) et Défi du jour                                             |
| 5+  | Modes validés, par lots de deux                                                 |
| n   | Accessibilité, SEO, tests e2e, Lighthouse, documentation, 1.0.0                 |

## 10. Hors périmètre (v1)

Comptes, classements en ligne, multijoueur en réseau, achats.

## 11. Évolutions envisagées

Éditeur de chemins, classements en ligne du défi du jour, application installable (PWA).

## 12. Journal des versions du document

| Version | Date       | Changements                                                      |
| ------- | ---------- | ---------------------------------------------------------------- |
| 0.1     | 12/10/2026 | Création : objectifs, positionnement, règles, 12 modes proposés. |
