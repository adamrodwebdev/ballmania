# Cahier des charges — Ballmania

| Version | Date       | Statut                           |
| ------- | ---------- | -------------------------------- |
| 0.6     | 12/10/2026 | Lot 3 livré (destruction et son) |

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
2. **Progression** : une campagne de mondes à difficulté croissante, chacun avec son thème
   à débloquer.
3. **Rejouabilité** : des modes qui changent la façon de viser et de penser la chaîne, et un
   **défi du jour** identique pour tous les joueurs.
4. **Effet « waouh » mémorable** : chaque explosion est une récompense visuelle et sonore ;
   les grosses réactions en chaîne deviennent des moments que l'on a envie de partager.
5. **Viralité** : le résultat du défi du jour se partage en un geste (texte court + lien).
6. **Qualité web exemplaire** : Lighthouse ≥ 95 dans les quatre catégories, sur mobile.
7. **International dès le lancement** : français, anglais et indonésien.
8. **Monétisable** : prêt pour les portails de jeux web, avec publicités respectueuses.

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
- **Score** (précisé au lot 1) : chaque explosion rapporte **billes × 10 × profondeur** de
  la réaction en chaîne (1 pour la première explosion, +1 pour chaque explosion qui en
  découle). Une explosion provoquée directement par un tir prolonge la **série** ; à partir
  du 3ᵉ tir réussi consécutif, chaque tir ajoute **20 × (série − 2)**. Un tir qui sort du
  plateau ou ne fait rien exploser casse la série. Bonus de fin de manche : défini par les
  modes (lot 4).
- La chaîne générée ne contient jamais de groupe déjà explosif (suites limitées à 2 billes
  de même couleur) : chaque explosion est l'œuvre du joueur.
- Tout l'aléatoire passe par un **générateur à graine** : une partie se rejoue à l'identique
  avec la même graine (défi du jour, tests, replays).

### 3.2 Structure du jeu (v0.2)

Deux portes d'entrée depuis l'accueil :

- **Campagne** (porte principale) : une suite de **mondes** de difficulté croissante. Chaque
  monde a son **thème visuel** et **introduit une mécanique** issue des modes ci-dessous ; il
  se termine par un **Colosse** (boss). Terminer un monde **débloque le suivant et son
  thème**.
- **Arcade** : les modes autonomes (Défi du jour, Duel, Énigme, Rythme, Infini), débloqués
  au fil de la campagne pour donner au joueur de nouvelles raisons de revenir.

#### Campagne (proposition)

| Monde | Thème (univers visuel)          | Mécanique introduite         | Boss               |
| ----- | ------------------------------- | ---------------------------- | ------------------ |
| 1     | **Nébuleuse** (orbes cosmiques) | Règles de base, bonus        | Colosse stellaire  |
| 2     | **Néon** (arcade synthwave)     | Ricochet (murs, prismes)     | Colosse prisme     |
| 3     | **Abysses** (bioluminescence)   | Aimant (aspirer, renvoyer)   | Colosse abyssal    |
| 4     | **Joaillerie** (gemmes, or)     | Alchimie (fusion de teintes) | Colosse de cristal |
| 5     | **Volcan** (magma, obsidienne)  | Aiguillages                  | Colosse de lave    |
| 6     | **Singularité** (trou noir)     | Orbite (tirs courbés)        | Colosse final      |

- **12 niveaux par monde** (11 niveaux + boss), soit **72 niveaux** en v1.0 ; mondes
  supplémentaires possibles après lancement (contenu frais pour les portails).
- Chaque niveau = **chemin dessiné à la main** + **paramètres de difficulté** (vitesse,
  longueur de chaîne, nombre de couleurs, nombre de chaînes, fréquence des bonus), décrits en
  données (JSON typé, validé au chargement), jamais en code.
- **Courbe de difficulté** : progression en dents de scie (monte sur 3–4 niveaux, puis un
  niveau « respiration ») ; une mécanique nouvelle est d'abord présentée seule, sans
  pression, puis combinée.
- **1 à 3 étoiles** par niveau selon le score ; les étoiles débloquent les cosmétiques (§ 3.6)
  et les mondes bonus. Rejouer un niveau pour la 3ᵉ étoile = rejouabilité.
- **Assistance discrète** : après 3 échecs d'affilée sur un niveau, proposition d'un
  ralentissement léger (le joueur garde le choix) ; aucune difficulté cachée qui triche.

#### Modes et mécaniques (v0.1)

Chaque mode est une **stratégie** branchée sur un moteur commun ; aucun mode ne modifie le
moteur. En v0.2, Ricochet, Aimant, Alchimie, Aiguillages, Orbite et Colosse deviennent des
mécaniques de campagne ; les autres sont les modes Arcade.

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

Recommandation : livrer le **monde 1** et le **Défi du jour** en premier (le moteur
complet), puis un monde par lot, les modes Arcade s'intercalant.

### 3.3 Commandes

| Action                    | Souris / clavier             | Tactile                                      |
| ------------------------- | ---------------------------- | -------------------------------------------- |
| Viser                     | Pointeur                     | Glisser le doigt (ligne de visée)            |
| Tirer                     | Clic gauche, Espace          | Relâcher le doigt                            |
| Échanger bille / suivante | Clic droit, X, C             | Toucher le lanceur ou le bouton « Échanger » |
| Pause                     | Échap, P                     | Bouton pause (≥ 44 × 44 px)                  |
| Viser au clavier (a11y)   | Flèches gauche/droite (+Maj) | —                                            |

La visée tactile se fait **en relâchant**, jamais au toucher, pour qu'on puisse corriger
avant de tirer. Aucune action n'est réservée au survol.

Précisions du lot 2 :

- **Tab n'échange pas** les billes : la touche reste réservée à la navigation au clavier.
- Une **ligne de visée** pointillée, de la couleur de la bille chargée, s'arrête sur la
  première bille qu'elle touche.
- Les touches du jeu sont ignorées quand un champ ou un bouton a le focus (Espace active
  alors le bouton, comme partout ailleurs).
- Le jeu se met en **pause automatiquement** quand l'onglet passe en arrière-plan.

### 3.4 Paramètres et données

- Langue, thème (clair / sombre / système), volume des effets sonores, vibrations, intensité
  des effets (Spectaculaire / Équilibré / Sobre). La réduction des mouvements suit le réglage
  du système (`prefers-reduced-motion`). Livré au lot 3 : fenêtre « Réglages » accessible
  depuis l'accueil et le menu pause, appliquée en direct pendant la partie. Le volume de la
  musique viendra avec la musique.
- Sauvegarde versionnée (migrations) : progression de campagne, étoiles, records, éclats,
  cosmétiques possédés, historique du défi du jour. Stockée via une abstraction
  (`SaveStore`) : `localStorage` sur notre site, stockage du SDK sur les portails qui
  l'imposent. Aucune donnée personnelle.

### 3.5 Direction artistique et destruction

Principe : **chaque bille est un objet physique** qui réagit quand on la détruit. Chaque
monde a sa **matière** et donc sa façon d'exploser : verre et énergie (Nébuleuse), pixels et
traînées lumineuses (Néon), bulles et nuages de lumière (Abysses), éclats facettés
(Joaillerie), roche en fusion (Volcan), aspiration et implosion (Singularité). Le thème
visuel est indépendant du **thème d'interface** clair/sombre : chaque univers a ses deux
variantes.

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

#### Destruction livrée au lot 3 (matière « verre et énergie », monde Nébuleuse)

| Temps          | Effet                                                                                                                            |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| 0 → 80 ms      | Le groupe **se fissure** : billes qui gonflent, fêlures blanches, **arcs électriques** entre les billes                          |
| 80 ms          | Chaque bille **éclate** : éclats de verre triangulaires (vitesse, rotation, freinage), traînées de lumière, halo additif, anneau |
| 80 → 630 ms    | **Onde de choc** qui courbe l'image avec aberration chromatique (WebGL2), **tremblement** de l'écran                             |
| Profondeur ≥ 3 | **Ralenti** (×0,3 pendant 120 ms, retour en 250 ms) et **éclair** blanc                                                          |
| Victoire       | Explosion de lumière depuis le lanceur, onde géante, ralenti, arpège                                                             |
| Défaite        | Secousse et voile rouge, chaîne avalée par le trou, glissando grave                                                              |

Tout grandit avec la profondeur de la réaction : vitesse des éclats, onde, tremblement, note
jouée (gamme pentatonique ascendante), vibration. Le cœur bat quand la tête de chaîne passe
80 % du tracé, de plus en plus vite.

| Intensité     | Éclats / bille | Traînées / bille | Arcs, halo | Tremblement | Ralenti | Distorsion | Particules max |
| ------------- | -------------- | ---------------- | ---------- | ----------- | ------- | ---------- | -------------- |
| Spectaculaire | 12             | 10               | oui        | fort        | oui     | oui        | 900            |
| Équilibré     | 7              | 5                | oui        | moyen       | oui     | non        | 400            |
| Sobre         | 4              | 0                | non        | non         | non     | non        | 150            |

- **Bascule automatique** : après 2 s sous ~40 images/s, l'intensité descend d'un cran pour la
  partie en cours (le réglage du joueur n'est pas modifié).
- **Distorsion** : un second canevas WebGL2 posé sur le plateau n'est affiché que pendant
  une onde de choc ; le reste du temps il est masqué et ne coûte rien. Sans WebGL2, le jeu
  se passe simplement de distorsion.
- **Son** : tir, arrivée de la bille, échange, explosion (bruit de verre filtré + cloche
  inharmonique + impact grave), battement de cœur, victoire, défaite ; tout est synthétisé,
  rien n'est téléchargé. Le contexte audio naît au premier geste du joueur et se tait en
  pause.
- **Vibrations** : motifs croissants avec la profondeur, victoire, défaite (navigateurs qui
  les permettent ; pas d'effet sur iOS).
- Les autres matières (Néon, Abysses, Joaillerie, Volcan, Singularité) arrivent avec leurs
  mondes (lots 6 à 10).

### 3.6 Progression et thèmes à débloquer (v0.2)

- **Thèmes de monde** : débloqués en terminant le monde précédent. Une fois débloqué, un
  thème peut **habiller n'importe quel mode** (Arcade compris).
- **Éclats** : monnaie gagnée en jouant (niveaux, étoiles, défi du jour, objectifs). Ils
  achètent des **cosmétiques** : lanceurs, traînées de tir, « signatures de bris »
  (style d'explosion), fonds animés.
- **Règle d'or** : tout ce qui se débloque est **cosmétique ou du confort**, jamais un
  avantage qui rend un niveau ou un classement plus facile. Tout s'obtient en jouant.
- **Objectifs** (« faire un combo ×5 », « finir un niveau sans échange »…) qui donnent des
  éclats et guident la découverte des mécaniques.

### 3.7 Monétisation et plateformes (v0.2)

Modèle visé : **distribution sur portails de jeux web** (CrazyGames, Poki, GameDistribution,
GamePix…) rémunérés au **partage des revenus publicitaires** servis par leur SDK, plus notre
propre site.

**Emplacements publicitaires** (uniquement aux pauses naturelles, jamais pendant le jeu) :

| Type                   | Moment                                                     | Contrepartie pour le joueur               |
| ---------------------- | ---------------------------------------------------------- | ----------------------------------------- |
| Interstitielle         | Entre deux niveaux, au plus une fois toutes les ~3 minutes | —                                         |
| Récompensée (au choix) | Après une défaite                                          | **Continuer** une fois (la chaîne recule) |
| Récompensée (au choix) | Écran de fin de niveau                                     | **Éclats doublés**                        |
| Récompensée (au choix) | Énigme bloquée                                             | Un **indice**                             |
| Récompensée (au choix) | Boutique de cosmétiques                                    | **Essayer** un cosmétique pour une partie |

- Une publicité récompensée est **toujours un choix**, jamais imposée, et le jeu reste
  entièrement terminable sans en regarder aucune.
- Pendant une publicité : jeu en pause, son coupé, puis reprise propre.
- Bloqueur de publicité : le jeu fonctionne, la récompense est simplement indisponible.

**Exigences techniques des portails** (à vérifier précisément pour chacun au lot portails) :
intégration du SDK, signalement début/fin de partie et des pauses, aucun lien sortant,
aucune publicité tierce, chargement rapide, contrôles tactiles, sauvegarde via le SDK quand
c'est demandé, parfois exclusivité web (Poki) à arbitrer.

**Architecture** : une interface `PlatformAdapter` (publicités, sauvegarde, événements de
partie, langue imposée, invitation au partage) avec une implémentation par cible :
`StandalonePlatform` (notre site, **aucune publicité**, aucun SDK), `CrazyGamesPlatform`,
`PokiPlatform`, `GameDistributionPlatform`… L'implémentation est choisie **au build**
(`vite build --mode crazygames`) : le SDK d'un portail n'est jamais embarqué dans les autres
builds, et la version de notre site garde Lighthouse ≥ 95 sans traceur.

**Notre site** : sans publicité en v1.0 (vitrine, référencement, Lighthouse). Pistes
ultérieures : don volontaire, version premium sans pub sur magasins d'applis (PWA/TWA).

**Arguments de vente auprès des portails** : temps de jeu par session (campagne + objectifs),
rétention J1/J7 (défi du jour, mondes à débloquer), trois langues dont l'indonésien, poids
léger, effets visuels qui se remarquent dans les vignettes et vidéos de présentation.

### 3.8 Distribution

Ordre : notre site d'abord, puis builds portails, puis démo pour le portfolio.

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

- Sur notre site : aucun cookie, aucun traceur, aucun appel réseau tiers. Sur les portails,
  seul le SDK du portail (régie et consentement gérés par lui) est chargé.
- Politique de sécurité du contenu (CSP) stricte, pas de script en ligne.

### 4.7 Compatibilité

- Deux dernières versions de Chrome, Edge, Firefox, Safari ; Safari iOS 16+, Chrome Android.
- Rendu WebGL2 avec repli Canvas 2D si indisponible.

## 5. Architecture technique

### 5.1 Pile

- **Vue 3.5.43** (version stable maintenue), **TypeScript 6.0.3** strict, **Vite 8.3.4**.
  TypeScript 7 (compilateur natif) n'est pas retenu tant que `vue-tsc` ne le prend pas en
  charge.
- `vue-i18n` 11 (messages précompilés au build : pas de compilateur à l'exécution, pas
  d'`eval`), pas de routeur ni de Pinia au départ : services orientés objet injectés par
  `provide/inject` (`AppServices`).
- Qualité : ESLint 10 (règles typées strictes + `vue/no-bare-strings-in-template`), Prettier,
  `vue-tsc`, Vitest 5, Playwright 1.64, Lighthouse 13 (`npm run lighthouse`).
- **Socle livré au lot 0** : `KeyValueStorage` (stockage qui ne lève jamais, repli mémoire),
  `SettingsService` (langue, thème, intensité des effets, validés à la lecture),
  `ThemeController` (préférence système / clair / sombre), script `theme-boot.js` qui
  applique thème et langue avant le premier affichage, sans script en ligne.
- **CSP** stricte ajoutée à la page construite (`default-src 'self'`, ni script ni style en
  ligne) ; les gabarits n'utilisent donc jamais d'attribut `style`.

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
- **Campagne en données** : `World`, `LevelDefinition` (chemin + paramètres de difficulté),
  `LevelCatalog` chargé par monde ; `Progression` (étoiles, déblocages) et `Wallet`
  (éclats) ne dépendent que de `SaveStore`.
- **Plateforme derrière une interface** (`PlatformAdapter`, § 3.7) : publicités, sauvegarde
  et événements de partie ; le jeu ne connaît aucun SDK. `AdPolicy` décide _quand_ une
  publicité est permise (fréquence, pauses naturelles), séparée de _comment_ elle s'affiche.
- **Thèmes de monde = stratégies** (`WorldTheme`) : palette, matière des billes, signature
  de bris, fond ; chargés à la demande.

### 5.3 Moteur (livré au lot 1)

TypeScript pur dans `src/engine/` : aucune dépendance à Vue ni au DOM, entièrement testé.

| Classe           | Responsabilité                                                                                                    |
| ---------------- | ----------------------------------------------------------------------------------------------------------------- |
| `Vec2`           | Vecteur 2D immuable (unités du plateau, y vers le bas)                                                            |
| `Path`           | Tracé paramétré par l'abscisse curviligne `s` (entrée = 0, trou = longueur) ; courbes de Bézier aplaties une fois |
| `Ball`           | Bille : identifiant, couleur (`Tone`), position `s` ; seule `Chain` la déplace (vue publique `BallView`)          |
| `BallFactory`    | Identifiants uniques par partie, pour que le rendu suive chaque bille                                             |
| `ChainGenerator` | Couleurs d'une chaîne selon une recette (longueur, nombre de couleurs, probabilité de répétition)                 |
| `Chain`          | Avancée du segment arrière, rappel des segments de même couleur, jonctions, insertion, explosions, profondeur     |
| `Shooter`        | Position, visée, bille chargée et suivante, échange, cadence de tir, couleurs tirées parmi celles en jeu          |
| `Projectile`     | Bille en vol                                                                                                      |
| `Scoring`        | Score, série, meilleure profondeur                                                                                |
| `Game`           | Partie : pas fixe de 1/120 s, commandes (viser, échanger, tirer), victoire, défaite, événements de domaine        |

Règles de simulation :

- **Pas fixe** de 1/120 s avec accumulateur (au plus 0,25 s simulée par image) : mêmes
  commandes + même graine = même partie, quelle que soit la fréquence d'affichage.
- Billes rangées de la queue à la tête ; deux billes **se touchent** à 2 rayons d'écart.
  Seul le **segment arrière** est poussé (vitesse d'entrée rapide puis de croisière). Un
  segment dont la première bille a la couleur de la dernière bille du segment derrière lui
  **recule** jusqu'à la jonction, qui peut exploser à son tour.
- **Insertion** : la bille tirée se place avant ou après la bille touchée selon le côté de
  l'impact (projection sur la tangente) et pousse les billes devant elle.
- **Profondeur** : remise à 1 quand plus aucun segment ne recule.
- Les billes encore dans le tunnel d'entrée (`s < 0`) ne peuvent pas être touchées.
- Événements : `fired`, `inserted` (avec point de départ, pour l'animation), `missed`,
  `exploded` (billes, positions, cause, profondeur, points, série), `ended`.

### 5.4 Couche de jeu (livrée au lot 2)

Dans `src/play/`, entre le moteur et Vue :

| Classe                                | Responsabilité                                                                                                                   |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `PlaySession`                         | Partie en cours : jeu, boucle, rendu, mouvement affiché ; commandes du joueur ; état du HUD                                      |
| `Renderer` / `CanvasRenderer`         | Interface de rendu et implémentation Canvas 2D (le WebGL2 des effets arrive au lot 3)                                            |
| `BallSprites`                         | Billes de verre pré-rendues par couleur à la résolution de l'écran, avec leur **symbole gravé**                                  |
| `BallMotion`                          | Lissage visuel sans toucher la simulation : glissement des billes poussées, arrivée de la bille tirée, chaîne avalée par le trou |
| `Effects`                             | Retour d'explosion provisoire (anneau, étincelles, points, « ×N ») ; remplacé au lot 3                                           |
| `PointerControls`, `KeyboardControls` | Souris, tactile, stylet et clavier vers les commandes `PlayCommands`                                                             |
| `GameLoop`                            | Boucle `requestAnimationFrame`, durée d'image plafonnée                                                                          |
| `Palette`                             | Couleurs lues dans les jetons CSS : le plateau suit les thèmes clair et sombre                                                   |

- Les **niveaux sont des données** (`src/levels/LevelDefinition.ts`) : tracés en polylignes
  ou courbes de Bézier, paramètres de difficulté, valeurs par défaut. Niveau de
  démonstration : spirale de 1,55 tour vers un trou proche du lanceur, 48 billes, 4 couleurs.
- Le plateau logique (1000 × 1000) est mis à l'échelle et centré dans l'espace disponible.
  **À améliorer au lot 4** : en portrait sur téléphone, il reste de la place au-dessus et
  au-dessous ; les niveaux de campagne pourront proposer un plateau plus haut que large.
- L'écran de jeu, le moteur et les niveaux sont **chargés à la demande** : l'accueil reste à
  47 Ko de JS compressé, l'écran de jeu en ajoute 10.

### 5.5 Effets, son et vibrations (livrés au lot 3)

| Classe            | Responsabilité                                                                    |
| ----------------- | --------------------------------------------------------------------------------- |
| `EffectProfile`   | Valeurs de chaque intensité, effet de `prefers-reduced-motion`, cran inférieur    |
| `Destruction`     | Fissures, arcs, éclats, traînées, halos, anneaux, points, ondes, éclair, secousse |
| `Shake`           | Tremblement par « traumatisme » qui décroît (amplitude ∝ traumatisme²)            |
| `TimeWarp`        | Ralenti : la simulation reçoit des images plus courtes, elle reste exacte         |
| `FrameMonitor`    | Mesure la fréquence d'images et demande de baisser l'intensité                    |
| `DistortionLayer` | Passe WebGL2 (ondes + aberration chromatique) sur un canevas superposé            |
| `SoundEngine`     | Synthèse Web Audio de tous les sons, déverrouillage au premier geste              |
| `Haptics`         | Motifs de vibration, désactivables                                                |

Le son et les vibrations sont partagés par toutes les parties de la visite
(`sharedFeedback`) et ne sont téléchargés qu'avec l'écran de jeu.

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

- Les 6 mondes (72 niveaux) et les modes Arcade jouables de bout en bout, au clavier, à la
  souris et au doigt ; campagne entièrement terminable sans regarder de publicité.
- Build « site » sans aucun SDK ni publicité ; builds portails conformes aux exigences de
  chaque portail.
- Lighthouse ≥ 95 × 4 sur mobile ; aucun défilement horizontal de 320 à 1920 px.
- Trois langues complètes ; thèmes clair et sombre conformes.
- Effets de destruction aux trois niveaux d'intensité, respect de `prefers-reduced-motion`.

## 9. Lots et planning (provisoire)

| Lot  | Contenu                                                                          |
| ---- | -------------------------------------------------------------------------------- |
| 0 ✅ | Dépôt, outillage, cahier des charges, accueil provisoire (i18n, thèmes)          |
| 1 ✅ | Moteur : chemin, chaîne, tir, insertion, correspondances, recul, combos, graine  |
| 2 ✅ | Interface jouable : écran de jeu, rendu, commandes, HUD, pause, fin, niveau démo |
| 3 ✅ | Destruction et son : bris, ondes de choc, ralentis, synthèse audio, intensités   |
| 4    | Campagne : mondes, niveaux en données, étoiles, sauvegarde ; monde 1 Nébuleuse   |
| 5    | Progression : éclats, objectifs, cosmétiques, thèmes débloquables ; Défi du jour |
| 6–10 | Mondes 2 à 6 (une mécanique et un thème par lot), modes Arcade intercalés        |
| 11   | Accessibilité, SEO, tests e2e, Lighthouse, documentation, 1.0.0 (notre site)     |
| 12   | Portails : `PlatformAdapter` par portail, publicités, builds dédiés              |
| 13   | Démo portfolio                                                                   |

## 10. Hors périmètre (v1)

Comptes, classements en ligne, multijoueur en réseau, achats intégrés.

## 11. Évolutions envisagées

Éditeur de chemins, classements en ligne du défi du jour, application installable (PWA).

## 12. Journal des versions du document

| Version | Date       | Changements                                                                                                                            |
| ------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| 0.1     | 12/10/2026 | Création : objectifs, positionnement, règles, 12 modes proposés.                                                                       |
| 0.2     | 12/10/2026 | Campagne (6 mondes, 72 niveaux), thèmes à débloquer, éclats et cosmétiques, monétisation par portails (`PlatformAdapter`), lots revus. |
| 0.3     | 12/10/2026 | Lot 0 livré : pile et versions, socle (réglages, thèmes, stockage), CSP, Lighthouse 100 × 4 mobile et ordinateur.                      |
| 0.4     | 12/10/2026 | Lot 1 livré : moteur (§ 5.3), règles de score et de génération précisées (§ 3.1).                                                      |
| 0.5     | 12/10/2026 | Lot 2 livré : couche de jeu (§ 5.4), commandes précisées (§ 3.3), niveaux en données.                                                  |
| 0.6     | 12/10/2026 | Lot 3 livré : destruction détaillée (§ 3.5), réglages (§ 3.4), effets et son (§ 5.5).                                                  |
