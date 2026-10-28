# Cahier des charges — Ballmania

| Version | Date       | Statut                               |
| ------- | ---------- | ------------------------------------ |
| 1.21    | 28/10/2026 | Tableaux des mondes (étape 9 sur 11) |

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
6. **Qualité web exemplaire** : Lighthouse à 100 dans les quatre catégories, sur mobile (la
   plus faible de trois mesures) comme sur ordinateur (règle du 22/10/2026, qui remplace 98 en
   Performance et 95 ailleurs).
7. **International** : français, anglais et indonésien dès le lancement, russe depuis la
   v1.7.5.
8. **Monétisable** : prêt pour les portails de jeux web, avec publicités respectueuses.

## 2. Positionnement marketing

### 2.1 Cibles

| Segment                     | Attentes                                        | Réponse produit                                      |
| --------------------------- | ----------------------------------------------- | ---------------------------------------------------- |
| Joueurs occasionnels (25+)  | Partie courte, gratuite, sans inscription       | Un clic pour jouer, parties de 2 à 6 min             |
| Nostalgiques du genre       | Retrouver les sensations, avec de la nouveauté  | Visée et règles familières, modes inédits            |
| Joueurs mobiles (Indonésie) | Jouer sur un téléphone modeste, réseau variable | Mobile d'abord, visée au doigt, bundle léger         |
| Joueurs « spectacle »       | Du feedback, de la puissance ressentie          | Destruction physique, ralentis, ondes de choc        |
| Joueurs russophones         | Un jeu dans leur langue, sur leurs portails     | Russe complet (v1.7.5), portails russophones ensuite |

**Pourquoi l'indonésien** : l'Indonésie est l'un des plus grands marchés du jeu mobile, joué
majoritairement sur Android d'entrée de gamme. Cela impose **légèreté**, **jouabilité
tactile** et **dégradation gracieuse des effets**, ce qui profite à tous les marchés.

**Pourquoi le russe** (v1.7.5) : le russe est lu bien au-delà de la Russie (Biélorussie,
Kazakhstan, Kirghizistan…), et il prépare une publication sur les portails russophones,
Yandex Games et les jeux VK, prévue plus tard avec sa propre feuille de route. Dès la
v1.7.5, ces joueurs ont le jeu dans leur langue sur notre site, CrazyGames et Playgama.

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

- Les noms des jeux de référence du genre ne sont **jamais utilisés**, ni dans le jeu, ni
  dans le code, ni dans la documentation, ni dans le référencement : ce sont des marques de
  leurs éditeurs.
- Les règles d'un jeu ne sont pas protégeables, mais **l'apparence** l'est (_Tetris Holding
  v. Xio Interactive_, 2012) : pas de grenouille-idole, pas de temple de pierre ni d'univers
  précolombien, pas de cartouches de niveaux imités. Univers, palette, lanceur, chemins et noms
  de modes sont **propres à Ballmania**.
- Nom de travail : **Ballmania**, lisible dans les quatre langues. Vérification de
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
  plateau (pas de tir impossible en fin de manche). **Tirage plus juste** (v1.7.3) : après
  deux tirs de suite d'une couleur sans paire à l'écran, la bille suivante est d'une couleur
  qui en a une (sauf en Joaillerie, où les couleurs se mélangent). Mesuré au robot sur le
  monde 1, le hasard pèse déjà peu (le dixième le plus malchanceux des parties fait 91 % du
  score médian) et le tirage n'y change presque rien : c'est un filet contre les rares
  sécheresses, la même graine rejouant toujours la même partie.
- **Bonus** apparaissant sur certaines billes, déclenchés quand elles explosent : bombe
  (rayon), ralenti, recul de la chaîne, foudre (toutes les billes d'une couleur), joker
  multicolore.
- **Score** (précisé au lot 1) : chaque explosion rapporte **billes × 10 × profondeur** de
  la réaction en chaîne (1 pour la première explosion, +1 pour chaque explosion qui en
  découle). Une explosion provoquée directement par un tir prolonge la **série** ; à partir
  du 3ᵉ tir réussi consécutif, chaque tir ajoute **20 × (série − 2)**. Un tir qui sort du
  plateau ou ne fait rien exploser casse la série. **Bonus de fin de niveau** (lot 4,
  revu en v1.7.3) : 300 points, plus **40 points par seconde** gagnée sous le temps de
  référence du niveau, 1,2 fois le temps médian d'un robot qui joue comme une personne posée
  (une décision toutes les 1,5 s, des tirs précis, des réactions en chaîne préparées),
  mesuré sur les trois formes de plateau (`src/levels/calibration.data.ts`). La vitesse
  compte enfin, et une partie rapide rattrape une donne malchanceuse. Le panneau de victoire
  le dit : « Temps : +600 (15 s d'avance) » au lieu du bonus fixe. Avant, 10 points par
  seconde sous 55 % du temps que mettrait la chaîne à atteindre le trou sans être touchée :
  le bonus restait presque toujours à 300.
  **Ricochet** (lot 6) : un tir qui a rebondi sur n miroirs multiplie les points de ses
  billes par n + 1 (la série s'ajoute ensuite sans multiplicateur).
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
  et les mondes bonus. Rejouer un niveau pour la 3ᵉ étoile = rejouabilité. **Seuils**
  (v1.7.3) calibrés niveau par niveau sur un robot qui joue comme une personne posée (une
  décision toutes les 1,5 s, tirs précis, réactions en chaîne préparées), bonus de temps
  compris : la 3ᵉ étoile pour environ 30 % de ses victoires, la 2ᵉ pour environ 80 % et à
  85 % de la 3ᵉ au plus (lisibles sur la jauge), arrondis à 50 points en dessous. Vérifié sur
  d'autres parties que celles du calibrage : trois étoiles pour 22 à 34 % des parties posées
  et 54 à 66 % des parties appliquées selon le monde (0 % avant, même pour un robot
  rapide), deux étoiles pour 74 à 83 % des parties posées. Après un changement de niveau,
  `CALIBRATE=1 npx vitest run tests/levels/calibration.test.ts` recalcule les valeurs ; un
  test de garde veille sur le monde 1.
- **Assistance discrète** : après 3 échecs d'affilée sur un niveau, proposition d'un
  ralentissement léger (le joueur garde le choix) ; aucune difficulté cachée qui triche.
  **Livrée au lot 5** : après 3 défaites d'affilée sur un niveau de campagne, l'écran de fin
  propose « Réessayer avec de l'aide » (chaîne 15 % moins rapide pour cet essai, signalée
  par « Aide active »). Les étoiles restent attribuées normalement : l'aide est visible et
  choisie, elle ne triche pas. Pas d'aide sur le défi du jour (classement équitable). Au monde 1
  (v1.8.1, § 3.17), elle s'offre dès la deuxième défaite et ralentit la chaîne de 25 %.

#### Monde 1 « Nébuleuse », livré au lot 4

- **Tracés par recette** plutôt qu'en coordonnées : spirale (nombre de tours, rayons de
  départ et d'arrivée, angle de départ, sens, « carré » de 1 = ellipse à 3 = rectangle
  arrondi, 1 ou 2 bras entrelacés) ou serpentin (rangées en lacets, lanceur en bas). Une
  même recette produit **cinq plateaux**, au petit côté toujours de 1000 (les tracés gardent
  leurs écarts, seul le grand côté s'étire) : carré (1000 × 1000), portrait (1000 × 1400) et
  paysage (1400 × 1000) pour les tablettes, **haut (1000 × 1700)** pour les téléphones tenus
  droits, **large (1700 × 1000)** pour les téléphones couchés et les fenêtres d'ordinateur
  (v1.5.0). Au lancement d'une partie, le jeu dessine le niveau sur chacun et garde celui qui
  le montre le plus grand sur cet écran ; entre des plateaux presque à égalité (2 % sur
  téléphone, 12 % quand les billes dépassent 14 px de rayon), celui qui remplit le plus
  l'écran.
- **Décor (v1.7)** : une nébuleuse en couches, peinte une fois par taille d'écran — ciel
  violet profond, nuages de couleur, voiles de gaz (bruit fractal sur une petite grille,
  étiré en douceur), galaxie lointaine, planète géante et lune à anneaux dans les coins,
  trois profondeurs d'étoiles (lointaines et moyennes peintes, proches qui dérivent dans
  l'ambiance) et vignette. Le plateau reste un ciel de nuit dans les deux thèmes : son
  canevas lit les couleurs du cosmos (`[data-art='night']`), l'affichage autour suit le
  thème et prend des pastilles claires en thème clair. Sillon sombre bordé de violet sous
  la chaîne.
- Chaque niveau est vérifié automatiquement sur les cinq plateaux : tracé dans le plateau,
  aucun chevauchement entre deux portions de tracé, place autour du lanceur, longueur
  suffisante, partie qui démarre ; chaque énigme est résolue par le vrai moteur sur chacun.

| Niveau | Tracé                                    | Billes        | Couleurs | Vitesse | Conseil affiché          |
| ------ | ---------------------------------------- | ------------- | -------- | ------- | ------------------------ |
| 1      | Spirale 1,25 tour (vitrine)              | 36            | 3        | 30      | Viser et tirer           |
| 2      | Spirale 1,35 tour, sens inverse          | 34            | 3        | 34      | Échanger les billes      |
| 3      | Serpentin 3 rangées + **jeune Colosse**  | 24 + renforts | 3        | 30      | Blesser le Colosse       |
| 4      | Spirale 1,5 tour (respiration)           | 40            | 3        | 44      | Bille Recul              |
| 5      | Spirale « carrée » 1,45 tour             | 44            | 4        | 50      | Réaction en chaîne       |
| 6      | Serpentin 3 rangées (respiration)        | 38            | 4        | 42      | Bille Ralenti            |
| 7      | Double spirale, 2 chaînes                | 2 × 22        | 4        | 44      | Deux chaînes, deux trous |
| 8      | Spirale 1,7 tour, sens inverse           | 50            | 4        | 58      | Bille Arc-en-ciel        |
| 9      | Serpentin 4 rangées                      | 52            | 4        | 48      | —                        |
| 10     | Spirale arrondie (respiration)           | 46            | 4        | 50      | Bille Laser              |
| 11     | Spirale carrée 1,65 tour                 | 54            | 5        | 68      | —                        |
| 12     | Spirale 1,6 tour + **Colosse stellaire** | 26 + renforts | 4        | 26      | Blesser le Colosse       |

- **Conseil affiché** : une pastille au-dessus des boutons pendant les six premières secondes
  du niveau, annoncée aux lecteurs d'écran ; avec le mouvement réduit, elle reste immobile
  ses six secondes (v1.7.4 : elle disparaissait aussitôt).
- **Colosse** : il pousse la chaîne par l'arrière (c'est lui qui avance, pas la queue de
  chaîne). Une explosion à moins de 3 diamètres de bille de son corps lui retire
  « billes × profondeur » points de vie (60 au total). À chaque tiers de sa vie, il accélère
  (× 1,25 puis × 1,5), crache 6 billes devant lui et rugit ; une chaîne vide repousse
  aussitôt. Quand il tombe, toutes les billes restantes explosent en cascade. S'il atteint
  le trou, la partie est perdue.
- **Jeune Colosse** (v1.7.4), au 1-3, pour qu'un boss arrive dès les premières minutes :
  le même en plus petit (1,6 rayon de bille au lieu de 2,3), 20 points de vie, une seule
  phase (il n'accélère jamais), 4 billes crachées quand sa chaîne s'épuise ; trois runes et
  un grand œil au lieu de six runes. Son nom s'affiche sur sa barre de vie (« Jeune Colosse
  stellaire »), le panneau du 1-2 l'annonce (« Boss : Jeune Colosse stellaire ») et il
  compte pour l'objectif « Vaincre un Colosse ». Il revient adulte au 1-12 ; le 1-4 souffle
  ensuite à trois couleurs et enseigne la bille Recul, la quatrième couleur arrive au 1-5.
  Robots occasionnel, humain et appliqué, six parties sur chacun des cinq plateaux : 90
  victoires sur 90, en 27 à 34 s, danger moyen de 0,21 à 0,39 du tracé contre 0,46 à 0,72
  au 1-12.
- **Équilibrage** : un robot « joueur occasionnel » (un tir toutes les 1,2 s, visée
  imprécise, stratégie gloutonne) joue chaque niveau 6 fois à chaque vérification. Il doit
  gagner au moins 4 parties sur 6 ; la pression (avancée maximale de la tête de chaîne)
  monte en dents de scie d'environ 40 % au niveau 1 à 75 % contre le Colosse.
- **Étoiles** : 1 pour finir ; 2 et 3 selon le score, seuils = billes × 30 + 300 et
  billes × 48 + 700, arrondis à 50 (le Colosse compte pour un tiers de ses points de vie en
  billes). Le robot obtient en moyenne entre 1 et 2 étoiles ; la 3ᵉ demande des réactions
  en chaîne. **À affiner en tests joueurs.**
- La carte de campagne présente les six mondes et leur mécanique ; tous sont jouables
  depuis le lot 10.

#### Monde 2 « Néon », livré au lot 6

- **Miroirs** : murs (segments) et prismes (polygones réguliers, fixes ou tournants) qui
  renvoient les tirs selon la loi de la réflexion. Ils sont décrits en fractions du
  plateau et placés **hors du tracé** (coins des spirales, côtés et coins bas des
  serpentins) : un tir direct reste toujours possible, le tir en bande est la récompense.
  Les tests de géométrie vérifient, sur les deux plateaux, qu'ils restent dans le plateau,
  à distance du tracé (y compris le disque balayé par un prisme qui tourne) et du lanceur.
- **Ligne de visée** : elle suit les rebonds (jusqu'à 2) et marque chaque point d'impact ;
  elle est calculée par la même règle de rebond que les tirs, elle ne ment jamais.
- Au-delà de 6 rebonds, la bille se brise (tir manqué) : pas de ping-pong sans fin.
- Retour visuel et sonore : étincelles et anneau au rebond, « ping » qui monte d'un cran à
  chaque rebond, étiquette « ×n » avec flèche de rebond sur l'explosion.

| Niveau | Tracé                          | Miroirs                             | Billes        | Couleurs | Vitesse | Conseil            |
| ------ | ------------------------------ | ----------------------------------- | ------------- | -------- | ------- | ------------------ |
| 1      | Spirale 1,3 tour               | 4 murs d'angle                      | 34            | 4        | 34      | Ricochet           |
| 2      | Serpentin 3 rangées            | Murs latéraux                       | 38            | 4        | 38      | —                  |
| 3      | Spirale arrondie, sens inverse | 4 prismes carrés fixes              | 40            | 4        | 46      | Prismes            |
| 4      | Double spirale                 | 4 murs d'angle                      | 2 × 26        | 4        | 40      | —                  |
| 5      | Serpentin 4 rangées            | Murs latéraux + 2 prismes tournants | 48            | 4        | 50      | Prismes tournants  |
| 6      | Spirale 1,4 tour (respiration) | 4 murs d'angle                      | 40            | 4        | 38      | —                  |
| 7      | Spirale carrée, sens inverse   | 4 prismes tournants                 | 48            | 4        | 60      | —                  |
| 8      | Serpentin 3 rangées            | Murs latéraux + 2 prismes tournants | 40            | 5        | 44      | —                  |
| 9      | Double spirale                 | 4 prismes tournants                 | 2 × 30        | 4        | 46      | —                  |
| 10     | Spirale arrondie (respiration) | 4 murs d'angle                      | 46            | 4        | 44      | —                  |
| 11     | Spirale carrée 1,7 tour        | 4 prismes triangulaires tournants   | 56            | 5        | 62      | —                  |
| 12     | Spirale + **Colosse prisme**   | 4 prismes tournants                 | 28 + renforts | 4        | 24      | Blesser le Colosse |

- **Équilibrage** (robot occasionnel, qui ne cherche jamais le rebond) : tous les niveaux
  gagnés au moins 4 fois sur 6 ; pression de 40 à 78 % selon les niveaux, respirations
  aux niveaux 6 et 10 ; le Colosse prisme (66 points de vie) reste le niveau le plus tendu
  du jeu. Les joueurs qui exploitent les rebonds marquent nettement plus.
- Terminer la Nébuleuse ouvre le monde Néon (et débloque son plateau, § 3.6).

#### Monde 3 « Abysses », livré au lot 7

- **Aimant** : on l'arme (bouton « Aimant » ou touche M ; un second appui le désarme),
  puis le prochain « tir » (clic, relâcher le doigt, Espace) **aspire** la bille que vise
  la ligne de visée au lieu d'en lancer une. Aucun geste nouveau à apprendre, sur aucun
  appareil. Armé, la ligne devient un trait cyan animé terminé par un anneau autour de la
  bille ciblée ; sans bille visée, l'aimant reste armé.
- La bille aspirée **rejoint le lanceur** (animation courbe avec bulles, son de succion) :
  elle devient la bille chargée, l'ancienne devient la suivante, la suivante est perdue.
  Elle garde sa couleur même si c'était la dernière de cette couleur sur le tracé.
- Le trou laissé se comporte comme tout autre : si les billes de part et d'autre ont la
  même couleur, elles se rejoignent et peuvent exploser. **Retirer la bille qui sépare
  deux couleurs identiques** est le cœur stratégique du monde.
- **Charges** : 1 à 3 au départ selon le niveau, 3 au maximum ; une charge revient toutes
  les 3 à 6 explosions (réactions comprises). Affichées sur le bouton (pastilles) et
  annoncées aux lecteurs d'écran.

| Niveau | Tracé                          | Charges / recharge | Billes        | Couleurs | Vitesse | Conseil               |
| ------ | ------------------------------ | ------------------ | ------------- | -------- | ------- | --------------------- |
| 1      | Spirale 1,3 tour               | 3 / 3 explosions   | 36            | 4        | 40      | Aimant                |
| 2      | Serpentin 3 rangées            | 3 / 3              | 38            | 4        | 46      | Séparer deux couleurs |
| 3      | Spirale arrondie, sens inverse | 2 / 4              | 44            | 4        | 54      | —                     |
| 4      | Double spirale                 | 2 / 4              | 2 × 28        | 4        | 48      | —                     |
| 5      | Serpentin 4 rangées            | 2 / 4              | 50            | 5        | 52      | —                     |
| 6      | Spirale 1,4 tour (respiration) | 3 / 3              | 42            | 4        | 44      | —                     |
| 7      | Spirale carrée, sens inverse   | 2 / 5              | 52            | 5        | 64      | —                     |
| 8      | Serpentin 3 rangées            | 1 / 5              | 40            | 5        | 54      | —                     |
| 9      | Double spirale                 | 2 / 5              | 2 × 30        | 4        | 50      | —                     |
| 10     | Spirale arrondie (respiration) | 3 / 4              | 46            | 4        | 50      | —                     |
| 11     | Spirale 1,75 tour              | 1 / 6              | 54            | 5        | 70      | —                     |
| 12     | Spirale + **Colosse abyssal**  | 2 / 4              | 30 + renforts | 5        | 26      | Blesser le Colosse    |

- **Équilibrage** : le robot apprend à se servir de l'aimant (il aspire la bille qui sépare
  deux couleurs identiques, la plus proche du trou) ; il gagne chaque niveau au moins 5 fois
  sur 6. L'aimant est un outil puissant : sur les spirales, où le lanceur central voit
  presque toute la chaîne, la pression reste modérée (35 à 45 %) malgré des vitesses plus
  élevées ; elle monte à 55-70 % sur les serpentins et doubles spirales et à 85 % contre le
  Colosse. **À confirmer en tests joueurs**, qui n'auront pas l'efficacité du robot.
- Terminer Néon ouvre les Abysses et débloque le plateau « Abysses » (rayons de lumière,
  plancton luminescent, fond rocheux).

#### Monde 4 « Joaillerie », livré au lot 8

- **Décision : les couleurs se mélangent comme la lumière** (synthèse additive), ce qui
  utilise exactement les six couleurs du jeu : trois **primaires** (rubis, lime, violet) et
  trois **mélanges** (rubis + lime = ambre, lime + violet = cyan, rubis + violet = rose).
- Une primaire tirée sur une **autre primaire fusionne** avec elle au lieu de s'insérer ;
  sur la même primaire ou sur un mélange, elle s'insère comme d'habitude. Les mélanges ne
  se tirent pas : on les fait exploser en en créant trois côte à côte.
- Le lanceur ne propose que des primaires **utiles** : celles présentes sur le tracé et
  celles dont sont faits les mélanges présents (la règle « jamais de couleur inutile »).
- Les mélanges arrivent **toujours par paires** : une seule fusion bien placée à côté
  complète le trio. Quand la paire est bordée d'une primaire qui n'en est pas un
  ingrédient, il faut un coup en deux temps (tirer un ingrédient sur la paire pour
  l'insérer à côté, puis le fusionner).
- **Aides** : légende des trois mélanges en permanence dans le bandeau ; la ligne de visée
  se termine par un anneau de la couleur que prendra la bille touchée ; effet de fusion
  (anneau du nouveau mélange, étincelles des deux couleurs d'origine) et son de deux notes
  qui se rejoignent.
- **Rythme** : c'est le monde de la réflexion. Une fusion ratée transforme une bonne bille
  en mélange ; les vitesses sont donc plus basses que dans les mondes précédents.

| Niveau | Tracé                                    | Mélanges présents | Billes        | Vitesse | Conseil                    |
| ------ | ---------------------------------------- | ----------------- | ------------- | ------- | -------------------------- |
| 1      | Spirale 1,3 tour                         | aucun (primaires) | 30            | 26      | Les mélanges               |
| 2      | Serpentin 3 rangées                      | ambre             | 30            | 28      | Trois mélanges côte à côte |
| 3      | Spirale arrondie, sens inverse           | cyan              | 36            | 30      | —                          |
| 4      | Double spirale                           | rose              | 2 × 20        | 30      | —                          |
| 5      | Serpentin 4 rangées                      | ambre, cyan       | 36            | 30      | —                          |
| 6      | Spirale 1,4 tour (respiration)           | ambre             | 34            | 28      | —                          |
| 7      | Spirale carrée, sens inverse             | les trois         | 38            | 36      | —                          |
| 8      | Serpentin 3 rangées                      | cyan, rose        | 34            | 36      | —                          |
| 9      | Double spirale                           | ambre, rose       | 2 × 24        | 36      | —                          |
| 10     | Spirale arrondie (respiration)           | rose              | 38            | 32      | —                          |
| 11     | Spirale 1,75 tour                        | les trois         | 42            | 42      | —                          |
| 12     | Spirale + **Colosse de cristal** (56 PV) | ambre             | 24 + renforts | 20      | Blesser le Colosse         |

- **Équilibrage** : le robot a dû apprendre l'alchimie (viser ce que la ligne touche
  vraiment, fusionner seulement à côté de sa couleur, coup en deux temps, tir sans
  dommage à côté d'un mélange). Il gagne chaque niveau au moins 4 fois sur 6 ; pression de
  35 à 60 %, 66 % contre le Colosse. Trois défauts de conception ont été corrigés grâce à
  lui : le lanceur proposait des primaires devenues inutiles, les mélanges isolés
  demandaient quatre tirs, et chaque visée imprécise créait un mélange.
- Terminer les Abysses ouvre la Joaillerie et débloque le plateau « Joaillerie » (velours,
  reflets de facettes, filet doré, éclats).

#### Monde 5 « Volcan », livré au lot 9

- **Décision : aiguillages à dilemme.** Certaines rangées des serpentins se divisent en
  une **voie principale** (le raccourci) et un **détour** qui plonge vers le lanceur. Sur le
  raccourci, la lave est en fusion : les billes qui y explosent **valent double**. Le détour,
  plus long, donne du temps. Points ou temps : c'est au joueur de choisir.
- On bascule un aiguillage en touchant son levier (ou avec S, qui bascule le prochain
  aiguillage libre) **tant que la tête de la chaîne ne l'a pas atteint** ; ensuite il est
  verrouillé (son sourd si l'on insiste). Par défaut, la lave prend le raccourci.
- Rendu : la branche non empruntée en pointillés, le raccourci actif qui rougeoie, un
  levier avec une flèche vers la branche choisie (grisé une fois verrouillé), « ×2 » couleur
  magma sur les explosions du raccourci, claquement mécanique, annonce aux lecteurs d'écran.
- Moteur : la chaîne reste un ruban à une dimension ; basculer avant le passage de la tête
  ne change que la géométrie devant elle, rien ne bouge à l'écran. Les tests de géométrie
  contrôlent chaque tracé dans ses deux versions (tous raccourcis, tous détours).
- Les niveaux suivants mêlent les mécaniques des mondes précédents (aimant aux niveaux 4
  et 10, miroirs aux niveaux 7 et 9).

| Niveau | Tracé (rangées / aiguillages)                    | Autre mécanique          | Billes        | Vitesse | Conseil             |
| ------ | ------------------------------------------------ | ------------------------ | ------------- | ------- | ------------------- |
| 1      | 3 / rangée 1                                     | —                        | 36            | 40      | Aiguillages         |
| 2      | 3 / rangées 1 et 2                               | —                        | 38            | 44      | Raccourci en fusion |
| 3      | 4 / rangée 2                                     | —                        | 44            | 46      | —                   |
| 4      | 3 / rangée 2                                     | Aimant                   | 40            | 48      | —                   |
| 5      | 4 / rangées 1 et 3                               | —                        | 48            | 42      | —                   |
| 6      | 3 / rangées 1 et 2 (respiration)                 | —                        | 36            | 40      | —                   |
| 7      | 3 / rangée 1                                     | Murs latéraux            | 42            | 46      | —                   |
| 8      | 4 / rangées 1, 2 et 3                            | —                        | 46            | 40      | —                   |
| 9      | 3 / rangée 2                                     | Murs + prismes tournants | 40            | 42      | —                   |
| 10     | 4 / rangées 2 et 3 (respiration)                 | Aimant                   | 44            | 46      | —                   |
| 11     | 4 / rangées 1, 2 et 3                            | —                        | 46            | 46      | —                   |
| 12     | 3 / rangées 1 et 2 + **Colosse de lave** (44 PV) | —                        | 30 + renforts | 20      | Blesser le Colosse  |

- **Équilibrage** : le robot, prudent, envoie la lave dans chaque détour libre. Il gagne
  chaque niveau au moins 4 fois sur 6 ; pression de 40 à 82 %, la plus forte du jeu, comme
  il convient à l'avant-dernier monde. Les serpentins à 4 rangées (lanceur loin des rangées
  du haut) ont demandé des vitesses plus basses.
- Terminer la Joaillerie ouvre le Volcan et débloque le plateau « Volcan » (basalte,
  fissures de magma, braises).

#### Monde 6 « Singularité », livré au lot 10

- **Gravité** : un trou noir occupe le centre du plateau ; les chaînes en sortent d'un
  **portail** et spiralent jusqu'à lui. Il attire chaque tir (attraction en 1/d², adoucie
  près du centre) : **la ligne de visée suit exactement la courbe** que suivra la bille, car
  elle est calculée avec la même intégration que le vol. Un tir qui passe trop près de
  l'horizon est **avalé** (anneau qui se referme, soupir grave) ; un tir qui tourne plus de
  4 secondes est perdu.
- **Décision : orbite automatique.** Le lanceur glisse seul, à vitesse constante, sur un
  anneau autour du trou noir (sens et vitesse propres à chaque niveau). Le joueur garde les
  mêmes commandes qu'ailleurs : il vise et tire, et c'est le **moment** du tir qui devient un
  choix. Le lanceur continue de viser le point visé pendant qu'il se déplace. Une orbite
  pilotée par le joueur aurait demandé une seconde commande continue, malcommode au doigt.
- Le niveau 1 présente la gravité seule (lanceur immobile), le niveau 2 l'orbite ; les
  suivants reprennent les mécaniques des mondes précédents : deux chaînes (4 et 8), aimant (7),
  miroirs d'angle (9), alchimie (10).
- **Destruction « aspiration et implosion »** : les éclats et étincelles sont attirés par le
  trou noir et disparaissent à l'horizon. Disque d'accrétion animé, anneau de photons qui
  rougit quand une chaîne approche, anneau du lanceur en pointillés qui défilent dans son
  sens.

| Niveau | Spirale (tours)                | Gravité | Orbite (rad/s) | Autre mécanique | Billes        | Vitesse | Conseil            |
| ------ | ------------------------------ | ------- | -------------- | --------------- | ------------- | ------- | ------------------ |
| 1      | 1,6                            | 0,45    | immobile       | —               | 30            | 28      | Gravité            |
| 2      | 1,8                            | 0,7     | 0,12           | —               | 34            | 38      | Orbite             |
| 3      | 2                              | 0,8     | 0,15           | —               | 38            | 38      | —                  |
| 4      | 1,3 × 2 chaînes                | 0,8     | −0,15          | —               | 2 × 24        | 32      | —                  |
| 5      | 2,2                            | 0,9     | 0,18           | —               | 42            | 44      | —                  |
| 6      | 1,8 (respiration)              | 0,8     | 0,12           | —               | 34            | 38      | —                  |
| 7      | 2,2                            | 1       | −0,18          | Aimant          | 42            | 50      | —                  |
| 8      | 1,5 × 2 chaînes                | 1       | 0,2            | —               | 2 × 24        | 28      | —                  |
| 9      | 2,3                            | 1,1     | 0,2            | Miroirs d'angle | 44            | 46      | —                  |
| 10     | 1,8                            | 0,9     | 0,15           | Alchimie        | 34            | 26      | —                  |
| 11     | 2,5                            | 1,2     | −0,22          | —               | 48            | 36      | —                  |
| 12     | 2 + **Colosse ultime** (44 PV) | 1       | 0,15           | —               | 30 + renforts | 18      | Blesser le Colosse |

- Gravité 1 = 6 × 10⁷ unités³/s² ; tirs à 1 050 unités/s dans ce monde (1 500 ailleurs), pour
  que la courbe se lise. Anneau du lanceur à 70 unités des bords, spirales de 0,6 à 0,2
  du demi-plateau (les tests vérifient que l'anneau reste à distance des tracés et des
  miroirs sur tout son tour, sur les deux formats de plateau).
- **Équilibrage** : le robot a appris à viser en balayant les angles et en lisant la ligne
  de visée courbe, comme un joueur. Il gagne chaque niveau au moins 4 fois sur 6 ; pression
  de 49 à 83 %, 81 % contre le Colosse ultime. Surprise du réglage : un lanceur **immobile**
  est plus difficile qu'un lanceur en orbite (le haut de la spirale, caché derrière le trou
  noir, devient inaccessible) : le niveau 1 a donc une gravité faible.
- Terminer le Volcan ouvre la Singularité et débloque le plateau « Singularité » (puits
  gravitationnel en anneaux, étoiles qui se raréfient vers le centre). Gagner le dernier
  niveau affiche « Campagne terminée ».

#### Modes Arcade, livrés au lot 10

Chaque mode s'ouvre en terminant un monde : **Infini** (Nébuleuse), **Énigmes** (Néon),
**Rythme** (Abysses), **Duel** (Joaillerie). L'écran « Arcade » (bouton sur l'accueil, avec
le nombre de modes ouverts) présente les quatre, verrouillés avec le monde à terminer.
Chaque mode porte le décor d'un monde déjà débloqué à ce moment-là (Nébuleuse, Abysses, Néon,
Volcan).

- **Infini** : une seule spirale longue ; la chaîne est réalimentée par l'entrée dès que sa
  queue sort du tunnel, et un tracé vidé se remplit à toute vitesse. **Paliers** à 0, 40, 90,
  150, 220, 300 et 400 s : vitesse ×1 à ×2, de 3 à 6 couleurs (badge « Palier n », fanfare,
  annonce aux lecteurs d'écran). Partie toujours perdue au bout du compte : le **record**
  est le meilleur score. Éclats : 4 par millier de points, 40 au plus par partie.
- **Énigmes** : chaîne **immobile**, posée au milieu d'une spirale autour du lanceur ;
  **tirs comptés** ; le lanceur ne tire pas au hasard : **« Couleur suivante »** (bouton,
  X ou toucher le lanceur) fait défiler les couleurs présentes. Gagner = tout effacer ;
  perdu quand le dernier tir est retombé, réactions comprises. **30 énigmes** à ouvrir dans
  l'ordre, en trois paliers (2 ou 3 tirs, 3 à 5, 5 à 7) ; tirs permis = minimum + 2 pour les
  dix premières, + 1 ensuite ; 3 étoiles au minimum, 2 avec un tir de plus, 1 sinon.
  **Énigme du jour** : tirée de la date, la même pour tous, de 4 à 6 tirs, le premier essai
  compte. Éclats : 15 + 5 par étoile à la première résolution, 25 pour l'énigme du jour
  résolue du premier coup.
- **Décision : énigmes calculées, pas dessinées.** Un **solveur** joue la chaîne en
  abstrait (une bille ajoutée à une suite de sa couleur ; trois et plus explosent ; les deux
  côtés se rejoignent et peuvent exploser à leur tour) et donne le **nombre minimal de tirs**.
  Les 30 énigmes ont été choisies parmi des milliers de chaînes tirées au hasard : celles où
  les réactions en chaîne font gagner le plus de tirs. Les tests vérifient que le solveur
  retrouve chaque minimum et que **le vrai moteur** résout chacune des 30 énigmes avec la
  solution du solveur, en exactement ce nombre de tirs.
- **Rythme** : trois morceaux, **Pulsation** (96 BPM), **Cavalcade** (112) et **Frénésie**
  (128), sur trois tracés. La musique est **synthétisée** (grosse caisse sur le temps,
  charleston entre les temps, ligne de basse sur deux mesures, accord à chaque mesure) et
  pilotée par l'horloge du jeu, comme la chaîne : elle **bondit sur chaque temps** puis
  ralentit (vitesse moyenne inchangée). Un tir à moins de 0,15 temps d'un battement est
  « sur le temps » ; deux tirs de suite sur le temps montent le **groove** d'un cran (×1 à
  ×4), un tir à contretemps le remet à ×1 ; les points sont multipliés par le groove
  (« ♪×3 » sur l'explosion). Un **anneau** se referme sur le lanceur à l'approche du temps
  et s'illumine dans la fenêtre. Record par morceau ; 15 éclats par morceau terminé.
- **Duel** : une seule chaîne sur un tracé de trois rangées, entre **le trou du rival**
  (début du tracé, en haut) et **le vôtre** (fin du tracé, en bas). Le rival, piloté par
  l'ordinateur, tire depuis le haut. Chaque explosion **pousse la chaîne** vers le trou de
  l'autre camp (10 unités par bille × profondeur de réaction) ; elle **regagne des billes
  aux deux bouts** quand elle passe sous 14 billes, et toutes les 3 secondes pour faire
  monter la pression. Gagné quand la queue tombe dans le trou du rival ; perdu quand la
  tête atteint le vôtre. Jauge « Vous / Rival » de l'avantage et score du rival affichés.
  Trois rivaux : **débutant** (un tir toutes les 2,2 s, visée large, peu concentré),
  **aguerri** (1,5 s) et **redoutable** (1,05 s, visée précise, joue toujours son meilleur
  coup). Éclats : 10, 20 ou 40 par victoire selon le rival.
- **Équité du Duel** : faire jouer le rival **contre lui-même** a révélé deux biais du moteur
  qui favorisaient le joueur, corrigés : une insertion poussait toute la chaîne vers le
  trou du rival, et les trous se refermaient en tirant toujours l'avant de la chaîne vers
  l'arrière. Une chaîne « compacte » referme désormais tout trou **des deux côtés à la fois**
  et fait de la place pour une bille insérée des deux côtés de son tronçon. Le rival ne vise
  que des billes qu'il voit (aucune autre bille sur la ligne) et défend son bout de chaîne.
  Contre le robot d'équilibrage : rival débutant battu à chaque fois (en 20 à 120 s), aguerri
  battu 15 fois sur 16, redoutable battu 3 fois sur 16.

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

| Action                          | Souris / clavier              | Tactile                                      |
| ------------------------------- | ----------------------------- | -------------------------------------------- |
| Viser                           | Pointeur                      | Glisser le doigt (ligne de visée)            |
| Tirer                           | Clic gauche, Espace           | Relâcher le doigt                            |
| Échanger bille / suivante       | Clic droit, X, C              | Toucher le lanceur ou le bouton « Échanger » |
| Couleur suivante (Énigmes)      | Clic droit, X, C              | Toucher le lanceur ou le bouton              |
| Armer l'aimant (Abysses)        | M, bouton « Aimant »          | Bouton « Aimant »                            |
| Basculer un aiguillage (Volcan) | Clic sur le levier, S         | Toucher le levier                            |
| Pause                           | P (Échap reste au navigateur) | Bouton pause (≥ 44 × 44 px)                  |
| Viser au clavier (a11y)         | Flèches gauche/droite (+Maj)  | —                                            |

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
- Livré au lot 10 : `ArcadeProgress` (clé `ballmania:arcade`, version 1) garde le record
  de l'Infini, les énigmes résolues (meilleures étoiles, moins de tirs), le premier essai de
  chaque énigme du jour, le record de chaque morceau et les duels gagnés par rival.
- Sauvegarde versionnée (migrations) : progression de campagne, étoiles, records, éclats,
  cosmétiques possédés, historique du défi du jour. Livré au lot 4 : `CampaignProgress`
  (clé `ballmania:progress`, version 1) garde par niveau les meilleures étoiles et le
  meilleur score ; un niveau s'ouvre quand le précédent est fini ; une sauvegarde abîmée
  ou d'une version inconnue repart de zéro. Stockée via une abstraction
  (`SaveStore`) : `localStorage` sur notre site, stockage du SDK sur les portails qui
  l'imposent. Aucune donnée personnelle.

### 3.5 Direction artistique et destruction

**Refonte de la v1.2.0 (14/10/2026)**, après le refus de CrazyGames pour « qualité
générale » : le jeu ressemblait à une application web (page claire, menus en cartes,
petit plateau, aucune musique) alors que ses couvertures montraient un jeu spatial.
Décisions :

- **Identité « cosmos »** par défaut : violets profonds, lumière dorée, comme les
  couvertures ; le thème clair reste un réglage. Polices du jeu servies avec lui : Lilita
  One (titres, chiffres) et Fredoka (interface), sans requête externe.
- **Écran titre de jeu** (maquette validée) : logo en lettres d'or sur un ciel étoilé
  peint par la feuille de style, la boucle des moments forts du jeu entre le titre et le
  bouton (§ 3.14, à la place de la spirale décorative depuis la 1.8.0), un seul grand bouton
  Jouer qui mène au prochain niveau, quatre tuiles, trois icônes (musique, objectifs,
  réglages). Étoiles et éclats seulement pour un joueur qui revient.
- **Plateau lumineux** : couches fixes du tracé peintes une fois (appareils modestes),
  filet de lumière qui coule vers le trou, trou en petit trou noir, portail d'entrée,
  halo de la couleur chargée sous le lanceur ; l'aide passe au pied du plateau.
- **Musique** (`src/audio/score.ts`, `MusicPlayer`) : partition en données, un thème
  pour les menus et un par monde, ordonnancée en avance sur l'horloge audio ; la tension
  du plateau ajoute des percussions ; rien n'est programmé quand la musique est coupée.
  Table de mixage : effets et musique séparés, réverbération synthétisée, compresseur.
- **Premier niveau (v1.3.0)** : le premier tir du niveau 1-1 est une bombe Nova offerte
  (`LevelSetup.gift`, rayon 170, plus large que la Nova à son meilleur rang), pour que
  les 30 premières secondes montrent ce que le jeu a de neuf ; l'aide écrite cède la
  place à un geste dessiné sur le plateau (une main glisse du lanceur à la chaîne et
  relâche), affiché jusqu'au premier tir.
- **Le 1-1, vitrine (v1.7)** : tout nouveau joueur d'un portail y arrive, et sa première
  minute doit montrer le meilleur du jeu, pas les bases du genre. La chaîne (36 billes,
  trois couleurs) est disposée à la main (`CampaignLevel.sequence`), tête d'abord : six
  billes pour la Nova ; puis des paires emboîtées autour d'une paire de la couleur que le
  lanceur sert après la Nova (`opening`, deux fois), si bien qu'un tir déclenche une
  cascade à trois étages ; une bille Laser dans la paire suivante (`PowerSetup.lead` : 16
  billes devant elle) ; une seconde cascade ; une queue. Sur une partie jouée : Nova vers
  4 s, cascade vers 8 s, Laser vers 12 s puis tir qui transperce la chaîne, supernova
  vers 40 à 55 s. La leçon reste « trois de la même couleur » ; le Laser n'y est qu'un
  avant-goût, enseigné au 1-10.
- **Récompenses visibles** : points et multiplicateurs qui jaillissent dans la police du
  jeu, multiplicateur doré, mot d'encouragement dès une réaction de profondeur 3.

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

| Temps          | Effet                                                                                                                                                                                                                     |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0 → 80 ms      | Le groupe **se fissure** : billes qui gonflent, fêlures blanches, **arcs électriques** entre les billes                                                                                                                   |
| 80 ms          | Chaque bille **éclate** : éclats de verre triangulaires (vitesse, rotation, freinage), traînées de lumière, halo additif, anneau                                                                                          |
| 80 → 630 ms    | **Onde de choc** qui courbe l'image avec aberration chromatique (WebGL2), **tremblement** de l'écran                                                                                                                      |
| Profondeur ≥ 3 | **Ralenti** (×0,3 pendant 120 ms, retour en 250 ms) et **éclair** blanc                                                                                                                                                   |
| Victoire       | Une lumière court le long de chaque tracé jusqu'au trou, qui la rassemble et éclate en **supernova** (cœur blanc, anneaux néon, onde, poussière d'étoiles) ; résultat sur un panneau de verre (v1.6.0, `effects/Victory`) |
| Défaite        | Secousse et voile rouge, chaîne avalée par le trou, glissando grave                                                                                                                                                       |

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

#### Livré au lot 5

**Éclats** (monnaie gagnée uniquement en jouant) :

| Source                        | Éclats                       |
| ----------------------------- | ---------------------------- |
| Niveau de campagne gagné      | 10 + 15 par étoile nouvelle  |
| Défi du jour, 1er essai gagné | 20 + 10 par étoile           |
| Défi du jour, 1er essai perdu | 10 (merci d'avoir joué)      |
| Objectif atteint              | 20 à 500 selon l'objectif    |
| Arcade (lot 10)               | Voir les modes Arcade, § 3.2 |

**Atelier** (cosmétiques, aucun effet sur le jeu ; aperçus dessinés par le code du jeu ;
en onglets avec une cabine d'essayage depuis la v1.8.0, § 3.16).
Le **Cœur d'étoile** (v1.7) : anneau d'astrolabe aux graduations d'or qui tourne lentement,
cinq pétales de cristal dont les pointes prennent la couleur chargée, cœur violet qui tient
la bille suivante, berceau d'or derrière la bille prête à partir ; mêmes couleurs dans les
deux thèmes. Il remplace l'Orbite comme lanceur par défaut, y compris dans les sauvegardes
qui le portaient par défaut (format 2 du profil) ; sur un écran large, il tire aussi les
billes de la scène de titre.

Les quatre autres lanceurs sont redessinés à la même finition (v1.7.1). Ils gardent le
berceau de métal, l'alvéole centrale et les gemmes de la couleur chargée, avec une matière
propre à chacun, d'autant plus précieuse que le lanceur coûte cher :

- **Orbite** : planète d'acier aux bandes de glace. Un grand anneau presque à plat et un
  second plus incliné passent devant et derrière elle ; la lune du grand anneau prend la
  couleur chargée, celle du petit est d'argent. Berceau d'argent.
- **Couronne** : sept pointes d'or à facettes tournent lentement autour d'un cœur de rubis
  cerclé de filigrane ; une gemme de la couleur chargée orne chaque pointe.
- **Halo** : un cœur de perle sur un disque de nuit, qui le garde lisible sur un plateau
  clair, une bande de lumière qui respire et quatre lames de lumière aux pointes de la
  couleur chargée. Berceau de lumière.
- **Œil** : un œil d'obsidienne cerclé d'or, allongé dans l'axe du tir. Son iris tourbillonne
  dans la couleur chargée ; il a des cils d'or et cligne à moitié toutes les 7 s.

Les aperçus de l'Atelier montrent chaque lanceur comme en jeu : le halo de la couleur
chargée, la bille prête à partir dans le berceau et la bille suivante dans l'alvéole, en
couleurs choisies pour sa matière.

| Emplacement        | Objets (prix en éclats)                                                                                                                                                                                                                     |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Lanceurs           | **Cœur d'étoile** (offert, par défaut depuis la v1.7 ; mascotte des couvertures), Orbite (offert, le lanceur des premières versions), Couronne 150, Halo 250, Œil 350                                                                       |
| Traînées de tir    | Aucune (offerte), Comète 80, Poussière d'étoiles 160, Prisme 260                                                                                                                                                                            |
| Signatures de bris | Verre (offert), Étoiles 180, Pixels 240, Pétales 320                                                                                                                                                                                        |
| Plateaux           | Celui du monde (par défaut), Nébuleuse, **Néon** (en finissant la Nébuleuse), **Abysses** (en finissant Néon), **Joaillerie** (en finissant les Abysses), **Volcan** (en finissant la Joaillerie), **Singularité** (en finissant le Volcan) |

Un objet acheté est aussitôt équipé. Le plateau choisi habille tous les niveaux et le défi
du jour ; « Celui du monde » suit le monde joué.

**27 objectifs** (compteurs à vie ; au lot 10, en Arcade : palier 5 de l'Infini, 80 éclats,
10 énigmes résolues, 80, groove ×4, 60, battre le rival redoutable, 120 ; au lot 10 : faire exploser des billes avec 10 tirs
courbés d'au moins 45° par le trou noir, 70 éclats, terminer le Volcan, 350 éclats, et
terminer la campagne, 500 éclats ; au lot 9 : basculer 15 aiguillages, 50 éclats, et terminer
la Joaillerie, 300 éclats ; « tir en bande » ajouté au lot 6 : faire exploser un
groupe après 2 rebonds, 60 éclats ; au lot 7 : aspirer 10 billes avec l'aimant, 50 éclats, et
terminer Néon, 200 éclats ; au lot 8 : fusionner 20 fois, 60 éclats, et terminer les
Abysses, 250 éclats) : gagner un niveau (20), réaction ×3 (30) et ×5 (80),
5 et 10 tirs réussis d'affilée (40, 100), 500 et 2 000 billes détruites (50, 120), gagner
sans échanger (40), gagner alors que la chaîne a dépassé 90 % du tracé (50), 3 étoiles sur
5 niveaux (80), vaincre un Colosse (100), jouer le défi 3 jours (60), terminer la Nébuleuse
(150). Atteints automatiquement, payés aussitôt, listés avec leur progression.

**Défi du jour** : un niveau de la Nébuleuse (4 à 11, ni tutoriels ni boss) tiré par
hachage de la date locale, avec la même suite de billes pour tous (graine `daily:AAAAMMJJ`).
Seul le **premier essai du jour** compte (éclats, résultat affiché sur l'accueil) ; on peut
rejouer pour le plaisir. Le résultat se **partage** par la feuille de partage du téléphone,
ou se copie dans le presse-papiers : « Ballmania · Défi du 12 octobre 2026 : 2 450 points
★★☆ · lien ».

**Sauvegarde** : `PlayerProfile` (clé `ballmania:player`, version 1) : éclats, objets
possédés et équipés, compteurs, objectifs, mondes terminés, défis joués, défaites
d'affilée. Une sauvegarde abîmée est réparée champ par champ ; une version inconnue repart
de zéro.

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
builds, et la version de notre site garde Lighthouse à 100 sans traceur.

**Livré au lot 13 (v1.1)** :

- **Builds par cible** : `npm run build` construit notre site (`dist/`) ;
  `npm run build:crazygames`, `build:poki`, `build:gamedistribution` construisent chaque
  portail dans `dist-<portail>/` (`build:portals` les trois). La constante `__PLATFORM__`
  est fixée au build : le code des autres plateformes est retiré du paquet, et celui de
  notre site ne contient aucune ligne de code de portail (vérifié sur le build). Le SDK est
  chargé depuis le CDN du portail au démarrage, jamais embarqué.
- **Notre site inchangé** : aucune publicité, aucun SDK, CSP stricte, référencement.
  Les builds portails n'ont ni CSP (leurs régies chargent scripts et cadres depuis des
  origines impossibles à lister ; le cadre du portail isole déjà le jeu) ni balises de
  référencement (c'est la page du portail qui est indexée).
- **Le jeu reste jouable sans SDK** : SDK introuvable, bloqueur de publicité, publicité
  refusée ou absente : la partie continue, la récompense est seulement indisponible. Le
  démarrage n'attend jamais plus de 10 s le SDK.
- **Interstitielle** : en quittant l'écran de fin (niveau suivant, rejouer, carte, aide),
  jamais pendant une partie, jamais dans les 3 premières minutes de la visite, au plus une
  toutes les 3 minutes, publicités récompensées comprises (`AdPolicy`). Le portail peut
  encore décider de ne rien montrer. Depuis la v1.7.2, la première visite d'un nouveau
  joueur (aucune partie jouée) est ménagée : aucune interstitielle avant 8 minutes de
  visite, même après une publicité récompensée qu'il a choisie, et aucune juste après une
  défaite (`isFirstVisit`, la même règle qui l'envoie directement au niveau 1-1).
- **Récompensées**, toujours au choix et annoncées sur le bouton (« Regarder une
  publicité ») :
  - **Continuer** après une défaite, une fois par partie, dans la campagne et l'Infini
    seulement (les modes comparés entre joueurs, défi du jour, énigmes, rythme et duel, en
    sont exclus). La chaîne recule de 35 % de son tracé. La défaite n'est enregistrée
    qu'une fois le choix fait, pour ne pas compter deux fois la partie ; l'aide après
    trois défaites la compte déjà.
  - **Éclats doublés** sur l'écran de fin, une fois, dès que la partie en a rapporté.
  - **Indice** dans une énigme : le premier tir d'une solution la plus courte (calculée
    par le solveur sur la chaîne du moment) ; la couleur est chargée, la visée posée et
    la bille entourée 6 s.
  - **Essayer** un cosmétique en vente à l'atelier, pour la prochaine partie ; jamais
    sauvegardé.
- **Pendant une publicité** : temps du jeu arrêté (sans le menu pause), son coupé, puis
  reprise. Les fenêtres du jeu se ferment avant la publicité : un `<dialog>` modal reste
  sinon au-dessus d'elle.
- **Signaux** : chargement terminé, début et fin de jeu effectif (ni pause, ni fin, ni
  publicité), dédoublonnés ; moment de joie (CrazyGames `happytime`) seulement pour un monde
  terminé, la campagne finie ou un record de l'Infini.
- **Par portail** :

| Portail          | Publicités                                                        | Sauvegarde                                      | Langue                   | Partage                 |
| ---------------- | ----------------------------------------------------------------- | ----------------------------------------------- | ------------------------ | ----------------------- |
| CrazyGames (v3)  | `requestAd('midgame' / 'rewarded')`, `hasAdblock`                 | Module `data` du SDK (suit le compte du joueur) | `user.systemInfo.locale` | `game.inviteLink`       |
| Poki (v2)        | `commercialBreak`, `rewardedBreak` ; `init` rejeté = bloqueur     | Navigateur                                      | —                        | `shareableURL`          |
| GameDistribution | `showAd()` / `showAd('rewarded')` + `SDK_REWARDED_WATCH_COMPLETE` | Navigateur                                      | —                        | aucun lien (texte seul) |

La langue du portail sert de langue par défaut ; le choix du joueur dans les réglages
l'emporte. Une langue que le jeu ne parle pas mène à l'anglais, sauf le biélorusse, le
kazakh et le kirghize, qui mènent au russe. CrazyGames peut demander le silence
(`muteAudio`) : il prime sur le volume du jeu. Les réglages (thème, langue, volume)
restent dans le navigateur, car le script du thème les lit avant le premier affichage ;
progression, profil et records vont au stockage de la plateforme. GameDistribution
demande l'identifiant du jeu au build (`VITE_GD_GAME_ID`).

- **Portail simulé** (`npm run dev:portal`, `vite build --mode simulated`) : fausses
  publicités en boîte modale, journal des appels dans `window.platformLog`,
  `?ads=blocked` (bloqueur) et `?ads=refused` (publicité fermée trop tôt). Les tests de
  bout en bout du build portail s'en servent.
- **Exigences CrazyGames appliquées** (v1.2, d'après leur documentation) : un clic au
  plus pour jouer (sur les portails, pas d'intro du studio ; depuis la v1.7, un joueur qui
  n'a jamais joué arrive directement dans le niveau 1-1, sans écran titre, et « Jouer »
  l'y ramène tant qu'il ne l'a pas fini) ; interstitielle seulement en enchaînant une partie (suivant,
  rejouer, aide), jamais en revenant à un menu, et jamais au « Rejouer » d'un écran qui
  proposait « Continuer » (une seule offre de publicité par pause) ; aucun bouton de
  publicité récompensée sur l'écran de jeu actif (l'indice est dans le menu pause) ; icône
  vidéo sur ces boutons ; message dans la page avec un bloqueur ; pas de sélection de texte
  sur appui long ; lettres des raccourcis selon la disposition du clavier. Kit de
  soumission (description, commandes, couvertures, vidéos) : `marketing/crazygames/`.
- **Deuxième revue (14/10/2026, référence complète de CrazyGames)** : le bouton vidéo a
  l'allure des autres choix ; chaque aide a son prix en éclats, le chemin sans publicité
  (continuer : 60, indice : 20, sur les portails seulement) ; une reprise par publicité
  au plus par visite ; une minute entre deux indices ; boutons vidéo retirés dès que les
  publicités se révèlent coupées (Basic Launch) ou bloquées ; mises en page des écrans
  paysage bas (821×462, 800×450) ; zones de sécurité ; reprise du son iOS à chaque geste.
  Les éclats, monnaie du jeu, peuvent donc acheter ces deux aides sur les portails : une
  entorse assumée au § 3.6, exigée par le portail.
- **Nouvelle soumission (v1.7)** : SDK CrazyGames v3 chargé par une balise dans le
  `<head>` du build, avant le jeu (l'adaptateur ne le recharge pas s'il est déjà là) ;
  page des builds de portail en anglais (langue, titre et description ; « Ball Mania »
  sur Playgama), le jeu suivant ensuite la langue du joueur ; Échap laissé au portail (il
  quitte le plein écran) ; un onglet caché met la partie en pause sans `gameplayStop`
  (seule la pause du joueur est signalée, `HudState.pausedBy`) ; couvertures avec le Cœur d'étoile, bandes-annonces refaites
  (nébuleuse du monde 1, billes bonus, victoire et sa supernova).
- **Build Basic Launch (v1.7.2)** : CrazyGames coupe les publicités pendant le Basic
  Launch ; le build qu'on soumet n'en montre donc aucune et n'en demande aucune, pas même
  la détection du bloqueur (`CrazyGamesPlatform` avec `ads: false`, constante de build
  `__CRAZYGAMES_ADS__`). La version Full Launch se construit avec `CRAZYGAMES_LAUNCH=full`,
  sur invitation. Les choix en éclats (continuer, indice) dépendent désormais de
  `PlatformAdapter.isPortal` et non plus des publicités : ils restent proposés ; un prix
  qu'on ne peut pas encore payer s'affiche grisé avec le solde. Le portail simulé reproduit
  ce build avec `?ads=off`. La sauvegarde reste dans le module de données du SDK, sans
  copie locale (règle CrazyGames) ; si l'option « Progress Save » manque à la soumission,
  la console le dit une fois.
- **Playgama (v1.4.0)** : `PlaygamaPlatform` (Bridge SDK v2, chargé par une balise dans
  le `<head>` du build, configuration `playgama-bridge-config.json` à la racine) ;
  sauvegardes **et réglages** par `bridge.storage` (le portail interdit tout autre
  stockage), lus en un seul appel au démarrage puis gardés en mémoire ; langue, son et
  pause du portail suivis ; `game_ready` et messages de niveau ; publicités par Bridge
  (`between_games`, `bonus`), toujours sous notre politique de 3 minutes. Le titre affiché
  est « Ball Mania » dans ce build : Playgama demande 2 à 4 mots, identiques dans le jeu et
  sur la fiche. Un bouton de coupure du son, exigé, rejoint l'écran titre et le jeu.
  Depuis la v1.4.2, le jeu suit les publicités que le portail lance seul, demande à Bridge
  si les publicités sont bloquées (`checkAdBlock`, une fois au démarrage) et n'en demande
  aucune tant que Bridge en a une en cours : sur les pages de Playgama, une publicité
  refusée (bloqueur) laisse Bridge « en chargement » sans jamais signaler l'échec ; elle
  est abandonnée au bout de 12 secondes.
- **À faire par l'éditeur, hors code** : créer les comptes développeur, soumettre les
  archives de `dist-<portail>/` (zip), vérifier chaque intégration avec l'outil du portail
  (CrazyGames : `?useLocalSdk=true` et le QA tool ; Poki : Poki for Developers ;
  GameDistribution : `gdsdk.openConsole()`), et trancher l'exclusivité web demandée par
  Poki. Les noms d'API viennent des documentations publiques consultées le 13/10/2026 ;
  GameDistribution reste à valider sur sa console, sa documentation étant la moins
  détaillée.

**Notre site** : sans publicité en v1.0 (vitrine, référencement, Lighthouse). Pistes
ultérieures : don volontaire, version premium sans pub sur magasins d'applis (PWA/TWA).

**Arguments de vente auprès des portails** : temps de jeu par session (campagne + objectifs),
rétention J1/J7 (défi du jour, mondes à débloquer), quatre langues dont l'indonésien et le
russe, poids léger, effets visuels qui se remarquent dans les vignettes et vidéos de
présentation.

### 3.8 Distribution

Ordre : notre site d'abord, puis builds portails, puis démo pour le portfolio.

**Démo du portfolio (lot 14)** : `npm run build:demo` (`vite build --mode demo`, constante
`__DEMO__`, `src/levels/edition.ts`) construit dans `dist-demo/` l'édition de notre site
réduite aux deux premiers mondes, Nébuleuse et Néon : 24 niveaux, deux Colosses, l'Infini
et les Énigmes (débloqués par ces mondes), le défi du jour (tiré du premier monde),
l'Observatoire et l'atelier. Les quatre autres mondes restent sur la carte, fermés, avec
« Dans le jeu complet » ; de même le Rythme, le Duel et les cosmétiques liés à ces mondes.
Finir le Néon affiche la fin de la démo. Elle est publiée sur le portfolio
(`/demos/ballmania/`), non indexée, comme la démo de Catapulte Mania.

### 3.9 Lot 11 « Expérience » : retours d'un joueur (v0.15)

Retours de test reçus le 13/10/2026, après les six mondes et l'Arcade. Ils visent la
sensation de jeu, la profondeur et la rejouabilité. Livrés en quatre étapes (§ 9).

#### 11.1 Module de tir et plateau agrandi

- **Plateau plus grand** : l'écran de jeu occupe toute la largeur ; un troisième format de
  plateau, **paysage** (1 400 × 1 000), sert les écrans larges (ordinateur, tablette à
  l'horizontale). Les tracés étant des recettes, chaque niveau s'adapte aux trois formats ;
  les tests de géométrie couvrent les trois.
- **Module de tir** (ambition : une sensation de tir dont on se souvient) :
  - **Aide à la visée** activable dans les réglages (activée par défaut) : ligne de visée,
    **bille fantôme** à la place exacte où le tir s'insérera, et **aperçu du groupe** qui
    explosera (halo et « ×3 », « ×4 »…). Désactivée : seul un court guide au bout du canon.
  - **Tir chargé** : maintenir le tir (≥ 0,35 s, clavier, souris ou doigt) charge un **tir
    puissant**, deux fois plus rapide, insensible au vent et à la gravité, qui traverse les
    fragments d'étoiles ; une jauge circulaire autour du lanceur montre la charge.
  - **Retour physique** : recul du canon, éclair de bouche, légère secousse et vibration à
    chaque tir, rotation du lanceur amortie (ressort critique) pour une visée nette.
  - **Le tir part au relâchement** (bouton de souris, Espace ou doigt) : appuyer vise,
    maintenir charge, relâcher tire. Au doigt, la charge ne court que si le doigt reste
    immobile (on peut viser longuement sans charger). Livré à l'étape 11.1 avec le format
    paysage, la bille fantôme (glissée entre les deux billes où le tir s'insérera) et le
    réglage « Aide à la visée ».

#### 11.2 Difficulté et aléas

- **Trois difficultés de campagne**, choisies sur la carte et sauvegardées : **Explorateur**,
  **Pilote** (par défaut) et **Légende**. Elles règlent la vitesse de la chaîne (×0,85, ×1,
  ×1,15) et **l'intensité de tous les aléas** (×0,6, ×1, ×1,5). Le score est multiplié
  (×0,8, ×1, ×1,3) : les étoiles récompensent l'audace. Les étoiles d'un niveau restent les
  meilleures obtenues, toutes difficultés confondues. L'aide après trois défaites reste.
- **Parcours non linéaires** (à partir des Abysses) : tracés **à deux entrées**, deux
  chaînes qui serpentent depuis les deux côtés et finissent chacune dans le trou.
- **Pluie de billes** : périodiquement, une bille **tombe du ciel** (ombre annoncée une
  seconde avant) et s'insère dans la chaîne ; elle ne forme jamais de groupe en tombant.
- **Arythmie** : la chaîne **accélère puis ralentit** par cycles irréguliers, annoncés par un
  battement visuel ; à distinguer du vent, qui pousse dans un sens.
- **Météo** (épisodes de quelques secondes, annoncés par une bannière et un son) :
  - **Tempête solaire** : les billes deviennent **brûlantes et indestructibles** ; les
    groupes formés pendant la tempête explosent à sa fin, en réaction. Des améliorations
    lèvent l'immunité.
  - **Froid mordant** : les tirs ralentissent (×0,65) ; des billes se couvrent de **givre** ;
    toute **réaction en chaîne** (profondeur 2 et plus) fait aussi exploser les billes
    gelées.
  - **Vents contraires** : des **rafales** dévient les tirs (dérive latérale visible sur la
    ligne de visée) et, selon leur sens, **accélèrent ou ralentissent** la chaîne ; une
    **rafale massive** échange quelques billes voisines (sans jamais créer de groupe).
- Les aléas arrivent progressivement dans la campagne (pluie et arythmie dès Néon, une
  météo par monde ensuite, combinées dans la Singularité) ; plus la difficulté est haute,
  plus ils sont fréquents et marqués.

Livré à l'étape 11.2 :

- Difficulté choisie sur la carte (réglage `difficulty`), badge dans l'écran de jeu ; le
  défi du jour reste en Pilote pour l'équité.
- Répartition : Néon (arythmie aux niveaux 5, 10 et 11, pluie de billes aux niveaux 8, 11
  et 12), Abysses (vent aux niveaux 3, 8, 11 et 12, **tracés à deux entrées** aux niveaux 4
  et 9, pluie et arythmie), Joaillerie (froid aux niveaux 3, 7, 11 et 12), Volcan (tempête
  solaire aux niveaux 3, 5, 8, 11 et 12), Singularité (vent, froid, tempête et les trois à
  la fois au niveau 11).
- Réglages de référence (Pilote) : une météo toutes les 20 s environ, 7 s chacune ; tirs
  ralentis de 35 % par le froid, 18 % des billes gelées ; rafale de 700 unités/s² et
  allure de la chaîne ±35 % ; rafale massive dans 30 % des cas (2 à 4 échanges) ;
  arythmie de ±20 à 30 % sur des cycles de 9 s ; une bille du ciel toutes les 9 à 13 s.
- **Tracé à deux entrées** : deux serpentins symétriques de 5 rangées (7 en portrait), un
  par moitié du plateau, chacun vers son trou de part et d'autre du milieu ; le lanceur au
  centre. Les tests de géométrie couvrent les trois formats.
- **Équilibrage** : le robot vérifie désormais que sa cible est bien la première bille sur
  la ligne de visée (un joueur lit sa ligne de visée) ; sans cela, il visait des billes
  masquées par une autre rangée. Il corrige aussi sa visée dans le vent. Chaque niveau reste
  gagné au moins 4 fois sur 6 en Pilote. Les tracés à deux entrées, trop durs avec
  l'alchimie, sont restés aux Abysses.

#### 11.3 Fragments d'étoiles et améliorations

- **Fragments d'étoiles** : des étoiles filantes traversent le plateau de temps en temps ;
  les toucher d'un tir les **récolte** (le tir continue sa course). Monnaie à part des éclats,
  gagnée uniquement en campagne.
- **Observatoire** : écran où l'on achète **10 améliorations à trois rangs** (coût croissant ;
  en trois onglets par portée depuis la v1.8.0, § 3.16),
  actives en campagne (jamais au défi du jour ni en Arcade, pour l'équité) :
  1. **Œil stellaire** : la bille fantôme montre aussi la bille suivante ; rang 3 : la ligne
     de visée montre un rebond de plus.
  2. **Chronos** : chaîne plus lente de 4, 8 puis 12 %.
  3. **Onde de choc** : chaque explosion fait reculer la chaîne (20, 40, 60 unités).
  4. **Bille prismatique** : tous les 20, 15 puis 10 tirs, une bille arc-en-ciel qui prend
     la couleur des billes qu'elle touche.
  5. **Bouclier thermique** : en tempête solaire, les groupes de 4 explosent (rang 1), tous
     (rang 2), et la tempête dure moitié moins (rang 3).
  6. **Brise-glace** : le froid ralentit moins les tirs ; au rang 3, toute explosion fait
     éclater les billes gelées.
  7. **Ancre** : le vent dévie moins les tirs (−35, −70, −100 %).
  8. **Attrape-étoiles** : fragments plus fréquents et plus faciles à toucher.
  9. **Nova** : les explosions chargent une jauge ; pleine, le prochain tir est une **bombe**
     qui détruit les billes proches (rayon croissant).
  10. **Seconde chance** : une fois par niveau, quand la chaîne atteint le trou, elle est
      repoussée de 15, 25 puis 35 % du tracé.
- Une pastille signale **sur l'accueil et la carte** qu'une amélioration est abordable.
- **Bulle de l'Observatoire** (v1.7.4) : la première fois qu'une amélioration devient
  abordable, une bulle sous le bouton Observatoire de la carte (au-dessus, au pied de la
  colonne, sur un écran couché) dit « Améliorez votre jeu ici avec vos fragments
  d'étoiles. », et un anneau souligne le bouton. Dans la colonne d'une carte couchée, elle
  ne cache rien ; sur un écran couché de 600 px de haut au plus (fenêtres des portails,
  téléphone couché), où la colonne n'a plus de place, elle flotte au-dessus du bouton, sur les
  dernières difficultés, jusqu'au toucher, et atteindre les difficultés au clavier la retire.
  Sur la carte empilée d'un écran large (debout, ou de plus de 960 px de haut), elle flotte
  de même sous le bouton, resté dans l'en-tête (v1.8.0) : dans le flux, elle poussait les
  niveaux hors de l'écran (1 026 px de haut au lieu de 863). La carte tient toujours sur un
  écran. Elle s'affiche lors d'une seule visite de la carte,
  disparaît au toucher et rend le focus au bouton ; ouvrir l'Observatoire la retire aussi, et
  qui possède déjà une amélioration ne la voit jamais. Pour un lecteur d'écran, le texte est une note et un
  bouton « Compris » la ferme ; son entrée disparaît avec le mouvement réduit. Le profil
  retient les conseils déjà montrés (`tips`).

Livré à l'étape 11.3 :

- Une étoile filante traverse le plateau toutes les 9 s environ (de 4,5 à 7 s avec
  l'Attrape-étoiles), en ligne droite, d'un bord vers le centre ; un tir qui passe à moins
  de 40 unités (55 à 85 avec l'Attrape-étoiles) la récolte et continue sa course. Compteur
  « ✦ » en jeu, « +n fragments d'étoiles » au bilan ; sauvegardés dans le profil du joueur.
- **Coûts** : 5, 12 puis 25 fragments par rang (42 par amélioration, 420 pour tout).
- Effets précis : Œil stellaire (3, puis 4 rebonds sur la ligne de visée ; au rang 3,
  l'aperçu entoure en pointillés les billes de la réaction en chaîne qui suivra) ; Nova
  (30, 24, 18 billes pour charger ; rayon 90, 120, 150 ; les billes détruites par la bombe
  ne rechargent pas la suivante) ; Seconde chance (repousse la chaîne qui atteint le trou,
  une fois par niveau).
- Objectif « Astronome » : récolter 30 fragments, 80 éclats (28 objectifs).
- Les améliorations ne servent qu'en campagne ; le robot d'équilibrage joue sans elles :
  l'équilibrage reste celui d'un joueur qui n'a rien acheté.

#### 11.4 Design et animations

- **Fin de niveau** : les dernières billes partent en traînées de particules vers le trou
  (ou le trou noir), puis le trou **avale tout le plateau** en spirale avant le bilan.
  Mouvement réduit : simple fondu.
- **Arrière-plans animés** avec retenue : étoiles qui scintillent, nuées qui dérivent,
  braises qui montent… selon le monde, à faible coût (un calque de quelques dizaines de
  particules) ; figés avec `prefers-reduced-motion`.
- **Menus animés** : transitions entre écrans, apparition en cascade des cartes et des
  niveaux, micro-interactions des boutons ; **étoiles** qui s'allument une à une avec un
  éclat au bilan, scintillement sur la carte.
- **Étoiles gagnées** affichées : total sur l'accueil et la carte, « +2 étoiles » au bilan.

Livré à l'étape 11.4 :

- Fin de niveau gagné : 0,7 s de tourbillon (les débris de la cascade finale et 70 traits de
  lumière sont aspirés par le trou), puis 1,3 s pendant lesquelles tout le plateau tourne
  d'un tour et demi en rétrécissant vers le trou, sur fond de vide ; le bilan suit.
  Mouvement réduit : fondu.
- Ambiances animées par monde, dessinées sur le fond peint (36 éléments au plus, sans
  état) : étoiles proches qui dérivent (Nébuleuse, v1.7), étoiles qui scintillent
  (Singularité), ligne de balayage (Néon), bulles
  (Abysses), éclats de facettes (Joaillerie), braises (Volcan). Menus : deux halos qui
  dérivent lentement derrière tout.
- Écrans qui glissent à l'apparition (sauf le premier affichage, pour ne pas retarder
  l'accueil), listes en cascade (niveaux, Arcade, Observatoire, Atelier, objectifs),
  boutons qui se soulèvent et s'enfoncent, étoiles du bilan qui éclosent une à une avec un
  éclair. Le tout en CSS (`transform`, `opacity`), coupé par `prefers-reduced-motion`.
- Total d'étoiles sur l'accueil et la carte, « +n étoiles » au bilan.

#### Contraintes

- Lighthouse à 100 dans les quatre catégories, mobile et ordinateur : les
  animations de menu sont en CSS (`transform`, `opacity`), sans bibliothèque ; aucun
  nouveau code n'est chargé par l'accueil sauf le strict nécessaire.

### 3.10 Navigation en cartes et intro du studio (après la 1.0.0)

- **Cartes à faire glisser** (bibliothèque Swiper 14, chargée seulement avec la carte et
  l'Arcade) : un monde, ou un mode Arcade, par carte ; effet « créatif » où les cartes
  voisines dépassent derrière la carte active, réduites et inclinées ; billes de verre
  (mondes) ou emblème (modes) qui chevauchent le bord supérieur de la carte ; pastilles
  nommées, flèches, flèches du clavier, glisser au doigt ou à la souris. Le paquet s'ouvre
  sur le monde du niveau le plus avancé, ou sur le dernier mode ouvert. Seule la carte
  active est lisible et utilisable (`inert` sur les autres). Mouvement réduit : simple
  glissement.
- **Intro du studio** reprise de Catapulte Mania, avec le nom **AdamRodWebTech** (celle de
  Catapulte Mania affiche aujourd'hui AdamRodWebDev) : hexagone doré qui se trace et
  tourne, « A », étincelle, nom lettre à lettre, « présente », environ 2,6 s. Une fois par
  visite (`sessionStorage`), passée par une touche (sauf Tab) ou un toucher, absente avec
  `?nointro`, image finale immédiate avec le mouvement réduit. CSS seulement.
- Lighthouse mobile : Performance 99 (l'intro recouvre l'accueil pendant 2,6 s), 100 dans
  les trois autres catégories ; 100 × 4 sur ordinateur.

### 3.11 Billes bonus (v1.7)

Des billes de la chaîne portent un **pouvoir** : une bille de couleur ordinaire, sans son
symbole, avec l'emblème blanc de son pouvoir, un anneau qui tourne (blanc pointillé ;
aux six couleurs pour l'arc-en-ciel) et un halo de sa couleur. Détruite dans un groupe
(un tir, une réaction, un laser), elle déclenche son pouvoir, rapporte **100 points** et
fait éclater son nom au-dessus du plateau.

| Pouvoir         | Effet                                                                  | Emblème   |
| --------------- | ---------------------------------------------------------------------- | --------- |
| **Recul**       | Toute la chaîne recule de 8 billes, vite (900 u/s) : chevrons de recul | Double ◀  |
| **Ralenti**     | La chaîne avance à mi-vitesse pendant 8 s : givre, anneau qui se vide  | Sablier   |
| **Arc-en-ciel** | La bille suivante prend la couleur de la bille qu'elle touche          | Étincelle |
| **Laser**       | Le tir suivant file droit et traverse les 4 premières billes touchées  | Éclair    |

- **Placement** (déterministe : mêmes couleurs, mêmes places) : une bille bonus a toujours
  une voisine de sa couleur, jamais à moins de 3 billes d'un bout ; une toutes les `every`
  billes, au moins une ; celle qu'un niveau enseigne arrive en premier, vers la tête. Dans
  une chaîne qui s'allonge (Infini, Colosse), une bille bonus toutes les `every` billes
  ajoutées, les pouvoirs à tour de rôle.
- **Apprentissage, une nouveauté par niveau** : Recul au 1-4 (au 1-3 jusqu'à la 1.7.3, qui
  accueille depuis le jeune Colosse ; conseil « Les billes à anneau cachent un pouvoir… »),
  Ralenti au 1-6, Arc-en-ciel au 1-8, Laser au 1-10, après un avant-goût du Laser dans la
  vitrine du 1-1 ; le conseil sur les réactions en chaîne passe du 1-3 au 1-5. Le Colosse du monde 1
  ne porte que les pouvoirs d'attaque (arc-en-ciel, laser), rarement, pour garder sa
  pression. Mondes 2 à 6 : les quatre, une toutes les 20 billes. Infini : une toutes les
  24 billes. Pas dans les Énigmes, le Rythme ni le Duel.
- **Affichage** : pastilles « Ralenti · 6 s » et « Laser prêt » / « Tir arc-en-ciel prêt » ;
  laser chargé : faisceau de visée et anneau pointillé sur chaque bille qu'il prendra ;
  annonce au lecteur d'écran. Sons propres à chaque pouvoir.
- **Ouverture** : la ruée du début de niveau ne se fait qu'une fois ; un recul (ou une
  relance) ramène la tête en arrière sans la relancer.

### 3.12 Cadeau du jour (v1.7)

- **Série de 7 jours** : 15, 20, 25, 30, 40, 50 puis 120 éclats (300 par semaine, à peu
  près un cosmétique moyen ; chaque jour rapporte moins qu'un niveau gagné à 3 étoiles).
  Un cadeau par jour calendaire local ; un jour manqué ramène au jour 1 ; après le 7ᵉ
  jour, la série recommence. Règles pures (`DailyGift`), série gardée dans le profil
  (`gift: { last, streak }`).
- **Carte de l'écran titre**, jamais bloquante : titre, « Jour 3 sur 7 », bouton
  « Récupérer +25 » (cyan, distinct du bouton Jouer doré), les sept jours (pris : coche ;
  aujourd'hui : cadre doré ; le 7ᵉ : grand cristal), note « Demain : +30 · Un jour manqué
  et la série recommence ». Au-dessus de Jouer sur un écran haut : le trou noir se place
  au milieu de la place que lui laissent le titre et la carte, à sa taille. Dans le coin
  haut sur un écran large ; sur un cadre bas (portail, téléphone couché), la carte se
  replie sur sa première ligne pour laisser le trou noir visible. Sur un petit téléphone,
  la note disparaît. Une fois le cadeau pris : une pastille « Jour 3 récupéré · Demain
  +30 ». Annonce au lecteur d'écran. L'écran titre ne défile jamais, carte ou pastille.
- **Le cadeau se range** (v1.8.0) : au toucher, ses éclats filent en arc du bouton au
  porte-monnaie, qui compte et dont la gemme s'illumine quand ils arrivent (le porte-monnaie
  d'un nouveau venu apparaît avec eux), pendant que la carte montre le jour coché, avec le son
  des éclats qui se versent du panneau de victoire. Une demi-seconde après, la carte se
  replie, la pastille prend sa place et la boucle de l'écran titre glisse dans la place
  libérée, ou y apparaît en fondu sur un téléphone : rien ne saute. Le minutage est
  `GiftClaim` (`src/app`), les étincelles `SparkFlight`, partagées avec « Équiper ». En
  mouvement réduit, la pastille apparaît en fondu, sans étincelles ni glissement.

### 3.13 Entraînement (v1.8.0)

Trois courtes vitrines enchaînées, faites pour accrocher un nouveau joueur en montrant le
meilleur du jeu dès son premier geste, puis la campagne au 1-1 (feuille de route de la
1.8.0, décisions des 22 et 23/10/2026). Elles sont indépendantes de la campagne : leur
contenu et leur progression sont à part. Maquettes : rangées « 1.8.0 » du canevas.

**Où et quand**

- **Builds de portail** : un nouveau joueur y entre au lancement, sans logo, titre ni menu ;
  les menus de base apparaissent une fois l'entraînement fini ou passé.
- **Notre site** : écran titre et intro, puis l'entraînement au premier « Jouer » d'un
  nouveau visiteur.
- **Ensuite** : un joueur qui a fini ou passé l'entraînement retrouve l'écran titre à sa
  visite suivante ; un entraînement interrompu reprend à la vitrine en cours.

**Règles communes aux trois vitrines**

- **À l'écran** : la pause, le son, « Passer » et trois points d'avancée, à la place du nom
  du niveau. Ni score, ni jauge d'étoiles, ni éclats, ni objectifs : les points et les
  multiplicateurs jaillissent sur le plateau comme ailleurs. Le bouton Échanger reste. Sur un
  écran large, « Passer » se tient dans le rail de gauche au-dessus du son, son signe sur son
  mot comme les boutons de l'autre rail (rails de 6,5rem pendant l'entraînement : « Пропустить »
  y tient).
- **Aucune défaite** : la chaîne s'arrête au seuil du trou, où les signaux de danger jouent ;
  le joueur l'en éloigne en faisant exploser des groupes. Un tir manqué, avalé ou perdu ne
  coûte rien.
- **On apprend en faisant** : le geste de la main montre l'action du moment fort et reste
  jusqu'à ce qu'elle soit faite ; il revient après 5 s sans tir, ou après trois tirs de suite
  sans groupe, et montre alors le meilleur tir qui fait un groupe, de quelque sorte qu'il
  soit. La main cherche elle-même ce tir sur le plateau (quelques angles par image) : le plus
  gros groupe et la réaction qui le suit, visé au milieu de la plus large fenêtre d'angles,
  pour qu'un geste copié à peu près le réussisse ; le doigt se lève sur la bille, avant le
  miroir, ou dans la direction d'une courbe, et la ligne pointillée suit le trajet du tir
  jusqu'à la bille. Elle se cache pendant qu'un tir est tenu ou en vol. Une seule phrase par
  vitrine, au-dessus des boutons, qui reste jusqu'à ce que le geste soit fait.
- **Fin d'une vitrine** : quand sa chaîne est détruite, un éclat de victoire court (la
  lumière file plus vite, un cœur blanc et un seul anneau, 1,1 s) pour E1 et E2 ; la
  supernova entière est gardée pour la fin d'E3.
- **Entre deux vitrines** : une carte de 1,8 s, sans bouton : « Étape 2 sur 3 », le nom de la
  vitrine en grand, et une ligne sur son geste (« Faites rebondir vos tirs sur le néon »,
  « Laissez le trou noir courber vos tirs »), annoncée aux lecteurs d'écran ; le plateau
  attend dessous, la musique du monde suivant déjà lancée.
- **« Passer »** mène au 1-1 et marque l'entraînement comme fait. La pause propose
  « Reprendre », « Recommencer l'étape » et « Passer l'entraînement », sans autre menu (le mot
  « étape » est celui de la carte).
- **Portails** : `gameplayStart` dès la première image d'E1, aucune publicité pendant
  l'entraînement, et sa fin est fêtée auprès du portail (le « happy time » de CrazyGames).

**E1 — La Nova (Nébuleuse), 45 à 60 s**

- **Idée** : un seul tir détruit tout un pan de chaîne, puis une cascade s'enchaîne seule.
- **Émotion** : surprise à la Nova (vers 4 s), jubilation à la cascade (8 s), curiosité au
  Laser (12 s), maîtrise jusqu'à la fin.
- **Déroulé** : la vitrine du 1-1 d'aujourd'hui (§ 3.5), qui y passe tout entière : 36
  billes de trois couleurs posées à la main, six pour la Nova offerte, des paires
  emboîtées pour une cascade à trois étages, une bille Laser, une seconde cascade, une
  queue.
- **Si le premier tir rate** : la Nova offerte n'est dépensée qu'en explosant ; un tir qui
  manque la chaîne la rend au lanceur. Où qu'elle touche, son explosion tient entière à
  l'écran : les billes qu'elle emporte (rayon 170) sont sur la piste, et son anneau se tient
  dans la place que l'écran laisse autour de l'impact (près d'un bord, il s'élargit moins).
- **Phrase** : « Votre première bille est une bombe Nova : visez la chaîne et relâchez ! »

**E2 — Les miroirs (Néon), 50 à 70 s**

- **Idée** : un tir renvoyé par un mur de néon vaut plus (× 2 après un rebond, × 3 après
  deux), et la ligne de visée montre le rebond avant le tir.
- **Émotion** : découverte (le premier rebond), fierté (le premier groupe touché en bande,
  avec son « × 2 » et son ping), envie de recommencer (le × 3).
- **Déroulé** : une spirale courte (1,25 tour), quatre murs d'angle, 34 billes de trois
  couleurs posées à la main, vitesse 26. En tête, des paires emboîtées autour d'une paire de
  la couleur servie en premier : un tir en bande qui la complète lance une cascade à trois
  étages ; ensuite, des paires à tour de rôle, qu'on gagne une à une (deux voisines vidées
  côte à côte se rejoignent et explosent à leur tour). Le geste de la main trace le trajet
  du tir en bande, rebond compris.
- **Si le premier tir rate** : les murs entourent assez la chaîne pour qu'un tir manqué y
  revienne souvent ; tout tir en bande qui fait exploser un groupe donne le moment fort.
- **Phrase** : « Les murs de néon renvoient vos tirs : un rebond double les points. »

**E3 — Le trou noir (Singularité), 60 à 80 s, puis la promesse du Colosse**

- **Idée** : le trou noir courbe les tirs, et la ligne de visée montre la courbe exacte.
- **Émotion** : étonnement (la courbe), maîtrise (les tirs courbés qui touchent), triomphe
  (la supernova), puis frisson : le boss qui vous attend.
- **Déroulé** : trou noir au centre, gravité faible (0,45, comme au 6-1), lanceur immobile,
  spirale de 1,5 tour qui s'arrête à 0,32 du demi-plateau, loin du disque (une tête arrêtée
  au seuil s'y laisse encore toucher), 24 billes de trois couleurs posées à la main comme
  dans E2 (une cascade en tête pour le premier tir courbé, puis des paires à tour de rôle),
  vitesse 22. Un tir compte pour courbé dès que le trou noir l'a dévié de 15°. Pas de
  combat : la chaîne détruite, la supernova.
- **La promesse** (comme dans Lumirift, décidé le 23/10/2026) : 0,75 s après la supernova, le
  trou noir s'agite (son anneau rougit, un grondement) ; le jeune Colosse stellaire en sort,
  plus grand qu'au combat, regard levé ; il inspire, puis rugit (il enfle, ses runes
  s'envolent, le plateau tremble) ; il se tourne vers le joueur et le fixe, un battement de
  paupière ; il se soulève une dernière fois et replonge, ses runes aspirées derrière lui, le
  trou se refermant : 4,2 s en tout, sans rien qui saute d'une image à l'autre. Avec le
  mouvement réduit, il paraît et disparaît en fondu, sans enfler ni trembler. Son combat
  reste au 1-3.
- **Si le premier tir rate** : un tir avalé ne coûte rien ; la ligne courbe naturelle du
  lanceur tombe sur un groupe.
- **Phrase** : « Le trou noir courbe vos tirs : suivez la ligne. »

**Écran de fin** : un seul panneau de verre, celui des victoires, une fois le Colosse
replongé : « Entraînement réussi » et « En route pour la campagne ! » (épicène, là où « Prêt »
supposait un joueur), les trois vitrines rappelées en une ligne chacune (« La Nova et sa
cascade », « Le rebond sur les miroirs », « Le tir courbé par le trou noir »), « Le jeune
Colosse stellaire vous attend au niveau 1-3. », et le seul bouton « Continuer » (« Niveau 1-1
· Nébuleuse »).

**Le nouveau 1-1 (campagne), 60 à 90 s**

- **Idée** : viser et grouper trois billes, sans artifice : le premier vrai niveau.
- **Émotion** : calme au départ, une petite montée au milieu, et la première victoire de la
  campagne, sans défaite possible pour un nouveau venu.
- **Déroulé** : spirale de 1,25 tour, 30 billes de trois couleurs posées à la main, vitesse
  30 ; la couleur servie en premier complète une paire entre deux paires d'une autre couleur,
  pour une première cascade à deux étages. Ni Nova offerte ni vitrine : elles sont dans E1.
  Nombre de billes et vitesse réglés aux étapes 4 et 5.
- **La main** montre le tir qui fait le premier groupe (la cascade posée) et reste jusqu'au
  premier tir qui touche la chaîne ; elle ne revient pas. **Phrase** : « Visez la chaîne et
  relâchez : dès trois billes de la même couleur, le groupe explose. »
- Étoiles, éclats et objectifs comme ailleurs ; c'est la victoire qui donne « Premier pas ».

**Tableau de l'entraînement**

| Moment          | Durée   | Intensité (1 à 10) | Nouveauté                                  | Moment fort                            | Sortie                 |
| --------------- | ------- | ------------------ | ------------------------------------------ | -------------------------------------- | ---------------------- |
| E1 La Nova      | 45–60 s | 6 → 8 → 3          | Nova offerte, cascade, avant-goût du Laser | Nova, puis cascade à trois étages      | Éclat court            |
| Carte           | 1,8 s   | 2                  | —                                          | « Étape 2 sur 3 · Les miroirs »        | —                      |
| E2 Les miroirs  | 50–70 s | 4 → 7 → 3          | Rebond sur le néon, × 2 et × 3             | Premier groupe touché en bande         | Éclat court            |
| Carte           | 1,8 s   | 2                  | —                                          | « Étape 3 sur 3 · Le trou noir »       | —                      |
| E3 Le trou noir | 60–80 s | 5 → 8 → 10         | Gravité, tir courbé                        | Supernova, puis la promesse du Colosse | Promesse (4,2 s)       |
| Écran de fin    | —       | 3                  | —                                          | « Il vous attend au niveau 1-3 »       | « Continuer » vers 1-1 |
| 1-1             | 60–90 s | 3 → 5 → 3          | —                                          | Première cascade, préparée             | Panneau de victoire    |

En tout, environ trois minutes avant le 1-1 (2 min 45 à 3 min 40 avec les cartes et la
promesse). La courbe monte en dents de scie, chaque vitrine plus haut que la précédente, et la
seule respiration longue est l'écran de fin, avant le calme du 1-1.

**Simulations** (`tests/levels/showcases.test.ts`) : un nouveau venu simulé tire son premier
coup n'importe où sur la chaîne, puis recopie la main à peu près (il ajuste sa visée jusqu'à
ce que l'aperçu allume un groupe), sinon prend le plus gros groupe que l'aperçu lui montre,
ou met sa couleur à côté de la sienne. Dix nouveaux venus par cadre (carré, haut, large) :
le moment fort de chaque vitrine (la cascade d'E1, un tir en bande d'E2 qui explose, un tir
courbé d'E3 qui explose) est atteint dans au moins 90 % des parties, et chacune se termine.
Mesuré le 23/10/2026 sur seize nouveaux venus par cadre : E1 gagnée 48 fois sur 48 avec une
cascade (à trois étages 44 fois), E2 48 sur 48 avec un tir en bande, E3 48 sur 48 avec un tir
courbé 45 fois ; le robot tire toutes les 1 à 1,5 s, d'où des durées médianes plus courtes
que le tableau (E1 21 à 27 s, E2 28 à 32 s, E3 21 à 61 s) : les vraies se mesurent sur des
inconnus à l'étape 4.

### 3.14 Boucle de l'écran titre (v1.8.0)

Entre le titre et « Jouer », une fenêtre joue seule les moments forts du jeu, ce qu'aucun
autre jeu de billes n'a, avec le vrai moteur et le vrai rendu, sans fichier vidéo (feuille de
route de la 1.8.0, étape 3, comme dans Lumirift ; maquettes « 1.8.0 boucle » du canevas).

**Les huit moments** (`src/showcase/lineup.ts`, `moments.ts`) : chacun est une vraie partie,
sa chaîne déjà en place (posée à la main pour la plupart) et ses premières couleurs données,
jouée par une main scriptée (`ShowcaseHand`) qui cherche à chaque repère le tir de son geste
avec la ligne de visée et l'aperçu du jeu, au milieu de la plus large fenêtre d'angles, vise
0,35 s pour que la ligne se voie, puis tire. Elle échange sa bille si l'autre a le tir et pose
la Nova loin des bords, pour que son souffle tienne dans la fenêtre.

| Moment              | Partie                                                | Durée | Sommet (mesuré) | Légende                                    |
| ------------------- | ----------------------------------------------------- | ----- | --------------- | ------------------------------------------ |
| La Nova             | Vitrine E1 de l'entraînement                          | 4,5 s | 1,20 s          | Nébuleuse · La bombe Nova                  |
| Le tir en bande     | Vitrine E2                                            | 4 s   | 1,93 s          | Néon · Faites rebondir vos tirs            |
| L'aimant            | Abysses 2, deux paires de part et d'autre d'une bille | 4 s   | 0,93 s          | Abysses · Aspirez une bille                |
| Le mélange          | Joaillerie 2, une bille qui change de couleur         | 4 s   | 1,33 s          | Joaillerie · Mélangez les couleurs         |
| L'aiguillage        | Volcan 2                                              | 4 s   | 0,63 s          | Volcan · Basculez les aiguillages          |
| Le trou noir        | Singularité 2, cascade de paires                      | 4,5 s | 1,37 s          | Singularité · Le trou noir courbe vos tirs |
| La chute du Colosse | Nébuleuse 12, Colosse à 3 points de vie               | 4,5 s | 1,20 s          | Boss · Terrassez le Colosse                |
| Le Duel             | Duel de l'Arcade, cascade de paires                   | 4 s   | 1,43 s          | Duel · Gagnez le tir à la corde            |

**Déroulé** (`Reel`, `Take`, `MomentRun`) : chaque moment est une séance de jeu sur sa propre
toile, muette, menée image par image à 30 images par seconde (elle joue donc la même chose à
chaque fois), sur la forme du plateau large ; il se joue d'abord 0,6 s sans être vu (la chaîne
entre et se pose), puis 3 à 5 s. Le suivant se pose pendant la fin du précédent et s'y fond en
0,4 s, sa légende aussi ; huit repères disent où en est la boucle, un tour dure environ 30 s.
Chaque moment porte le lanceur, la traîne et l'éclat du joueur, dans le décor de son monde ;
un plateau de jour suit le thème, la Nébuleuse garde ses couleurs de nuit, comme en jeu.

**Sobriété** : aucun code de la boucle avant le premier affichage. Elle se charge quand la page
est chargée et le navigateur au repos, l'intro du studio finie et la fenêtre à l'écran, puis
joue dans un worker à qui la page passe la toile (dans la page si le navigateur ne le permet
pas ; le worker charge lui-même la police des acclamations). Elle s'arrête hors de l'écran,
dans un onglet caché et derrière les réglages, et reprend où elle en était. En mouvement
réduit, une seule image fixe : la Nova 0,3 s après son sommet. Worker de 197 Ko (61 Ko
compressés) ; le ciel étoilé de l'écran titre est peint par la feuille de style (deux pavés
fixes, un troisième qui scintille), sans toile ni calcul image par image.

**Place** : la fenêtre a la forme du plateau (17 × 10) et prend la place que l'écran laisse
entre le titre et le cadeau du jour, ou, sur un écran large, sous le cadeau, dans la colonne
de droite d'une grille qui la garde à l'écart du menu. Elle s'élargit jusqu'à 26 rem sur un
téléphone, 36 rem sur une tablette en hauteur, 48 rem sur un écran large, et disparaît sous
7,5 rem de haut ou 12 rem de large, sans charger son code. Sur les téléphones de moins de
52 rem de haut, la note du cadeau lui cède sa place (la série dit toujours ce que donne
demain). Mesuré : 261 × 153 à 390 × 844, 574 × 338 à 1280 × 800, 768 × 452 à 1920 × 1080 ;
visible dès 360 × 780 (216 × 127) ; à 360 × 640 et 393 × 659, une fois le cadeau pris ;
jamais à 320 × 568.

**Vidéos des portails** (`marketing/crazygames/cuts.ts`, `trailer.ts`) : elles jouent les mêmes
scènes. Après la couverture fixe (1 s), six des moments (la Nova, le tir en bande, l'aimant, le
trou noir, le Duel et la chute du Colosse, la lumière filant sur le tracé) se fondent l'un dans
l'autre en 0,3 s, 16,8 s en tout, sous les 20 s de CrazyGames : le plateau large en paysage, le
plateau haut d'un téléphone en portrait (le mélange des couleurs n'y atteint pas son sommet et
reste dans la boucle, avec l'aiguillage). Un test vérifie chaque sommet sur les deux plateaux
avant le fondu suivant, et la durée.

**Tests** : chaque moment atteint son sommet en moins de 3 s sur la vraie séance de jeu,
ralentis compris (`tests/showcase/moments.test.ts`, sur une toile factice), toujours au même
instant ; la boucle passe les moments dans l'ordre, les fond l'un dans l'autre, s'arrête et
reprend, et ne demande aucune image en mouvement réduit (`Reel.test.ts`). De bout en bout
(`e2e/reel.spec.ts`, `first-paint.spec.ts`) : légendes qui se suivent, arrêt dans un onglet
caché et derrière les réglages, image fixe, aucun code chargé sur un écran trop court ni
avant la fin de l'intro, rien demandé avant le premier affichage, et toutes les légendes,
dans les quatre langues, tenues dans la fenêtre à 360 × 780 et à 1280 × 800.

### 3.15 Tension du monde 1 (v1.8.0)

**But** : donner au monde 1 l'émotion du genre, la bille qui frôle le trou, sans défaite en 1-1
ni en 1-2 et sans attente pour allonger un niveau. Le tableau ci-dessous fixe le rôle de chaque
niveau avant tout réglage (étape 6).

**Mesures** (`tests/levels/tension.test.ts` ; `TENSION=nebula npx vitest run
tests/levels/tension.test.ts` imprime les tables d'un monde) : chaque niveau joué par deux
robots sur les trois plateaux (carré, haut, large), huit graines chacun (vingt-quatre depuis le
réglage, plus bas).

- **Le nouveau venu** : un tir toutes les 1,6 s, une erreur de visée de 32 unités, sans plan
  (profil de l'étude du 21/10/2026, à recaler sur le test de couloir).
- **L'occasionnel** : un tir toutes les 1,2 s, une erreur de 24 unités.

Pour chaque partie :

- la **pointe** : la plus grande avancée de la tête de chaîne, en part du tracé ; la ruée du
  départ la pose à 30 % au plus ;
- le **temps sous pression** : la tête au-delà de la moitié du tracé, en part de la partie ;
- les **quasi-défaites** : une pointe au-delà des quatre cinquièmes, là où jouera la zone de
  grâce ;
- le **temps mort** : aucune bille à l'écran pendant que d'autres attendent dans le tunnel
  (« maigre » : moins de trois).

**Tables de départ** (26/10/2026, version 1.8.0 en cours ; durée : médiane des victoires ;
pointe et pression : médianes des 24 parties) :

Robot nouveau venu :

| Niveau | Victoires | Durée | Pointe | Pointe max | Sous pression | Quasi-défaites | Temps mort | Maigre |
| ------ | --------- | ----- | ------ | ---------- | ------------- | -------------- | ---------- | ------ |
| 1-1    | 24/24     | 0:30  | 29 %   | 34 %       | 0 %           | 0/24           | 0,0 s      | 0,3 s  |
| 1-2    | 24/24     | 0:32  | 29 %   | 37 %       | 0 %           | 0/24           | 0,0 s      | 0,3 s  |
| 1-3    | 24/24     | 0:36  | 36 %   | 40 %       | 0 %           | 0/24           | 0,0 s      | 0,3 s  |
| 1-4    | 24/24     | 0:41  | 26 %   | 36 %       | 0 %           | 0/24           | 0,0 s      | 0,8 s  |
| 1-5    | 24/24     | 1:02  | 30 %   | 50 %       | 0 %           | 0/24           | 0,0 s      | 0,3 s  |
| 1-6    | 24/24     | 0:47  | 36 %   | 60 %       | 0 %           | 0/24           | 0,0 s      | 0,3 s  |
| 1-7    | 24/24     | 0:51  | 51 %   | 84 %       | 1 %           | 1/24           | 0,0 s      | 0,1 s  |
| 1-8    | 24/24     | 1:03  | 43 %   | 63 %       | 0 %           | 0/24           | 0,0 s      | 0,3 s  |
| 1-9    | 23/24     | 1:16  | 32 %   | 101 %      | 0 %           | 1/24           | 0,0 s      | 0,3 s  |
| 1-10   | 24/24     | 0:52  | 29 %   | 44 %       | 0 %           | 0/24           | 0,0 s      | 0,3 s  |
| 1-11   | 23/24     | 1:22  | 61 %   | 100 %      | 13 %          | 2/24           | 0,0 s      | 0,3 s  |
| 1-12   | 24/24     | 1:38  | 69 %   | 93 %       | 20 %          | 6/24           | 0,0 s      | 0,3 s  |

Robot occasionnel :

| Niveau | Victoires | Durée | Pointe | Pointe max | Sous pression | Quasi-défaites | Temps mort | Maigre |
| ------ | --------- | ----- | ------ | ---------- | ------------- | -------------- | ---------- | ------ |
| 1-1    | 24/24     | 0:26  | 28 %   | 35 %       | 0 %           | 0/24           | 0,0 s      | 0,3 s  |
| 1-2    | 24/24     | 0:24  | 28 %   | 37 %       | 0 %           | 0/24           | 0,0 s      | 0,3 s  |
| 1-3    | 24/24     | 0:32  | 33 %   | 39 %       | 0 %           | 0/24           | 0,0 s      | 0,3 s  |
| 1-4    | 24/24     | 0:33  | 25 %   | 33 %       | 0 %           | 0/24           | 0,1 s      | 0,9 s  |
| 1-5    | 24/24     | 0:46  | 27 %   | 36 %       | 0 %           | 0/24           | 0,0 s      | 0,3 s  |
| 1-6    | 24/24     | 0:39  | 34 %   | 50 %       | 0 %           | 0/24           | 0,0 s      | 0,6 s  |
| 1-7    | 24/24     | 0:41  | 40 %   | 60 %       | 0 %           | 0/24           | 0,0 s      | 0,1 s  |
| 1-8    | 24/24     | 0:51  | 29 %   | 47 %       | 0 %           | 0/24           | 0,0 s      | 0,3 s  |
| 1-9    | 24/24     | 1:01  | 31 %   | 44 %       | 0 %           | 0/24           | 0,0 s      | 0,3 s  |
| 1-10   | 24/24     | 0:47  | 27 %   | 32 %       | 0 %           | 0/24           | 0,0 s      | 0,3 s  |
| 1-11   | 24/24     | 1:03  | 41 %   | 64 %       | 0 %           | 0/24           | 0,0 s      | 0,3 s  |
| 1-12   | 24/24     | 1:16  | 53 %   | 70 %       | 6 %           | 0/24           | 0,0 s      | 0,3 s  |

**Lecture** : le monde 1 est plat et sûr. Pour le nouveau venu, la pointe médiane reste entre
26 et 51 % du tracé de 1-1 à 1-10 : la tête dépasse à peine la ruée du départ. La pression
ne compte vraiment qu'en 1-11 (13 % du temps) et contre le Colosse (20 %), et il n'y a qu'une
quasi-défaite avant 1-9. Il n'y a aucun temps mort : on a toujours de quoi viser. Les durées, de
0:30 à 1:38, sont celles d'un robot plus rapide que les gens. Le test de couloir donne le
rapport entre les deux, par la durée réelle du 1-1 face à celle du robot.

**Tableau du monde 1** (validé le 26/10/2026, avant tout réglage) : la tension monte en dents de
scie, chaque frisson plus haut que le précédent (1-3, puis 1-7, 1-11 et le Colosse), avec une
respiration après chacun des deux premiers. Les pointes et les quasi-défaites visées sont
celles du robot nouveau venu, sur 24 parties ; les durées, celles de vrais joueurs.

| Niveau | Rôle        | Nouveauté                                  | Durée visée | Pointe : aujourd'hui → visée | Quasi-défaites visées | Leviers proposés                |
| ------ | ----------- | ------------------------------------------ | ----------- | ---------------------------- | --------------------- | ------------------------------- |
| 1-1    | Calme       | Viser et grouper                           | 60–90 s     | 29 % → 40 % au plus          | 0                     | Aucun (chaîne posée à la main)  |
| 1-2    | Montée      | Échanger                                   | 60–90 s     | 29 % → 40–50 %               | 0                     | Vitesse                         |
| 1-3    | Frisson     | Le jeune Colosse                           | 90–150 s    | 36 % → 55–65 %               | 2 à 4                 | Vitesse, puis endurance du boss |
| 1-4    | Respiration | Le Recul, première bille bonus             | 90–120 s    | 26 % → 40–50 %               | 0 à 1                 | Longueur, à vitesse égale       |
| 1-5    | Montée      | Les réactions, la quatrième couleur        | 90–150 s    | 30 % → 50–60 %               | 1 à 2                 | Vitesse                         |
| 1-6    | Montée      | Le Ralenti                                 | 90–150 s    | 36 % → 55–65 %               | 2 à 3                 | Vitesse, puis longueur          |
| 1-7    | Frisson     | Deux chaînes                               | 90–150 s    | 51 % → 60–70 %               | 3 à 5                 | Longueur                        |
| 1-8    | Respiration | Le Tir arc-en-ciel                         | 90–150 s    | 43 % → 45–55 %               | 0 à 1                 | Aucun, ou un peu de vitesse     |
| 1-9    | Montée      | Les acquis mêlés, serpentin à quatre rangs | 2:00–2:30   | 32 % → 55–65 %               | 2 à 3                 | Vitesse, puis longueur          |
| 1-10   | Montée      | Le Laser                                   | 2:00–2:30   | 29 % → 55–65 %               | 2 à 3                 | Vitesse, puis longueur          |
| 1-11   | Frisson     | La cinquième couleur                       | 2:00–2:30   | 61 % → 65–70 %               | 4 à 6                 | Longueur                        |
| 1-12   | Colosse     | Le Colosse stellaire                       | 2:30–3:30   | 69 % → 65–75 %               | 5 à 8                 | Endurance du boss               |

**Trois choix tranchés avec le tableau** (26/10/2026) :

1. **Le calendrier des couleurs** (trois jusqu'à 1-4, quatre dès 1-5, cinq en 1-11) est déjà
   une montée, liée aux nouveautés : il reste tel quel, et chaque niveau se règle par la
   vitesse, puis la longueur, plutôt que par le nombre de couleurs.
2. **Les respirations** (1-4, 1-8) visent zéro ou une quasi-défaite, en exception à la règle
   de l'étape 6 (« au moins une quasi-défaite par niveau dès 1-3 »).
3. **1-9 n'a pas de nouveauté** dans les données : c'est le niveau où les acquis se mêlent,
   sur le plus long tracé du monde ; la cinquième couleur reste en 1-11.

**Signaux de danger et zone de grâce** (étape 6, première partie, livrée le 26/10/2026, avant
le réglage des niveaux, qui attend le test de couloir) :

- **Les signaux montent plus tôt** (`src/play/dangerCues.ts`), là où va vraiment la chaîne d'un
  nouveau venu : la musique se tend dès la moitié du tracé (au lieu de 65 %) ; dès les deux
  tiers, le trou rougit (au lieu de 75 %), le cœur bat et le danger est annoncé aux lecteurs
  d'écran (au lieu de 80 %).
- **La zone de grâce** (`src/levels/grace.ts`) : dans le dernier cinquième du tracé, pendant que
  les signaux jouent, la chaîne de la campagne ralentit, en douceur sur un vingtième du tracé :
  à la moitié de sa vitesse dans les mondes 1 à 3, aux 70 % dans les mondes 4 à 6, et sans
  répit en Légende. La quasi-défaite reste plus souvent une quasi-défaite. L'entraînement n'en a
  pas : sa chaîne s'arrête avant le trou.
- **Mesure sur le monde 1 tel qu'il est** (robot nouveau venu, 24 parties par niveau) : ses deux
  seules défaites deviennent des quasi-défaites, en 1-9 (pointe max 101 % → 95 %) et en 1-11
  (100 % → 92 %) ; rien d'autre ne change, aucune autre chaîne n'atteignant le dernier
  cinquième. Elle servira de filet au réglage, qui rapprochera les chaînes du trou.

**Réglage du monde 1** (étape 6, seconde partie, 26/10/2026). Le test de couloir est remis à
plus tard : le robot nouveau venu reste celui du 21/10/2026, et les durées réelles restent à
mesurer sur des inconnus. Les mesures passent à 72 parties par niveau (vingt-quatre graines sur
chacun des trois plateaux) : sur 24, les quasi-défaites variaient de deux à trois d'un tirage à
l'autre, et 1-11, mesuré à 61 %, est à 70 % sur 72 parties. Les leviers, dans l'ordre du tableau :

| Niveau | Réglage                                 | Niveau | Réglage                               |
| ------ | --------------------------------------- | ------ | ------------------------------------- |
| 1-1    | inchangé (chaîne posée à la main)       | 1-7    | 22 → 26 billes par chaîne             |
| 1-2    | vitesse 34 → 64, 34 → 46 billes         | 1-8    | vitesse 58 → 64                       |
| 1-3    | vitesse 30 → 46, Colosse 20 → 30 points | 1-9    | vitesse 48 → 53, 52 → 56 billes       |
| 1-4    | vitesse 44 → 76, 40 → 50 billes         | 1-10   | vitesse 50 → 76, 46 → 56 billes       |
| 1-5    | vitesse 50 → 74                         | 1-11   | inchangé (déjà à 70 % sur 72 parties) |
| 1-6    | vitesse 42 → 56, 38 → 42 billes         | 1-12   | inchangé (déjà dans sa cible)         |

Robot nouveau venu, 72 parties par niveau :

| Niveau | Victoires | Durée | Pointe | Pointe max | Sous pression | Quasi-défaites | Temps mort | Maigre |
| ------ | --------- | ----- | ------ | ---------- | ------------- | -------------- | ---------- | ------ |
| 1-1    | 72/72     | 0:31  | 28 %   | 36 %       | 0 %           | 0/72           | 0,0 s      | 0,3 s  |
| 1-2    | 72/72     | 0:40  | 35 %   | 74 %       | 0 %           | 0/72           | 0,0 s      | 0,3 s  |
| 1-3    | 72/72     | 0:45  | 53 %   | 100 %      | 5 %           | 11/72          | 0,0 s      | 0,3 s  |
| 1-4    | 72/72     | 0:45  | 35 %   | 89 %       | 0 %           | 1/72           | 0,0 s      | 0,3 s  |
| 1-5    | 72/72     | 0:59  | 54 %   | 93 %       | 4 %           | 5/72           | 0,0 s      | 0,3 s  |
| 1-6    | 72/72     | 0:53  | 43 %   | 96 %       | 0 %           | 8/72           | 0,0 s      | 0,3 s  |
| 1-7    | 72/72     | 1:02  | 64 %   | 98 %       | 18 %          | 11/72          | 0,0 s      | 0,1 s  |
| 1-8    | 72/72     | 1:03  | 47 %   | 87 %       | 0 %           | 1/72           | 0,0 s      | 0,3 s  |
| 1-9    | 72/72     | 1:21  | 46 %   | 87 %       | 0 %           | 9/72           | 0,0 s      | 0,3 s  |
| 1-10   | 72/72     | 1:07  | 54 %   | 93 %       | 5 %           | 7/72           | 0,0 s      | 0,3 s  |
| 1-11   | 72/72     | 1:26  | 70 %   | 99 %       | 23 %          | 18/72          | 0,0 s      | 0,3 s  |
| 1-12   | 72/72     | 1:36  | 66 %   | 96 %       | 19 %          | 16/72          | 0,0 s      | 0,3 s  |

Robot occasionnel, 72 parties par niveau : 72 victoires sur 72 partout, pointes de 27 à 51 %,
deux quasi-défaites en tout (1-3) : qui joue mieux garde de la marge.

**Lecture** : les trois frissons montent (1-3 à 53 %, 1-7 à 64 %, 1-11 à 70 %), chacun suivi
d'une respiration (1-4 à 35 %, 1-8 à 47 %), et le Colosse conclut (66 %) ; les quasi-défaites
sont toutes dans leur cible ramenée à 24 parties, et le nouveau venu ne perd plus aucune des
864 parties du monde. Quatre pointes restent sous la leur, à dessein :

- **1-2 et 1-4** (35 %) : le deuxième niveau et une respiration ; plus vite, le nouveau venu
  frôle déjà le trou en 1-2, et le robot joue plus vite que les gens.
- **1-6 et 1-9** (43 et 46 %), les serpentins : sur un plateau large, leur tracé est 1,7 fois
  plus long qu'ailleurs (il tient 73 billes au lieu de 42), si bien que le large reste facile
  quand les autres plateaux font déjà des quasi-défaites et des défaites ; leurs quasi-défaites,
  elles, sont dans la cible.

**Règles tenues** : aucune chaîne plus longue que son tracé ne le permet (le tracé fait au moins
1,2 fois la chaîne sur chaque plateau), aucun temps mort, aucune défaite en 1-1 ni en 1-2. Les
étoiles sont recalibrées sur 72 parties par niveau (36 avant), et la garde du monde 1 vérifie
sur 24 parties que la calibration n'a pas vues que la troisième étoile reste entre 15 et 45 % des
victoires d'un joueur soigneux.

**Durées** : celles du robot vont de 0:31 à 1:36. Le rapport aux vrais joueurs reste à mesurer
(test sur inconnus) ; s'ils mettent 1,5 fois plus de temps, le monde va de 0:47 à 2:24, sous les
durées visées des premiers niveaux.

**Écart entre les plateaux**, relevé pendant le réglage : le plateau large, celui d'un écran
d'ordinateur en 16:9, est le plus facile presque partout, de 5 à 18 points de pointe médiane
(1-6 : 26 % en large, 40 % en haut). La vitesse ne suffit pas à le corriger, puisqu'un tracé plus
long rend aussi chaque explosion moins efficace ; il faudra un réglage par plateau, sur tous les
mondes et leurs étoiles.

### 3.16 Atelier, Observatoire et porte-monnaie (v1.8.0)

**Demandé le 26/10/2026**, maquette validée le même jour : les deux écrans tiennent sur un
écran, sans défilement, et le solde reste en vue partout.

**Porte-monnaie** (`PlayerWallet`) :

- Les deux monnaies, chacune avec son signe : l'éclat, gemme d'or ourlée comme les boutons
  dorés ; le fragment d'étoile, étoile cyan. Les éclats sont dorés partout, cadeau du jour
  compris, les fragments cyan.
- En haut à droite de chaque écran de menu : accueil (sous les boutons ronds sur un
  téléphone, à côté dès 40rem), carte (à côté du retour ; sur un écran couché, le retour n'y
  garde que sa flèche, son nom restant lu), Observatoire, Atelier, Arcade et objectifs ; en
  tête du menu de pause.
- La monnaie de l'écran est mise en avant : plus grande, cerclée de sa couleur, son nom sous
  le chiffre (éclats à l'Atelier, en Arcade et aux objectifs ; fragments à l'Observatoire).
  Le nom disparaît des bandeaux de moins de 22rem (téléphones de 360 px et moins).
- À chaque gain ou achat, le chiffre compte jusqu'au nouveau solde en 0,45 s et la
  différence s'envole (« −150 », « +215 ») ; en mouvement réduit, le chiffre change d'un coup
  et la différence s'efface sur place. Un lecteur d'écran entend chaque solde en phrase
  (« 280 éclats »).
- Le panneau de victoire donne le nouveau solde à côté des éclats gagnés (« +215 éclats ·
  Solde : 495 »).

**Atelier** :

- Quatre onglets, Lanceurs, Traînées, Éclatements et Plateaux, chacun avec son compte
  « possédés / total » ; les flèches, Début et Fin passent d'un onglet à l'autre
  (`TabBar`). Un onglet s'ouvre sur l'objet le moins cher à acheter, sinon sur l'objet porté.
- **Cabine d'essayage** : l'objet touché joue avec le vrai moteur, en boucle, comme la
  boucle de l'écran titre (§ 3.14) : le lanceur vise et tire, vu de près (×2,2) ; la traînée
  suit le plus long tir qui fait un groupe (×1,5) ; l'éclatement fait sauter une cascade
  (×1,9) ; le plateau montre sa chaîne (×1,3). Toutes sur le niveau 1-2, posé en paires
  emboîtées (`src/showcase/fittings.ts`). Chaque scène culmine en moins de 2 s et dure 3,5 à
  4 s ; un autre objet touché se fond sur la scène qui joue. Jouée par un worker quand le
  navigateur le permet, arrêtée hors de l'écran et dans un onglet caché ; en mouvement
  réduit, une image fixe, au sommet de chaque scène. Jusqu'à la première image, la vignette
  de l'objet tient la place. Aucun code de la cabine n'est chargé avant l'ouverture de
  l'Atelier (`FittingPlayer`, `fittingWorker`).
- La cabine prend la place que les cartes lui laissent : 16:9, jusqu'au carré sur un
  téléphone et au 4:3 à côté des cartes ; elle rétrécit la première, jusqu'à 7rem de haut.
- Sous la cabine, le nom, la nature et l'état de l'objet (« Lanceur · Pas encore à vous »)
  et une seule action : « Acheter · 150 ◆ », « Équiper » ou « Il manque 40 ◆ » (désactivé).
  Un plateau à débloquer s'essaie aussi et dit quel monde finir. L'essai d'une partie contre
  une publicité (§ 3.7) reste, dans le coin de la cabine, là où les publicités jouent ;
  derrière un bloqueur, une note le dit au pied de la cabine.

**Observatoire** :

- Trois onglets par portée d'effet : **Tir** (Œil stellaire, Bille prismatique, Nova,
  Attrape-étoiles), **Chaîne** (Chronos, Onde de choc, Seconde chance) et **Météo** (Bouclier
  thermique, Brise-glace, Ancre) ; chacun montre ses rangs achetés (« 3/12 ») et un point
  cyan quand une amélioration y est à portée (`src/engine/upgrades/ranges.ts`).
- Des tuiles (nom, rangs, coût du prochain) et le détail de l'amélioration choisie : ses
  trois rangs, acquis cochés et prochain cerclé, et un seul bouton doré : « Améliorer ·
  12 ★ », « Il manque 7 ★ » (désactivé, avec le moyen d'en gagner) ou « Au maximum ».
- Il s'ouvre sur la première amélioration abordable dans l'ordre des onglets, sinon la
  première qui n'est pas au maximum ; chaque onglet s'ouvre de même sur la sienne.
- Introduction courte, « Améliorez vos instruments de campagne. », masquée sur les
  téléphones de moins de 44rem de haut.

**Tenue à l'écran** : aucun défilement de 360 × 640 à 2560 px, téléphones couchés (844 × 390,
734 × 343, 640 × 400) et cadres des portails compris, dans les quatre langues ; sur 320 × 568,
seules les cartes de l'Atelier défilent, dans leur cadre (`e2e/menus.spec.ts`). Le bandeau
(`ScreenHeader`) se règle sur sa propre largeur : retour et porte-monnaie, puis titre, puis
onglets sur un téléphone ; titre au premier rang dès 36rem ; tout sur une ligne dès 48rem,
le titre passant à la ligne à sa césure plutôt que de serrer les onglets sous 17rem.

### 3.17 Équilibre téléphone et ordinateur (v1.8.1)

**But** : qu'un niveau soit aussi difficile au téléphone qu'à l'ordinateur, et que les 72 niveaux
suivent la courbe des campagnes mesurées. Faute de testeurs, le réglage s'appuie sur des
joueurs-robots tirés d'études publiées ; seuls les premiers joueurs des portails fixeront le
niveau absolu.

**L'étude** du 27/10/2026, « Difficulty studies for Ballmania balance » (hors dépôt, dans
`reports/etude-crazygames-2026-10-21/reports/`, chaque chiffre sourcé), en sept points :

- **Le robot classe, il ne prédit pas.** Aucune équipe n'a prédit la réussite de vrais joueurs à
  partir d'un robot sans données de joueurs : King y arrive à 4 ou 5 points près, après avoir
  appris sur 800 niveaux de parties humaines, et Rovio comme Tactile partent aussi de leurs
  joueurs. Le robot range donc les niveaux, place les pics et mesure les marges ; les bandes
  ci-dessous sont ses cibles, que les événements de la 1.10.0 recaleront (appareil, essais,
  victoires, défaites et abandons de chaque niveau).
- **Une longue entrée, puis 1,2 à 3 essais par niveau.** Candy Crush s'ouvre sur 10 à 20
  niveaux presque sans défaite, Lily's Garden sur une centaine ; ensuite, un niveau demande en
  moyenne 1,2 à 3 essais. Nos 72 niveaux tiennent tout entiers dans cette entrée des jeux
  gratuits, et un jeu financé par la publicité n'a aucune raison de copier leurs niveaux à 80 ou
  95 % d'échecs, faits pour vendre.
- **Plus facile garde plus longtemps.** Les grandes expériences de terrain (Lomas et al. 2013,
  10 000 et 70 000 joueurs ; Ascarza et al., plus de 300 000) gardent plus longtemps les joueurs
  d'un jeu plus facile. L'abandon suit les joueurs qui échouent et partent sans finir (Rovio :
  corrélation de −0,59 avec la réussite, contre −0,14 pour l'abandon en général), et la première
  marche après l'apprentissage est celle où EA perdait des joueurs.
- **Des frissons sans défaite.** Perdre de justesse excite autant qu'une victoire et donne autant
  envie de rejouer (Larche et al. 2017) : la zone de grâce (§ 3.15) change les défaites en
  victoires de justesse. L'aide invisible d'EA, une graine plus facile après une défaite, a
  augmenté les parties jouées de 4 à 8 % ; elle reste pour plus tard.
- **Le robot de la 1.8.0 joue mieux qu'un vrai nouveau venu.** Son erreur, uniforme sur
  ±32 unités le long de la chaîne, vaut ±0,62 bille (une bille fait 52 unités), avec un écart
  type de 0,36 bille : 1,4 fois celui d'un utilisateur de souris en laboratoire, autant qu'un tir
  pressé au doigt. Mais il pèse toutes les cibles et n'oublie jamais d'échanger : son monde 1
  sans défaite est une borne optimiste.
- **La moitié des joueurs au téléphone.** Yandex compte la moitié de son temps de jeu sur des
  navigateurs de téléphone (avril 2025), et les estimations de trafic donnent 44 % de visites
  mobiles à CrazyGames aux États-Unis, 57 % à Poki : les 97 % d'ordinateurs du bac à sable
  Playgama ne sont pas représentatifs. Au téléphone, nos billes mesurent 3 à 4 mm, contre 11 à
  14 mm sur un écran d'ordinateur : la taille où, en laboratoire, le doigt commence à manquer sa
  cible.
- **Corriger les commandes, pas ralentir le jeu.** Aucune étude ne soutient un jeu plus lent au
  téléphone ; les jeux portés au toucher ont corrigé leurs commandes (bouton de tir à part, loupe,
  aide à la visée), pas leurs niveaux. Le point de contact glisse quand le doigt se lève (Holz et
  Baudisch 2011) ; viser en glissant avec un aperçu coûte 0,3 à 0,4 s de plus, mais rattrape
  l'essentiel de la précision (Vogel et Baudisch 2007).

**Bandes par monde** (décidées le 27/10/2026) : la part de victoires par essai du nouveau venu
typique, sur chaque appareil. La forme du monde 1 reste celle du § 3.15 (frissons en 1-3, 1-7,
1-11 et le Colosse, respirations en 1-4 et 1-8).

| Monde  | Rôle                                         | Victoires par essai | Le niveau le plus dur                                  | Règle                                                                  |
| ------ | -------------------------------------------- | ------------------- | ------------------------------------------------------ | ---------------------------------------------------------------------- |
| 1      | L'entrée, les premières minutes des portails | au moins 90 %       | au moins 80 %                                          | des victoires de justesse ; le nouveau venu lent, au doigt, gagne 80 % |
| 2      | La première marche, une mécanique nouvelle   | 80 à 85 %           | vers 60 %, après deux ou trois niveaux d'apprentissage | aucun pic dans les trois premiers niveaux                              |
| 3 et 4 | Le jeu engagé                                | 70 à 80 %           | 40 à 50 %                                              | une respiration après chaque pic, jamais deux niveaux durs de suite    |
| 5 et 6 | La fin de campagne                           | 60 à 70 %           | 30 à 40 %                                              | des pics courts, chacun suivi d'une respiration                        |

**Joueurs-robots** (étape 2), une main par appareil :

| Mesure                                     | Souris (ordinateur, plateau large) | Doigt (téléphone, plateau haut) | Source                                                                        |
| ------------------------------------------ | ---------------------------------- | ------------------------------- | ----------------------------------------------------------------------------- |
| Dispersion de la main (écart type, billes) | 0,25                               | 0,30                            | ISO 9241-9 et Aim Lab ; tir glissé avec aperçu sur 3 à 4 mm : 0,13 à 0,40     |
| Tir en bande                               | dispersion × 3                     | dispersion × 3                  | Puzzle Bobble : 0,0854 rad en bande contre 0,0274 en direct (Isaksen 2017)    |
| Temps de plus par tir                      | —                                  | 0,35 s                          | sélection au lever avec aperçu : 0,3 à 0,4 s de plus (Vogel et Baudisch 2007) |

Et trois nouveaux venus sur chacune :

| Profil                                           | Vif                | Typique       | Lent                            |
| ------------------------------------------------ | ------------------ | ------------- | ------------------------------- |
| Cadence : médiane (neuf tirs sur dix en dessous) | 1,2 s (1,7 s)      | 1,6 s (2,2 s) | 2,4 s (3,3 s)                   |
| Regard : la meilleure de                         | 6 cibles au hasard | 4 cibles      | 2 cibles                        |
| Échange quand la bille suivante vaut mieux       | 9 fois sur 10      | 7 fois sur 10 | 4 fois sur 10                   |
| Main                                             | × 0,8              | × 1           | × 1 à la souris, × 1,5 au doigt |

La cadence suit une loi log-normale : jamais deux tirs au même rythme. Le profil lent couvre les
joueurs de plus de 60 ans, deux fois plus lents à la souris (Findlater et al. 2013), et plus
dispersés au doigt sur de petites cibles ; 80 % des joueurs de Yandex ont plus de 25 ans. Le regard
et l'échange n'ont aucune mesure publiée : ce sont des hypothèses, que les premiers joueurs
recaleront ; le robot de l'entraînement fait déjà ce choix limité (la meilleure de dix visées au
hasard). Les couleurs et la main tirent de deux graines séparées, pour rejouer une même suite de
couleurs avec plusieurs mains. Chaque décision se prend sur 72 parties par plateau et par
robot : à 50 %, une part de victoires n'est connue qu'à ±11,5 points près.

**Visée au toucher** (étape 4) : le tir part dans la direction du dernier point stable. Si le
doigt a glissé de plus de 6 px (environ 1 mm) dans les 80 ms qui précèdent son lever, le tir garde
la visée d'avant ce glissement ; sinon, celle du point de lever. La souris ne change pas. Les deux
valeurs s'essaient sur un vrai téléphone.

**Même tracé sur chaque plateau** (étape 3) : un serpentin prend, dans la hauteur du plateau,
autant de rangées qu'il en faut pour garder à 10 % près la place de billes du plateau large, ses
rangées jamais à moins de 125 unités l'une de l'autre (2,4 billes) ; les aiguillages du Volcan
suivent leurs rangées. Les jumeaux des Abysses (3-4, 3-9), plus durs sur le plateau large malgré
plus de place, et les spirales à portail de la Singularité (6-6, 6-9) sont vérifiés plateau par
plateau, et la cause de leur écart corrigée.

**Porte de dépôt CrazyGames** (décidée le 27/10/2026, à la place du test sur inconnus) : les
bandes tenues par les joueurs-robots des deux appareils ; au moins 50 nouvelles parties de la
1.8.1 dans le bac à sable Playgama, dont un tiers au-delà de 2 minutes et une sur dix au-delà de
5 minutes (22 % et 5 % le 21/10/2026, sur la 1.4) ; puis la revue de modérateur complète.

**Tables de départ** (27/10/2026, version 1.8.0) : le robot nouveau venu de la 1.8.0, 24 parties
par plateau. Haut : un téléphone en portrait ; large : un ordinateur en 16:9 ; place : les billes
que tient le tracé de chaque chaîne ; pointe : médiane ; écart : haut moins large, en points.

| Niveau | Tracé                     | Place (haut / large) | Pointe (haut / large) | Écart | Victoires (haut / large) |
| ------ | ------------------------- | -------------------- | --------------------- | ----- | ------------------------ |
| 1-1    | spirale                   | 71 / 69              | 27 % / 28 %           | −1    | 24/24 / 24/24            |
| 1-2    | spirale                   | 77 / 74              | 34 % / 32 %           | +2    | 24/24 / 24/24            |
| 1-3    | serpentin                 | 52 / 87              | 64 % / 41 %           | +23   | 24/24 / 24/24            |
| 1-4    | spirale                   | 83 / 84              | 35 % / 32 %           | +3    | 24/24 / 24/24            |
| 1-5    | spirale                   | 93 / 90              | 56 % / 50 %           | +6    | 24/24 / 24/24            |
| 1-6    | serpentin                 | 52 / 87              | 65 % / 30 %           | +35   | 24/24 / 24/24            |
| 1-7    | double spirale            | 61+61 / 61+61        | 58 % / 57 %           | +1    | 24/24 / 24/24            |
| 1-8    | spirale                   | 90 / 90              | 43 % / 44 %           | −1    | 24/24 / 24/24            |
| 1-9    | serpentin                 | 71 / 116             | 58 % / 26 %           | +32   | 24/24 / 24/24            |
| 1-10   | spirale                   | 93 / 92              | 52 % / 54 %           | −2    | 24/24 / 24/24            |
| 1-11   | spirale                   | 101 / 102            | 70 % / 67 %           | +3    | 24/24 / 24/24            |
| 1-12   | spirale                   | 87 / 88              | 64 % / 59 %           | +5    | 24/24 / 24/24            |
| 2-1    | spirale                   | 74 / 72              | 29 % / 28 %           | +1    | 24/24 / 24/24            |
| 2-2    | serpentin                 | 52 / 87              | 38 % / 25 %           | +13   | 24/24 / 24/24            |
| 2-3    | spirale                   | 87 / 84              | 27 % / 27 %           | 0     | 24/24 / 24/24            |
| 2-4    | double spirale            | 61+61 / 61+61        | 56 % / 50 %           | +6    | 24/24 / 24/24            |
| 2-5    | serpentin                 | 71 / 116             | 34 % / 22 %           | +12   | 24/24 / 24/24            |
| 2-6    | spirale                   | 77 / 79              | 27 % / 28 %           | −1    | 24/24 / 24/24            |
| 2-7    | spirale                   | 95 / 96              | 39 % / 38 %           | +1    | 24/24 / 24/24            |
| 2-8    | serpentin                 | 52 / 87              | 64 % / 31 %           | +33   | 22/24 / 24/24            |
| 2-9    | double spirale            | 61+61 / 61+61        | 80 % / 75 %           | +5    | 24/24 / 24/24            |
| 2-10   | spirale                   | 89 / 90              | 26 % / 26 %           | 0     | 24/24 / 24/24            |
| 2-11   | spirale                   | 95 / 95              | 95 % / 89 %           | +6    | 17/24 / 20/24            |
| 2-12   | spirale                   | 87 / 88              | 56 % / 57 %           | −1    | 24/24 / 24/24            |
| 3-1    | spirale                   | 74 / 72              | 27 % / 25 %           | +2    | 24/24 / 24/24            |
| 3-2    | serpentin                 | 52 / 87              | 34 % / 23 %           | +11   | 24/24 / 24/24            |
| 3-3    | spirale                   | 88 / 86              | 28 % / 25 %           | +3    | 24/24 / 24/24            |
| 3-4    | jumeaux                   | 56+56 / 73+73        | 35 % / 91 %           | −56   | 24/24 / 12/24            |
| 3-5    | serpentin                 | 71 / 116             | 31 % / 21 %           | +10   | 24/24 / 24/24            |
| 3-6    | spirale                   | 77 / 79              | 24 % / 27 %           | −3    | 24/24 / 24/24            |
| 3-7    | spirale                   | 99 / 98              | 42 % / 43 %           | −1    | 24/24 / 24/24            |
| 3-8    | serpentin                 | 52 / 87              | 43 % / 27 %           | +16   | 23/24 / 24/24            |
| 3-9    | jumeaux                   | 56+56 / 73+73        | 36 % / 67 %           | −31   | 24/24 / 16/24            |
| 3-10   | spirale                   | 92 / 91              | 25 % / 23 %           | +2    | 24/24 / 24/24            |
| 3-11   | spirale                   | 92 / 93              | 72 % / 68 %           | +4    | 24/24 / 24/24            |
| 3-12   | spirale                   | 87 / 88              | 56 % / 54 %           | +2    | 24/24 / 24/24            |
| 4-1    | spirale                   | 74 / 72              | 32 % / 27 %           | +5    | 22/24 / 23/24            |
| 4-2    | serpentin                 | 52 / 87              | 36 % / 27 %           | +9    | 23/24 / 22/24            |
| 4-3    | spirale                   | 88 / 86              | 32 % / 26 %           | +6    | 23/24 / 23/24            |
| 4-4    | double spirale            | 61+61 / 61+61        | 49 % / 40 %           | +9    | 18/24 / 22/24            |
| 4-5    | serpentin                 | 71 / 116             | 31 % / 25 %           | +6    | 21/24 / 21/24            |
| 4-6    | spirale                   | 77 / 79              | 27 % / 30 %           | −3    | 22/24 / 22/24            |
| 4-7    | spirale                   | 99 / 98              | 32 % / 41 %           | −9    | 23/24 / 22/24            |
| 4-8    | serpentin                 | 52 / 87              | 63 % / 31 %           | +32   | 18/24 / 23/24            |
| 4-9    | double spirale            | 64+64 / 64+64        | 77 % / 57 %           | +20   | 15/24 / 21/24            |
| 4-10   | spirale                   | 92 / 91              | 31 % / 24 %           | +7    | 21/24 / 23/24            |
| 4-11   | spirale                   | 92 / 93              | 44 % / 40 %           | +4    | 24/24 / 19/24            |
| 4-12   | spirale                   | 87 / 88              | 63 % / 45 %           | +18   | 21/24 / 18/24            |
| 5-1    | serpentin à aiguillages   | 52 / 87              | 41 % / 28 %           | +13   | 24/24 / 24/24            |
| 5-2    | serpentin à aiguillages   | 52 / 87              | 56 % / 32 %           | +24   | 24/24 / 24/24            |
| 5-3    | serpentin à aiguillages   | 71 / 116             | 39 % / 24 %           | +15   | 23/24 / 24/24            |
| 5-4    | serpentin à aiguillages   | 52 / 87              | 36 % / 25 %           | +11   | 24/24 / 24/24            |
| 5-5    | serpentin à aiguillages   | 71 / 116             | 40 % / 28 %           | +12   | 24/24 / 24/24            |
| 5-6    | serpentin à aiguillages   | 52 / 87              | 39 % / 28 %           | +11   | 24/24 / 24/24            |
| 5-7    | serpentin à aiguillages   | 52 / 87              | 67 % / 41 %           | +26   | 22/24 / 24/24            |
| 5-8    | serpentin à aiguillages   | 71 / 116             | 54 % / 31 %           | +23   | 23/24 / 24/24            |
| 5-9    | serpentin à aiguillages   | 52 / 87              | 39 % / 29 %           | +10   | 24/24 / 24/24            |
| 5-10   | serpentin à aiguillages   | 71 / 116             | 26 % / 18 %           | +8    | 24/24 / 24/24            |
| 5-11   | serpentin à aiguillages   | 71 / 116             | 79 % / 34 %           | +45   | 20/24 / 22/24            |
| 5-12   | serpentin à aiguillages   | 52 / 87              | 76 % / 44 %           | +32   | 19/24 / 24/24            |
| 6-1    | spirale à portail         | 53 / 53              | 50 % / 39 %           | +11   | 24/24 / 24/24            |
| 6-2    | spirale à portail         | 60 / 59              | 38 % / 37 %           | +1    | 24/24 / 24/24            |
| 6-3    | spirale à portail         | 66 / 66              | 44 % / 44 %           | 0     | 23/24 / 23/24            |
| 6-4    | double spirale à portails | 43+43 / 43+43        | 73 % / 69 %           | +4    | 24/24 / 23/24            |
| 6-5    | spirale à portail         | 73 / 73              | 52 % / 45 %           | +7    | 24/24 / 24/24            |
| 6-6    | spirale à portail         | 59 / 60              | 61 % / 83 %           | −22   | 18/24 / 18/24            |
| 6-7    | spirale à portail         | 73 / 73              | 37 % / 36 %           | +1    | 24/24 / 24/24            |
| 6-8    | double spirale à portails | 50+50 / 50+50        | 72 % / 61 %           | +11   | 23/24 / 24/24            |
| 6-9    | spirale à portail         | 76 / 76              | 72 % / 87 %           | −15   | 19/24 / 22/24            |
| 6-10   | spirale à portail         | 59 / 60              | 37 % / 36 %           | +1    | 19/24 / 22/24            |
| 6-11   | spirale à portail         | 83 / 83              | 43 % / 41 %           | +2    | 24/24 / 24/24            |
| 6-12   | spirale à portail         | 66 / 66              | 52 % / 58 %           | −6    | 24/24 / 24/24            |

**Lecture** : 29 niveaux sur 72 s'écartent de 10 points ou plus, et 21 d'entre eux sont des
serpentins. Leurs rangées traversent la largeur : le plateau large leur donne 1,7 fois plus de
place (87 ou 116 billes contre 52 ou 71), et ils y sont de 6 à 45 points plus faciles qu'au
téléphone ; sur ordinateur, les serpentins du Volcan plafonnent entre 18 et 44 %. Les spirales
tiennent la même place sur les deux plateaux, et le même frisson à quelques points près. À
l'inverse, les jumeaux des Abysses sont bien plus durs sur le large (91 % et la moitié des parties
perdues en 3-4), comme deux spirales à portail de la Singularité (6-6, 6-9). Les écarts de la
Joaillerie en 4-9 et 4-12 (+20 et +18), sur des spirales de même place, sont à revérifier : à 24
parties par plateau, un écart de moins de 15 points peut n'être que du bruit. Le robot perd
surtout en Joaillerie (66 défaites sur 576 parties, souvent une partie qui s'emballe), en 2-11 et
dans la Singularité ; les mondes 2 à 6, réglés sur l'ancien robot « occasionnel », restent souvent
plats sur ordinateur (pointes de 18 à 35 %).

**Joueurs-robots en place** (étape 2, le 27/10/2026) : `NewcomerBrain`, `robotOf` et `playRobot`
dans `tests/levels/bot.ts`, vérifiés par `tests/levels/robots.test.ts` (cadence, dispersion,
regard, échange). Les robots d'avant (nouveau venu, occasionnel, humain, appliqué) jouent à
l'identique, partie pour partie : les étoiles et le réglage du monde 1 ne bougent pas.
`DEVICES=nebula npx vitest run tests/levels/devices.test.ts` écrit les tables d'un monde dans
`reports/appareils-nebula.md` (`DEVICES=all` : tous les mondes).

**Monde 1 remesuré** (version 1.8.0, avant les étapes 3 et 4 ; durée : médiane des victoires ;
pointe et pression : médianes des parties) :

Téléphone (plateau haut) : 24 suites de couleurs × 3 mains par robot.

| Niveau | Victoires typique | lent  | vif   | Durée typique | Pointe typique | Quasi-défaites typique | Sous pression typique |
| ------ | ----------------- | ----- | ----- | ------------- | -------------- | ---------------------- | --------------------- |
| 1-1    | 100 %             | 100 % | 100 % | 0:37          | 27 %           | 0/72                   | 0 %                   |
| 1-2    | 100 %             | 83 %  | 100 % | 0:49          | 45 %           | 0/72                   | 0 %                   |
| 1-3    | 79 %              | 35 %  | 100 % | 0:58          | 89 %           | 47/72                  | 44 %                  |
| 1-4    | 100 %             | 78 %  | 100 % | 0:58          | 48 %           | 7/72                   | 0 %                   |
| 1-5    | 97 %              | 44 %  | 100 % | 1:11          | 68 %           | 22/72                  | 23 %                  |
| 1-6    | 85 %              | 10 %  | 99 %  | 1:09          | 77 %           | 34/72                  | 35 %                  |
| 1-7    | 100 %             | 57 %  | 100 % | 1:18          | 73 %           | 24/72                  | 28 %                  |
| 1-8    | 99 %              | 46 %  | 100 % | 1:21          | 67 %           | 18/72                  | 23 %                  |
| 1-9    | 85 %              | 7 %   | 100 % | 1:41          | 84 %           | 45/72                  | 38 %                  |
| 1-10   | 99 %              | 32 %  | 100 % | 1:24          | 78 %           | 33/72                  | 29 %                  |
| 1-11   | 96 %              | 15 %  | 100 % | 1:41          | 86 %           | 48/72                  | 41 %                  |
| 1-12   | 99 %              | 64 %  | 100 % | 1:57          | 74 %           | 23/72                  | 25 %                  |

Ordinateur (plateau large) : 24 suites de couleurs × 3 mains par robot.

| Niveau | Victoires typique | lent  | vif   | Durée typique | Pointe typique | Quasi-défaites typique | Sous pression typique |
| ------ | ----------------- | ----- | ----- | ------------- | -------------- | ---------------------- | --------------------- |
| 1-1    | 100 %             | 100 % | 100 % | 0:30          | 28 %           | 0/72                   | 0 %                   |
| 1-2    | 100 %             | 99 %  | 100 % | 0:41          | 34 %           | 0/72                   | 0 %                   |
| 1-3    | 100 %             | 97 %  | 100 % | 0:47          | 41 %           | 0/72                   | 0 %                   |
| 1-4    | 100 %             | 96 %  | 100 % | 0:48          | 33 %           | 0/72                   | 0 %                   |
| 1-5    | 100 %             | 89 %  | 100 % | 0:59          | 50 %           | 1/72                   | 0 %                   |
| 1-6    | 100 %             | 85 %  | 100 % | 0:50          | 30 %           | 0/72                   | 0 %                   |
| 1-7    | 100 %             | 76 %  | 100 % | 1:03          | 61 %           | 5/72                   | 15 %                  |
| 1-8    | 100 %             | 93 %  | 100 % | 1:02          | 45 %           | 1/72                   | 0 %                   |
| 1-9    | 100 %             | 65 %  | 100 % | 1:15          | 27 %           | 0/72                   | 0 %                   |
| 1-10   | 100 %             | 75 %  | 100 % | 1:08          | 55 %           | 8/72                   | 7 %                   |
| 1-11   | 100 %             | 50 %  | 100 % | 1:27          | 64 %           | 17/72                  | 20 %                  |
| 1-12   | 100 %             | 94 %  | 100 % | 1:38          | 62 %           | 3/72                   | 13 %                  |

**Lecture** : sur ordinateur, le nouveau venu typique gagne tout, avec des pointes de 27 à 64 %,
et le lent perd jusqu'à une partie sur deux (1-11). Au téléphone, le monde est bien plus dur : le
typique tombe à 79 et 85 % sur les serpentins (1-3, 1-6, 1-9) et frôle le trou presque à chaque
partie (47 quasi-défaites sur 72 en 1-3) ; le lent, au doigt, ne gagne plus que 7 à 64 % des
parties dès 1-3, loin des 80 % visés ; le vif gagne partout. L'écart des serpentins (étape 3) et la
visée au toucher (étape 4) passent d'abord. La règle du lent au doigt reste à trancher avec les
tableaux (étape 5) : la tenir à la lettre rendrait le monde 1 plat pour les autres, alors qu'une
aide invisible, comme celle d'EA, ne soulagerait que ceux qui perdent.

**Même tracé sur chaque plateau** (étape 3, le 27/10/2026, captures validées par l'auteur) :

- **Les serpentins** (`src/levels/tracks.ts`) : leurs rangées traversent le plateau, si bien
  qu'un plateau étroit en empile désormais davantage, autant qu'il en faut pour approcher la
  longueur du plateau large, jamais à moins de 125 unités l'une de l'autre. Trois rangs : 52
  billes de place au téléphone, 87 maintenant, comme sur le large ; quatre rangs : 71, 119
  maintenant, pour 116. Les plateaux haut, portrait et paysage tiennent à 10 % du large ; le
  carré, celui d'une tablette couchée, ne tient que cinq rangs, soit 83 billes au plus (28 % de
  moins sur les serpentins à quatre rangs). Au téléphone, le tracé remplit l'écran au lieu de
  laisser un grand vide au-dessus du lanceur. Le mode Rythme, seul serpentin hors campagne,
  suit la même règle.
- **Les jumeaux des Abysses** (3-4, 3-9) : leurs rangées fuient devant le lanceur, placé entre
  les deux chaînes. Sur un plateau d'ordinateur, longues, elles se cachent l'une l'autre : 54 à
  62 % des tirs visés touchaient d'abord une autre bille (35 à 38 % au téléphone), et le robot
  typique ne gagnait que 4 à 12 parties sur 24 (moins de rangées n'y changeait rien). Sur un
  plateau plus large que haut, chaque chaîne descend maintenant du haut de sa moitié et
  serpente en colonnes, face au lanceur : 7 à 13 % de tirs cachés, 24 parties gagnées sur 24,
  pointe de 33 % (39 % au téléphone). Les colonnes ne sont pas plus hautes que les rangées,
  sans quoi l'écran d'ordinateur choisissait le plateau carré, aux rangées serrées : 46 à 48
  billes de place contre 56 au téléphone. Les plateaux d'une tablette (portrait, carré) sont
  trop étroits pour trois colonnes et gardent leurs rangées, plus difficiles (45 à 48 % de tirs
  cachés).
- **La Singularité** (6-6, 6-9) : avec la même main sur les deux plateaux, aucun écart réel ;
  celui des tables de départ venait du hasard de 24 parties.
- **Le robot compte les tirs cachés** (`aimedShots`, `hiddenShots`) : visé juste, le tir
  rencontre d'abord une autre bille.

**Quel plateau pour quel appareil** : le jeu choisit le plateau qui montre le contenu du niveau
le plus grand, pas celui de l'écran. Une fenêtre d'ordinateur maximisée (1920 × 947) montre
ainsi plusieurs niveaux sur le plateau paysage (1-6, et 3-4 avant ses colonnes), quand les
tables de départ supposaient le large partout. L'écran de jeu donne désormais son plateau
(`data-board`) : un relevé des 72 niveaux sur deux téléphones et trois fenêtres d'ordinateur
dira lequel chaque robot doit jouer, avant les tableaux (étape 5).

**Visée et charge au toucher** (étape 4, essai validé par l'auteur sur son téléphone le
28/10/2026) :

- **La visée d'avant le lever** (`src/play/Controls.ts`) : si le doigt a glissé de plus de 6 px
  dans les 80 ms qui précèdent son lever, le tir garde la visée d'avant ce glissement ; sinon,
  celle du point de lever. La souris ne change pas.
- **La charge tient sous le doigt** : elle ne repart de zéro qu'au-delà de 18 px (environ 3 mm)
  de son point de départ, au lieu de 6 px, si bien que le tremblement du doigt et les retouches
  de visée ne la vident plus ; le tir chargé, presque jamais atteint au téléphone, l'est
  désormais. À la souris, la charge court depuis l'appui, comme avant.
- **Le Ralenti garde les couleurs** (`PowerPainter.frost`) : un liseré de givre autour des
  billes remplace le voile clair qui délavait leurs couleurs pendant 8 s, le cyan d'abord.

**Écran de la défaite** (étape 6, le 28/10/2026, maquette validée par l'auteur) : une défaite
de campagne a son écran à elle (`DefeatReport`, d'après `DefeatSummary`) ; le défi du jour,
l'Arcade et l'entraînement, où l'on ne perd pas, gardent le panneau de fin.

- **Ce qui manquait, en vrai** : le trou qui l'a emporté, puis « Si près ! » dès 70 % du niveau
  détruit, « La chaîne l'emporte » en deçà ; les billes restées sur le tracé (« Plus que 9
  billes » quand c'était près, « Encore 46 billes » sinon) ou les points de vie du Colosse, une
  jauge de la part détruite, et la réaction la plus profonde de la partie.
- **Une astuce** : d'abord un geste jamais fait dans la partie (l'échange, puis le tir chargé),
  dit au doigt ou à la souris selon l'appareil, avec son dessin ; sinon l'indice du niveau,
  sauf ceux qui ouvrent un niveau (viser, assortir, échanger) ; sinon la réaction en chaîne.
- **« Rejouer » d'abord** : en grand, avec le focus, 1,9 s après la défaite ; puis l'aide après
  trois défaites, « Continuer » sur les portails, et la carte en simple lien. Le score de la
  partie n'y figure plus.
- **Tout tient sans défiler** aux quatre tailles du test des langues (de 320 × 568 à
  1280 × 720), dans les quatre langues, aide comprise : dans une fenêtre basse, le titre de
  l'astuce passe dans son texte, et sous 680 px de haut le trou, simple décor, cède sa place.
  Seule la défaite la plus chargée (l'aide et un objectif atteint) défile un peu sur un
  téléphone de 568 px de haut, « Rejouer » restant en vue.
- **Le rapport de partie** (`GameReport`) compte désormais les tirs chargés, les billes restées
  sur le tracé et les points de vie du Colosse.

**Le plateau de chaque écran** (relevé dans le jeu, `data-board`, le 28/10/2026) : le jeu prend
le plateau qui montre le niveau le plus grand, si bien qu'il change avec le niveau et l'écran.
Les tables de départ supposaient le plateau haut au téléphone et le large sur ordinateur.

| Écran                                             | Carré | Portrait | Haut | Paysage | Large |
| ------------------------------------------------- | ----- | -------- | ---- | ------- | ----- |
| Téléphone, barres du navigateur visibles, 393×659 | 43    | 27       | 2    | —       | —     |
| Téléphone en plein écran, 390×844                 | 3     | 17       | 52   | —       | —     |
| Ordinateur, cadre de portail 16:9, 1280×720       | 14    | —        | —    | 33      | 25    |
| Ordinateur, fenêtre de notre site, 1920×947       | —     | —        | —    | 14      | 58    |

Les robots jouent désormais chaque niveau sur le plateau de chacun des trois premiers écrans
(`tests/levels/boards.ts`) ; le cadre de portail tient lieu d'ordinateur, puisque c'est là que
les modérateurs et la plupart des joueurs des portails découvrent le jeu.

**Tableaux des mondes** (étape 9, validés par l'auteur le 28/10/2026) : le rôle de chaque niveau
sur la forme du monde 1 (frissons en 3, 7 et 11, respirations en 4 et 8, le Colosse en 12 ; au
Néon, aucun pic avant 2-5), la bande visée pour le nouveau venu typique d'après les bandes par
monde, et le robot d'aujourd'hui, avant tout réglage : victoires du typique sur 72 parties par
écran (↓ sous la bande, ↑ au-dessus), et celles du lent au doigt, barres visibles.

| Rôle        | Monde 1 | Monde 2 | Mondes 3 et 4 | Mondes 5 et 6 |
| ----------- | ------- | ------- | ------------- | ------------- |
| Calme       | ≥ 95 %  | ≥ 95 %  | ≥ 90 %        | 85–95 %       |
| Montée      | ≥ 90 %  | 85–90 % | 75–85 %       | 65–75 %       |
| Respiration | ≥ 95 %  | ≥ 90 %  | 85–95 %       | 80–90 %       |
| Frisson     | 85–95 % | 65–75 % | 55–65 %       | 45–55 %       |
| Le plus dur | 80–90 % | 55–65 % | 40–50 %       | 30–40 %       |
| Colosse     | 85–95 % | 65–75 % | 55–65 %       | 45–55 %       |

**Monde 1 — Nébuleuse**

| Niveau | Rôle                 | Nouveauté                                  | Visée   | Téléphone (barres) | Plein écran | Portail | Lent, barres |
| ------ | -------------------- | ------------------------------------------ | ------- | ------------------ | ----------- | ------- | ------------ |
| 1-1    | Calme                | Viser et grouper                           | ≥ 95 %  | 100 %              | 100 %       | 100 %   | 100 %        |
| 1-2    | Montée               | Échanger                                   | ≥ 90 %  | 100 %              | 100 %       | 100 %   | 69 %         |
| 1-3    | Frisson              | Le jeune Colosse                           | 85–95 % | 99 % ↑             | 100 % ↑     | 100 % ↑ | 86 %         |
| 1-4    | Respiration          | Le Recul, première bille bonus             | ≥ 95 %  | 100 %              | 100 %       | 100 %   | 83 %         |
| 1-5    | Montée               | Les réactions, la quatrième couleur        | ≥ 90 %  | 92 %               | 100 %       | 100 %   | 33 %         |
| 1-6    | Montée               | Le Ralenti                                 | ≥ 90 %  | 100 %              | 97 %        | 100 %   | 57 %         |
| 1-7    | Frisson              | Deux chaînes                               | 85–95 % | 90 %               | 94 %        | 100 % ↑ | 24 %         |
| 1-8    | Respiration          | Le Tir arc-en-ciel                         | ≥ 95 %  | 100 %              | 99 %        | 100 %   | 51 %         |
| 1-9    | Montée               | Les acquis mêlés, serpentin à quatre rangs | ≥ 90 %  | 100 %              | 100 %       | 99 %    | 31 %         |
| 1-10   | Montée               | Le Laser                                   | ≥ 90 %  | 81 % ↓             | 93 %        | 100 %   | 17 %         |
| 1-11   | Frisson, le plus dur | La cinquième couleur                       | 80–90 % | 72 % ↓             | 90 %        | 100 % ↑ | 4 %          |
| 1-12   | Colosse              | Le Colosse stellaire                       | 85–95 % | 89 %               | 99 % ↑      | 100 % ↑ | 19 %         |

**Monde 2 — Néon**

| Niveau | Rôle                 | Nouveauté                            | Visée   | Téléphone (barres) | Plein écran | Portail | Lent, barres |
| ------ | -------------------- | ------------------------------------ | ------- | ------------------ | ----------- | ------- | ------------ |
| 2-1    | Calme                | Le rebond sur les murs               | ≥ 95 %  | 100 %              | 100 %       | 100 %   | 100 %        |
| 2-2    | Montée               | Les murs sur un serpentin            | 85–90 % | 100 % ↑            | 100 % ↑     | 100 % ↑ | 93 %         |
| 2-3    | Montée               | Le prisme                            | 85–90 % | 100 % ↑            | 100 % ↑     | 100 % ↑ | 97 %         |
| 2-4    | Respiration          | Court, 26 billes                     | ≥ 90 %  | 90 %               | 100 %       | 100 %   | 31 %         |
| 2-5    | Frisson              | Les prismes qui tournent, l’arythmie | 65–75 % | 100 % ↑            | 100 % ↑     | 100 % ↑ | 63 %         |
| 2-6    | Respiration          | Les murs, sans nouveauté             | ≥ 90 %  | 100 %              | 100 %       | 100 %   | 100 %        |
| 2-7    | Montée               | Les prismes, une chaîne vive         | 85–90 % | 100 % ↑            | 100 % ↑     | 100 % ↑ | 67 %         |
| 2-8    | Frisson              | Les météores, la cinquième couleur   | 65–75 % | 85 % ↑             | 92 % ↑      | 100 % ↑ | 18 %         |
| 2-9    | Respiration          | Court, les prismes                   | ≥ 90 %  | 56 % ↓             | 75 % ↓      | 96 %    | 3 %          |
| 2-10   | Montée               | L’arythmie                           | 85–90 % | 100 % ↑            | 100 % ↑     | 100 % ↑ | 100 %        |
| 2-11   | Frisson, le plus dur | Cinq couleurs, météores et arythmie  | 55–65 % | 14 % ↓             | 28 % ↓      | 68 % ↑  | 0 %          |
| 2-12   | Colosse              | Le Colosse prismatique               | 65–75 % | 79 % ↑             | 96 % ↑      | 100 % ↑ | 17 %         |

**Monde 3 — Abysses**

| Niveau | Rôle                 | Nouveauté                               | Visée   | Téléphone (barres) | Plein écran | Portail | Lent, barres |
| ------ | -------------------- | --------------------------------------- | ------- | ------------------ | ----------- | ------- | ------------ |
| 3-1    | Calme                | L’aimant                                | ≥ 90 %  | 100 %              | 100 %       | 100 %   | 100 %        |
| 3-2    | Montée               | L’aimant qui relie deux groupes         | 75–85 % | 100 % ↑            | 100 % ↑     | 100 % ↑ | 99 %         |
| 3-3    | Frisson              | Le vent                                 | 55–65 % | 100 % ↑            | 100 % ↑     | 100 % ↑ | 97 %         |
| 3-4    | Respiration          | Les jumeaux, en colonnes                | 85–95 % | 92 %               | 92 %        | 100 % ↑ | 38 %         |
| 3-5    | Montée               | Cinq couleurs, serpentin à quatre rangs | 75–85 % | 100 % ↑            | 100 % ↑     | 100 % ↑ | 90 %         |
| 3-6    | Montée               | Les météores                            | 75–85 % | 100 % ↑            | 100 % ↑     | 100 % ↑ | 99 %         |
| 3-7    | Frisson              | Cinq couleurs, une chaîne vive          | 55–65 % | 100 % ↑            | 99 % ↑      | 100 % ↑ | 72 %         |
| 3-8    | Respiration          | Vent et arythmie, une seule charge      | 85–95 % | 100 % ↑            | 100 % ↑     | 100 % ↑ | 57 %         |
| 3-9    | Montée               | Les jumeaux et l’arythmie               | 75–85 % | 88 % ↑             | 88 % ↑      | 100 % ↑ | 42 %         |
| 3-10   | Montée               | Sans nouveauté                          | 75–85 % | 100 % ↑            | 100 % ↑     | 100 % ↑ | 99 %         |
| 3-11   | Frisson, le plus dur | Vent et météores, une seule charge      | 40–50 % | 65 % ↑             | 67 % ↑      | 100 % ↑ | 11 %         |
| 3-12   | Colosse              | Le Colosse abyssal                      | 55–65 % | 85 % ↑             | 97 % ↑      | 100 % ↑ | 14 %         |

**Monde 4 — Joaillerie**

| Niveau | Rôle                 | Nouveauté                               | Visée   | Téléphone (barres) | Plein écran | Portail | Lent, barres |
| ------ | -------------------- | --------------------------------------- | ------- | ------------------ | ----------- | ------- | ------------ |
| 4-1    | Calme                | L’alchimie, trois primaires             | ≥ 90 %  | 90 %               | 81 % ↓      | 88 % ↓  | 13 %         |
| 4-2    | Montée               | Les couleurs secondaires                | 75–85 % | 76 %               | 82 %        | 64 % ↓  | 4 %          |
| 4-3    | Frisson              | Le froid                                | 55–65 % | 86 % ↑             | 75 % ↑      | 61 %    | 6 %          |
| 4-4    | Respiration          | Court, 20 billes                        | 85–95 % | 49 % ↓             | 49 % ↓      | 64 % ↓  | 0 %          |
| 4-5    | Montée               | Cinq couleurs, serpentin à quatre rangs | 75–85 % | 47 % ↓             | 63 % ↓      | 69 % ↓  | 0 %          |
| 4-6    | Montée               | Sans nouveauté                          | 75–85 % | 85 %               | 69 % ↓      | 88 % ↑  | 14 %         |
| 4-7    | Frisson              | Six couleurs, le froid                  | 55–65 % | 57 %               | 53 % ↓      | 67 % ↑  | 0 %          |
| 4-8    | Respiration          | Cinq couleurs, serpentin                | 85–95 % | 51 % ↓             | 38 % ↓      | 57 % ↓  | 1 %          |
| 4-9    | Montée               | Court, cinq couleurs                    | 75–85 % | 38 % ↓             | 38 % ↓      | 31 % ↓  | 0 %          |
| 4-10   | Montée               | Sans nouveauté                          | 75–85 % | 76 %               | 56 % ↓      | 65 % ↓  | 1 %          |
| 4-11   | Frisson, le plus dur | Six couleurs, froid et arythmie         | 40–50 % | 79 % ↑             | 44 %        | 89 % ↑  | 0 %          |
| 4-12   | Colosse              | Le Colosse de cristal                   | 55–65 % | 82 % ↑             | 78 % ↑      | 75 % ↑  | 1 %          |

**Monde 5 — Volcan**

| Niveau | Rôle                 | Nouveauté                               | Visée   | Téléphone (barres) | Plein écran | Portail | Lent, barres |
| ------ | -------------------- | --------------------------------------- | ------- | ------------------ | ----------- | ------- | ------------ |
| 5-1    | Calme                | L’aiguillage                            | 85–95 % | 100 % ↑            | 100 % ↑     | 100 % ↑ | 86 %         |
| 5-2    | Montée               | Le raccourci brûlant                    | 65–75 % | 100 % ↑            | 100 % ↑     | 100 % ↑ | 69 %         |
| 5-3    | Frisson              | L’éruption solaire                      | 45–55 % | 100 % ↑            | 100 % ↑     | 100 % ↑ | 72 %         |
| 5-4    | Respiration          | L’aimant revient, cinq couleurs         | 80–90 % | 100 % ↑            | 100 % ↑     | 100 % ↑ | 76 %         |
| 5-5    | Montée               | Deux aiguillages, l’éruption            | 65–75 % | 100 % ↑            | 100 % ↑     | 99 % ↑  | 68 %         |
| 5-6    | Montée               | Sans nouveauté                          | 65–75 % | 100 % ↑            | 100 % ↑     | 100 % ↑ | 78 %         |
| 5-7    | Frisson              | Les murs reviennent                     | 45–55 % | 96 % ↑             | 93 % ↑      | 100 % ↑ | 15 %         |
| 5-8    | Respiration          | Trois aiguillages, l’éruption           | 80–90 % | 100 % ↑            | 99 % ↑      | 100 % ↑ | 57 %         |
| 5-9    | Montée               | Les murs, cinq couleurs                 | 65–75 % | 99 % ↑             | 99 % ↑      | 100 % ↑ | 43 %         |
| 5-10   | Montée               | Aimant, météores et arythmie            | 65–75 % | 100 % ↑            | 100 % ↑     | 100 % ↑ | 71 %         |
| 5-11   | Frisson, le plus dur | Trois aiguillages, éruption et arythmie | 30–40 % | 97 % ↑             | 96 % ↑      | 92 % ↑  | 32 %         |
| 5-12   | Colosse              | Le Colosse de lave                      | 45–55 % | 99 % ↑             | 100 % ↑     | 100 % ↑ | 78 %         |

**Monde 6 — Singularité**

| Niveau | Rôle                 | Nouveauté                      | Visée   | Téléphone (barres) | Plein écran | Portail | Lent, barres |
| ------ | -------------------- | ------------------------------ | ------- | ------------------ | ----------- | ------- | ------------ |
| 6-1    | Calme                | La gravité                     | 85–95 % | 94 %               | 94 %        | 100 % ↑ | 85 %         |
| 6-2    | Montée               | L’orbite                       | 65–75 % | 100 % ↑            | 100 % ↑     | 100 % ↑ | 71 %         |
| 6-3    | Frisson              | Le vent autour du trou noir    | 45–55 % | 69 % ↑             | 90 % ↑      | 78 % ↑  | 32 %         |
| 6-4    | Respiration          | L’orbite à rebours, court      | 80–90 % | 40 % ↓             | 78 % ↓      | 94 % ↑  | 1 %          |
| 6-5    | Montée               | Le froid, cinq couleurs        | 65–75 % | 90 % ↑             | 99 % ↑      | 100 % ↑ | 29 %         |
| 6-6    | Montée               | L’arythmie                     | 65–75 % | 81 % ↑             | 64 % ↓      | 83 % ↑  | 53 %         |
| 6-7    | Frisson              | L’aimant et l’éruption         | 45–55 % | 99 % ↑             | 100 % ↑     | 100 % ↑ | 60 %         |
| 6-8    | Respiration          | Court, cinq couleurs           | 80–90 % | 46 % ↓             | 89 %        | 97 % ↑  | 0 %          |
| 6-9    | Montée               | Murs, météores et vent         | 65–75 % | 15 % ↓             | 39 % ↓      | 58 % ↓  | 0 %          |
| 6-10   | Montée               | L’alchimie autour du trou noir | 65–75 % | 46 % ↓             | 28 % ↓      | 50 % ↓  | 3 %          |
| 6-11   | Frisson, le plus dur | Les trois météos               | 30–40 % | 78 % ↑             | 97 % ↑      | 100 % ↑ | 6 %          |
| 6-12   | Colosse              | Le Colosse ultime              | 45–55 % | 57 % ↑             | 100 % ↑     | 100 % ↑ | 28 %         |

**Lecture** :

- **Le plateau décide d'abord.** Le carré d'un téléphone aux barres visibles, où les tracés se
  serrent, est partout l'écran le plus dur, le cadre de portail le plus facile : au Néon, 2-11
  est gagné 14 fois sur 100 au téléphone, 68 sur ordinateur. L'outil de l'étape 10 règle donc
  chaque niveau plateau par plateau.
- **Le monde 1 est le plus près du but** (94 à 100 % en moyenne) : trop calme sur ordinateur,
  sans frisson (pointes de 28 à 64 %), un peu dur à sa fin au téléphone aux barres (1-10, 1-11).
- **Les mondes 2, 3 et 5 sont bien trop faciles** : presque tout s'y gagne à 96–100 %, avec des
  pointes de 20 à 50 %, sauf quelques pics bien trop durs (2-9, 2-11, 3-11). Le Volcan est le
  monde le plus facile de la campagne (99 % sur chaque écran).
- **La Joaillerie est trop dure et inégale** (31 à 90 %), et le lent n'y gagne presque jamais
  (1 % en médiane) : reste à savoir si c'est le robot, à l'alchimie, ou les niveaux (étape 10).
- **La Singularité est inégale** : son « plus dur », 6-11, se gagne à 78–100 %, quand 6-9 et
  6-10 tombent à 15–58 %.
- **Le nouveau venu lent, au doigt** : 42 % en médiane au monde 1 (4 % en 1-11), loin des 80 %
  de la règle ; 65 % au Néon, 81 % aux Abysses, 70 % au Volcan, 28 % à la Singularité. L'aide
  d'aujourd'hui (la chaîne 15 % moins vite après trois défaites) ne le porte qu'à 19–100 % au
  monde 1.

**La règle du lent au doigt** (tranchée le 28/10/2026) : au monde 1 seulement, l'aide s'offre
après deux défaites d'affilée au lieu de trois, et ralentit la chaîne de 25 % au lieu de 15 % ;
elle reste visible et choisie, et le nouveau venu typique garde ses victoires de justesse. Le
lent se remesure après le réglage de l'étape 10, aide comprise.

## 4. Exigences non fonctionnelles

### 4.1 Performance et Lighthouse

- Lighthouse **à 100** en Performance, Accessibilité, Bonnes pratiques et SEO, sur mobile
  (profil simulé Lighthouse, la plus faible de trois mesures) et sur ordinateur (règle du
  22/10/2026 ; avant : 98 en Performance, 95 ailleurs). La 1.7.4 mesure 98, 98 et 97 en
  Performance sur mobile : la 1.7.6 rattrape l'écart en affichant le titre dès le HTML
  statique et en demandant le code après ce premier affichage.
- Écran d'accueil rendu sans attendre le moteur : moteur, rendu et modes chargés à la
  demande (`import()`) au lancement d'une partie.
- Budget : JS initial ≤ 60 Ko compressés ; aucune police ni image bloquante ; CLS ≈ 0.
- 60 images/s visées sur Android d'entrée de gamme en mode _Équilibré_.
- **60 images par seconde au plus sur un écran tactile** (v1.7.6, conseil de Playgama) : les
  téléphones et tablettes rafraîchissent jusqu'à 120 fois par seconde, et tout dessiner les
  chauffe et vide leur batterie. `FrameCap` laisse passer les images à cadence régulière
  (une sur deux à 120 Hz, deux sur trois à 90 Hz) ; le temps d'une image sautée passe à la
  suivante, la simulation ne change pas. Partie et décor de l'accueil ; mesuré sur un profil
  tactile avec un écran simulé à 240 Hz. Un ordinateur garde toutes ses images.
- **Canevas plein écran limité à environ 4 mégapixels** (v1.7.6, `pixelRatioFor`) : jusqu'à
  2 pixels d'appareil par pixel CSS, moins sur un très grand écran (un écran 4K en
  demanderait 8 à 16, autant pour chaque calque du plateau). Le tampon d'un canevas, son
  fond et ses sprites ne sont refaits que quand sa taille change : un redémarrage ou un
  simple changement de marges les garde.

### 4.2 Responsive

- Mobile d'abord (≈ 360 px), puis points de rupture en `rem`, en syntaxe d'intervalle
  (v1.7.6 : `width >= 40rem`, soit 640 px avec la police par défaut) : ils suivent la taille
  de police choisie par le joueur, et sont placés là où le contenu casse ; la hauteur et les
  proportions comptent aussi (carte compacte, écran titre, rails du jeu).
- **Requêtes de conteneur** (v1.7.6) : l'écran de jeu est un conteneur (`container: game /
size`) ; ses bandes de HUD, ses rails, le cadre 2:1 et ses fenêtres (pause, résultat)
  suivent sa taille, plus celle de la fenêtre. Les cartes des mondes gardent les requêtes de
  la page : leur forme compacte suit la hauteur de la fenêtre (le squelette de la page à
  deux colonnes), et les largeurs de carte compacte et normale se recouvrent (340 à 900 px
  contre 330 à 736 px), si bien qu'aucune requête de conteneur ne garderait l'affichage à
  l'identique. Refonte vérifiée à l'identique : géométrie de chaque élément visible et
  captures, avant et après, sur 20 tailles et 8 écrans, deux thèmes, fenêtre de défaite
  comprise (196 paires identiques).
- Aucun défilement horizontal de 320 à 1920 px ; aire de jeu mise à l'échelle en conservant
  ses proportions, portrait et paysage. Plus aucun `overflow-x: hidden` ne masque un
  débordement (v1.7.6) : le test de débordement mesure la page et le cadre de chaque écran.
- **Carte de campagne sur un écran large et bas** (v1.7, jusqu'à 800 px de haut ; 960 px
  depuis la 1.8.0 : cadres de portail 907 × 510 et 821 × 462, téléphone couché,
  1280 × 720, fenêtres de navigateur jusqu'à celle d'un écran 1080p) : le menu en colonne à
  gauche (retour, titre, étoiles, difficulté, Observatoire en bas ; au-delà de 800 px de
  haut, l'Observatoire sous les difficultés), le paquet des mondes à droite, douze niveaux en
  deux rangées de six ; la page ne défile pas (testé de 915 × 412 à 1920 × 947). Empilée en
  une colonne, la carte demande 863 px de haut, 930 en russe, dont le badge de l'Observatoire
  met l'en-tête sur deux lignes : entre 800 et 863 px, elle défilait (v1.7). Sous 480 px de haut, la devise du monde et la description de la difficulté
  s'effacent. Sur un téléphone couché, jusqu'à 460 px de haut (v1.7.6 : 844 × 390,
  734 × 343, 640 × 400 et le 800 × 450 de CrazyGames), les trois difficultés se rangent côte à côte dans une colonne de
  14 rem, et le paquet perd sa rangée de noms : la carte nomme son monde, les flèches et le
  glissement le font tourner ; les cases gardent 44 px de large. Testé de 640 × 400 à
  1280 × 720, en anglais, en français et en russe.
- **La page ne défile jamais** (v1.7.6, règle de Playgama) : chaque écran défile dans son
  propre cadre (`<main>`), avec une barre fine aux couleurs du thème au lieu de la barre
  grise du navigateur. Testé sans barre de page aux tailles de Playgama (360 × 640,
  390 × 844, 915 × 412, 1280 × 720, 1920 × 1080, 2560 × 1440) et aux cadres de CrazyGames
  (907 × 510, 1216 × 684, 1077 × 606, 821 × 462, 1366 × 768, 1536 × 864, 800 × 450,
  1080 × 607), sur l'accueil, la carte, l'Observatoire, l'Arcade, l'Atelier et les
  objectifs.
- **Écran de jeu en plein écran** (v1.5.0) : le niveau occupe tout l'écran, le HUD et les
  boutons flottent sur ses bords dans des bandes de taille fixe (en haut et en bas sur un
  écran droit, en rails à gauche et à droite sur un écran large, dès 3:2). Le niveau est
  ajusté à ce qui doit être vu (tracés sur le plateau, lanceur et son anneau, miroirs,
  entrées que le HUD cacherait), pas au plateau entier : sur le cadre de Playgama au
  téléphone (375 × 768), il prend en moyenne 95 % de la largeur et 72 % de l'écran, billes
  11 % plus grosses qu'avant (jusqu'à 80 %). Sa taille ne change jamais pendant la partie :
  ni une série, ni un badge, ni une barre de navigateur qui se replie (le plateau garde sa
  taille et sa place tant que le niveau tient à l'écran) ; seule une rotation ou un grand
  changement le réajuste. Après une rotation, « Recommencer » choisit à nouveau la forme du
  plateau (v1.7.6) : le niveau repart en paysage sur un téléphone couché.
- **Écran immobile** (v1.6.0) : aucun rebond ni « tirer pour rafraîchir » sur tout le site
  (`overscroll-behavior: none`), rien ne défile vers la page d'un portail ; pendant une
  partie, l'écran ne défile ni ne zoome plus du tout (`touch-action: none`, gestes retenus
  pour Safari iOS) ; seules les fenêtres de dialogue défilent en elles-mêmes si leur
  contenu dépasse l'écran.
- **Touches de défilement** (v1.7.6, Playgama et CrazyGames) : les flèches, Page haut et
  bas, Début, Fin et Espace font défiler les listes du jeu, jamais la page d'un portail
  autour de lui (`ScrollKeyGuard`) : là où le jeu n'a plus rien à faire défiler, un
  navigateur passe la touche à cette page. Sans élément actif, elles font défiler l'écran ;
  les champs, curseurs, groupes de boutons radio et boutons gardent leurs touches. La
  molette s'arrête au bord du cadre de l'écran (`overscroll-behavior: contain`). Testé dans
  un cadre de 800 × 450 sur une page de portail plus haute que la fenêtre : accueil,
  Observatoire, partie.
- **Victoire** (v1.6.0) : en 1,7 s, une lumière blanche court le long de chaque tracé, de
  l'entrée au trou, et laisse la rainure allumée ; le trou rassemble la lumière puis éclate
  en supernova (cœur blanc, anneaux néon qui sortent de l'écran, onde qui courbe l'image,
  poussière d'étoiles qui monte) ; le plateau reste visible et s'éteint doucement. Le
  résultat arrive sur un panneau de verre dépoli au contour de lumière tournant : titre
  balayé de lumière, score qui monte, étoiles qui se matérialisent avec un anneau et un
  carillon montant. Mouvement réduit : les tracés s'allument et s'éteignent, une lueur au
  trou, résultat sans animation.
- **La suite** (v1.7.2) : le bouton principal du panneau de victoire annonce le niveau
  suivant et ce qu'il apporte pour la première fois (« Suivant : niveau 1-3 », puis
  « Boss : Jeune Colosse stellaire », une bille, un nouveau monde ou une mécanique, d'après le
  conseil du niveau, `noveltyOf`) ; le bloc des gains donne les objectifs atteints, puis
  les éclats gagnés et la barre vers le prochain lanceur de l'Atelier (le moins cher
  qu'on ne possède pas, avec son aperçu : « Couronne », puis « Lanceur · 115 / 150 éclats »
  sous la barre) ; bonus de fin et record tiennent sur une ligne ; « Rejouer » et « Carte » se
  partagent une ligne sous le bouton principal. Tout le panneau tient sans défilement à
  1280 × 720 et au téléphone, même avec l'offre de publicité. Mesuré : le panneau s'ouvre
  1,8 s après la dernière bille, et le niveau suivant accepte un tir 0,05 s après le clic.
- **Le premier lanceur** (v1.8.0, maquette validée le 26/10/2026) : dès que les éclats
  couvrent le prix du lanceur visé, la barre est pleine, « Lanceur · 150 éclats » se lit
  dessous et « Équiper » apparaît à côté, un bouton secondaire bordé d'or (« Suivant » reste
  le seul bouton doré du panneau). Un toucher l'achète et le porte, rien ne s'achète sans
  ce geste, et l'Atelier reste là pour choisir autrement. Le geste, en 0,7 s : le bouton
  s'enfonce, les éclats quittent la barre en arc et filent dans l'aperçu (0,3 s), qui
  enfle dans un anneau de lumière quand le titre devient « Couronne équipée » (0,32 s), puis
  la barre se remplit vers le lanceur suivant (« Halo · 65 / 250 éclats »), avec un son
  (un souffle qui monte, puis deux cloches) et une vibration. La rangée garde sa hauteur :
  rien ne bouge sous le doigt. Si les éclats couvrent aussi le suivant, « Équiper » revient,
  un toucher par lanceur. Le focus passe à « Suivant », et les lecteurs d'écran entendent
  « Couronne équipée ». Mouvement réduit : les mots changent en fondu, sans étincelles. La
  logique est `LauncherOffer` (`src/app`), le dessin `NextLauncher.vue`. Mesuré
  (`tests/app/firstLauncher.test.ts`, robot nouveau venu, monde 1 dans l'ordre, chaque
  niveau rejoué jusqu'à la victoire, quatre graines sur trois plateaux) : la Couronne se
  porte au panneau de 1-1 dans 4 parcours sur 12, de 1-2 dans 4 et de 1-3 dans 4 ; le Halo
  au plus tard à 1-7 ; l'Œil à 1-12 dans 8 parcours, plus tôt dans 3 ; solde médian après
  chaque niveau entre 98 et 223 éclats.
- **Jauge d'étoiles** (v1.7.2) : sous le score, une barre se remplit vers les points de la
  2ᵉ et de la 3ᵉ étoile (`starThresholds` ; la 1ʳᵉ est la victoire), et chaque étoile
  s'allume avec son carillon quand le score l'atteint (annoncé aux lecteurs d'écran :
  « 2 étoiles à portée »). Campagne et défi du jour seulement : l'Arcade compte autrement.
  Sur un écran droit, la bande du haut lui garde une ligne sous ses boutons (1,75 rem, le
  plateau s'ajuste dessous comme sous la barre du Colosse) : elle ne couvre ni la piste, ni
  la barre du Colosse, ni les recettes de l'Alchimie, et la série se place à sa droite, au
  niveau de la barre ; le plateau y perd au plus 2 % (mesuré de 320 × 568 à 390 × 844).
  Dans le rail d'un écran large, elle suit le score et la série passe dessous.
- **Cibles et textes** (v1.7.6, maquette validée) : sur un écran tactile, les boutons pressés
  toute la partie (Échanger, Aimant, Nova) font 48 px de haut, les noms des mondes au-dessus
  du paquet 44 px ; un aiguillage du Volcan répond à un toucher dans un cercle de 44 px au
  moins, quelle que soit la taille du plateau (`leverReach`) ; les mots du HUD (niveau,
  difficulté, « Score », série, puces) font 14 px au moins, mesurés dans le plus petit cadre
  de CrazyGames (821 × 462) ; les listes déroulantes font 16 px, sous lesquels iOS zoome la
  page. La carte du cadeau du jour tenait déjà à 320 px (1.7.5).
- **Encoches et barre d'accueil** (v1.7.6) : les menus se tiennent à l'écart des zones de
  sécurité (`env(safe-area-inset-*)` sur le `<main>` de chaque menu) ; l'écran titre place son
  contenu à l'intérieur et garde son décor jusqu'aux bords ; en jeu, le plateau se règle aussi
  sur ces marges et reste, sur un téléphone couché, au-dessus de la barre d'accueil. Testé
  avec une encoche de 47 px et une barre de 21 px simulées.
- **Cadre de jeu à 2:1 au plus** (v1.7.6, règle de Playgama, décidé le 22/10/2026) : dans une
  fenêtre d'ordinateur plus large que 2:1, le plateau et les rails du HUD tiennent dans un
  cadre de 2:1 au milieu ; l'art du plateau va jusqu'aux bords de la fenêtre, sans bandes
  noires, et l'ombre des rails part du bord de la fenêtre. Un téléphone couché garde toute
  sa largeur.
- **Barre du navigateur** (v1.7.6) : elle prend la couleur du fond du thème affiché
  (`theme-color`, réglée par `theme-boot.js` puis à chaque changement de thème), et non plus
  celle du système : le jeu est sombre par défaut, même sur un système clair.
- Typographie fluide (`clamp()`), espacements en `rem`, cibles tactiles ≥ 44 × 44 px.

### 4.3 Accessibilité

- Menus entièrement utilisables au clavier, focus visible, libellés ARIA.
- Couleurs des billes **doublées d'un motif** (symbole gravé) pour les daltoniens.
- Contrastes AA dans les deux thèmes ; annonces des événements clés via `aria-live`.

Livré au lot 12 :

- **Audits automatiques** axe-core (règles WCAG 2.1 A et AA) de chaque écran — accueil,
  carte, Observatoire, Arcade, Atelier, objectifs, réglages, partie, pause, bilan — dans
  les deux thèmes, sur mobile et ordinateur, à chaque série de parcours. Corrigés : un
  libellé ARIA sur un élément sans rôle (rangs de l'Observatoire), le contraste des
  badges colorés (météo, groove, fragments : texte neutre, liseré coloré).
- **Clavier** : un parcours va de l'accueil à la partie et au menu pause sans souris
  (viser, tirer, tir chargé, échanger, pause, reprendre ; le focus revient au plateau).
- **Lecteurs d'écran** : nouvelle annonce quand une chaîne approche du trou (une fois par
  approche), en plus des réactions, aiguillages, météo, paliers et fins de partie.
- **Mise en page** : aucun défilement horizontal de 320 à 1 920 px, vérifié écran par
  écran (en indonésien, la langue aux textes les plus longs).

Depuis la v1.7.5 :

- **Langues longues** : un test de bout en bout vérifie chaque menu, la bulle de
  l'Observatoire et une partie (jeu, pause, défaite avec aide) en russe, en indonésien et
  en français, à 320 × 568, 360 × 640, 390 × 844 et 1 280 × 720 : aucun texte hors de son
  bouton, de sa tuile, de sa bulle, de son choix ou de l'écran, aucun choix poussé hors de
  sa colonne, aucune pastille ni titre du cadeau sur deux lignes, aucun défilement
  horizontal, un panneau de fin sans défilement. Les mots longs des tuiles et des
  difficultés portent une césure conditionnelle (U+00AD), que les lecteurs d'écran ignorent ;
  les compteurs de l'accueil montrent le nombre à côté de leur icône et donnent la phrase
  entière aux lecteurs d'écran ; sous 360 px, un libellé de la barre de jeu prend deux lignes
  plutôt que de sortir de son bouton.
- Les audits axe-core passent aussi en russe, dans les deux thèmes.

### 4.3 bis Référencement (livré au lot 12)

- Titre et description traduits suivant la langue ; cartes Open Graph et Twitter (image
  1 200 × 630) ; données structurées schema.org `VideoGame` ; manifeste ; message pour
  les navigateurs sans JavaScript.
- Avec `SITE_URL` au build : lien canonique, adresses absolues des cartes, `sitemap.xml`
  et `robots.txt` qui le cite. Sans adresse connue, le build reste relatif et déployable
  partout.

### 4.4 Internationalisation

- `vue-i18n`, textes dans `en.json`, `fr.json`, `id.json` et, depuis la v1.7.5, `ru.json`
  (mêmes clés et mêmes variables, vérifié par test). Depuis le lot 5, **chaque langue est
  un fichier séparé** : le visiteur ne télécharge que la sienne (≈ 3 Ko compressés), les
  autres au premier changement de langue.
- Langue détectée depuis le navigateur ou le portail, modifiable dans les réglages. Une
  langue que le jeu ne parle pas mène à l'anglais ; le biélorusse, le kazakh et le
  kirghize mènent au russe, l'ukrainien reste à l'anglais.
- Nombres et dates via `Intl`. **Pluriels** (v1.7.5) : chaque nombre suivi d'un nom passe
  par vue-i18n avec le nombre lui-même, et chaque message a ses formes « zéro | un |
  plusieurs » ; le russe en a quatre (« zéro | un | quelques | beaucoup »), choisies par
  `Intl.PluralRules` (« 1 шар, 2 шара, 5 шаров »). Un test vérifie les formes rendues.
- **Rédaction** (revue de la v1.7.5) : un glossaire commun aux quatre langues (bille :
  marble, bola, шар ; lanceur : launcher, penembak, пушка ; éclats : shards, kepingan,
  осколки ; Atelier : Workshop, Bengkel, Мастерская…) et des tournures naturelles plutôt
  que calquées. En français : espace insécable U+00A0 avant « : ; ! ? % » et dans « »
  (Fredoka n'a pas l'espace fine), apostrophes typographiques, ordinaux en toutes lettres.
  En russe : vouvoiement, lettre ё, guillemets « », espace insécable devant le tiret et
  les unités, et les variables après un deux-points, là où elles n'ont pas à se décliner.
  Des tests vérifient la typographie française et russe. Les noms des jeux du genre ne
  sont jamais cités (§ 2.3).
- **Polices** (v1.7.5) : Fredoka et Lilita One n'ont pas de lettres cyrilliques. Le russe
  s'écrit en Nunito (SIL OFL 1.1), arrondie comme Fredoka, dans un fichier variable de
  23,6 Ko taillé pour ce qu'il affiche (texte en 600, gras en 800, titres en 900) et
  déclaré avec `unicode-range` : les autres langues ne le téléchargent jamais. En russe,
  Nunito porte tout le texte de l'interface (un mot ne mêle pas deux polices, Fredoka
  n'est pas téléchargée) et elle est attendue avec les messages, 1,5 s au plus, pour
  éviter un saut de texte. Les blancs de la page sont en police système, pour qu'aucune
  police ne parte avant que le jeu connaisse sa langue.
- **Clavier** : un raccourci se lit à la position de la touche quand elle tape une lettre
  d'un autre alphabet (clavier russe) ; l'AZERTY garde la lettre imprimée.
- `<html lang>`, titre et description de la page (site et portails), cartes de partage,
  données structurées (`inLanguage`) et manifeste suivent les fichiers de langue.

### 4.5 Thèmes

- Thème **clair** et **sombre**, plus « système » (`prefers-color-scheme`) par défaut.
- Couleurs exclusivement via des jetons CSS ; le rendu du jeu lit la même palette.

### 4.6 Confidentialité et sécurité

- Sur notre site : aucun cookie, aucun traceur, aucun appel réseau tiers. Sur les portails,
  seul le SDK du portail (régie et consentement gérés par lui) est chargé.
- Politique de sécurité du contenu (CSP) stricte, sans `'unsafe-inline'` : les seuls blocs en
  ligne de la page (styles et scripts du premier affichage, v1.7.6) sont autorisés un par un
  par leur empreinte.

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
- **CSP** stricte ajoutée à la page construite (`default-src 'self'`, aucun
  `'unsafe-inline'`) ; les gabarits n'utilisent donc jamais d'attribut `style`.
- **Premier affichage** (v1.7.6, notre site seulement) : le module `firstPaint` du build
  (`vite.config.ts`) met dans la page les jetons de couleur et la carte de titre
  (`src/styles/first-paint.css`, le nom du jeu sur le ciel de nuit, en police système), le
  script de thème et un chargeur. La page se peint sans aucune autre requête ; le chargeur
  attend que le navigateur annonce ce premier affichage (entrée `first-contentful-paint` ;
  une image plus tard s'il ne l'annonce pas, tout de suite dans un onglet ouvert en
  arrière-plan), puis demande les feuilles de style et le code ; l'application, une fois
  montée, fond la carte (`src/main.ts`). Ces blocs en ligne sont autorisés par leur
  empreinte dans la CSP. Le décor animé de l'accueil attend que la page soit chargée et le
  navigateur au repos (`src/ui/idle.ts`), puis se dessine dans un worker sur le canvas
  qu'on lui confie (`OffscreenCanvas`, `src/ui/title/TitleBackdrop.ts`) : la mise en route
  graphique de sa première image, jusqu'à un dixième de seconde dans un navigateur à froid,
  ne bloque plus la page. Les navigateurs qui ne savent pas confier un canvas à un worker
  le dessinent dans la page. Les builds de portail gardent leur démarrage : un nouveau
  joueur arrive directement en jeu, sans carte de titre.

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
- **Remise en jeu** (v1.7.3) : quand une chaîne a moins de 8 billes sur le plateau et qu'il
  en reste dans le tunnel, elle reprend sa vitesse d'entrée, freinée à partir de 4 billes,
  jusqu'à en montrer 8 ; jamais en Duel, pour une chaîne immobile, ni quand sa tête a passé
  40 % du tracé. Mesuré au robot sur le monde 1 : l'attente (moins de trois billes à l'écran
  pendant que d'autres attendent au tunnel) passe de 15,7 s au plus à moins d'une seconde
  par niveau, et les parties d'un joueur rapide raccourcissent d'un tiers (1-4 : 51 s →
  32 s) ; victoires et danger inchangés. Au 1-1, chaque grosse explosion de la vitrine
  laisse encore l'écran vide environ 0,3 s.
- **Derrière un Colosse aussi** (v1.7.4) : le Colosse, derrière la queue, est alors lui
  aussi dans le tunnel ; il ne se presse donc que hors de vue, jamais vers le trou. Robot
  rapide, part de la partie avec moins de trois billes à viser : 1-3 de 5,9 à 1,2 %,
  Abysses 12 de 7,7 à 0,6 %, Joaillerie 12 de 13,9 à 1,4 %, Singularité 12 de 11,4 à
  0,5 %, Volcan 12 de 3,4 à 0,3 %. Le combat de Joaillerie 12 raccourcit nettement (64 s au
  lieu de 110 s pour le robot occasionnel, danger 0,34 au lieu de 0,49).
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

### 5.6 Campagne et objectifs (livrés au lot 4)

| Élément                     | Responsabilité                                                                               |
| --------------------------- | -------------------------------------------------------------------------------------------- |
| `Objective` (interface)     | Ce qui fait gagner un niveau ; le jeu l'interroge, l'objectif ne termine jamais la partie    |
| `ClearObjective`            | Détruire toutes les billes                                                                   |
| `ColossusObjective`         | Combat de boss : poussée, dégâts de proximité, phases, renforts                              |
| `Chain` (ajouts)            | Pousseur à l'arrière, `feed` (billes ajoutées), `clear` (cascade finale), facteur de vitesse |
| `TrackRecipe`, `buildTrack` | Tracés par recette, pour les plateaux carré et portrait                                      |
| `CampaignLevel`, `WORLDS`   | Monde 1 en données ; `resolveLevel` le traduit en géométrie pour un plateau                  |
| `CampaignProgress`          | Étoiles, records, déblocages, sauvegarde versionnée                                          |
| `WorldTheme`, `NebulaTheme` | Fond du monde (nébuleuses, étoiles), peint une fois par taille et par thème                  |
| `CampaignScreen`, `StarRow` | Carte de campagne, chargée à la demande                                                      |

### 5.7 Progression (livrée au lot 5)

| Élément                                                 | Responsabilité                                                                             |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `GameReport` (`Game.summary()`)                         | Ce que dit une partie : score, billes, profondeur, série, échanges, danger, Colosse        |
| `PlayerProfile`                                         | Éclats, achats, équipement, compteurs, objectifs, défis, défaites ; `recordGame` paie tout |
| `catalog`, `achievements`, `rewards`                    | Données : cosmétiques, objectifs, barème                                                   |
| `DailyChallenge`                                        | Niveau et graine du jour                                                                   |
| `ShooterSkin`, `TrailStyle`, `ShardShape`, `WorldTheme` | Stratégies cosmétiques, choisies par `resolveLook`                                         |
| `ShareService`                                          | Feuille de partage ou presse-papiers                                                       |
| `PlayRequest`                                           | Ce que l'on joue : niveau de campagne (avec ou sans aide) ou défi du jour                  |
| `ShopScreen`, `AchievementsScreen`, `CosmeticPreview`   | Atelier et objectifs, chargés à la demande                                                 |

`resolveLevel` (géométrie d'un niveau) a quitté `campaign.ts` : l'accueil n'embarque plus
le moteur de tracés.

### 5.8 Miroirs (livrés au lot 6)

| Élément                                                   | Responsabilité                                                                       |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `Segment`                                                 | Segment immuable : point le plus proche, distance, normale                           |
| `Reflector`, `Wall`, `Prism`                              | Miroirs ; le prisme se reconstruit quand il tourne                                   |
| `Reflectors`                                              | Ensemble des miroirs ; `bounce` (cercle contre segments) sert aux tirs et à la visée |
| `Projectile` (ajouts)                                     | Vitesse modifiable, nombre de rebonds                                                |
| `Game.aimPath`                                            | Ligne de visée avec rebonds, calculée par le moteur                                  |
| `MirrorRecipe` → `ReflectorDefinition` → `ReflectorSetup` | Miroirs en fractions du plateau, puis en unités, puis pour le moteur                 |

### 5.9 Aimant (livré au lot 7)

| Élément                              | Responsabilité                                                                      |
| ------------------------------------ | ----------------------------------------------------------------------------------- |
| `MagnetSetup`                        | Charges de départ, maximum, explosions par recharge                                 |
| `Game.pull`, `Game.magnet`           | Aspire la bille visée (même trajet que la ligne de visée, rebonds compris), charges |
| `Game.trace` (privé)                 | Trajet commun à la ligne de visée et à l'aimant : points et bille touchée           |
| `Chain.extract`                      | Retire une bille ; le trou suit les règles habituelles (rappel, réaction)           |
| `Shooter.load`                       | Charge la bille aspirée et protège sa couleur jusqu'à son tir                       |
| Événements `pulled`, `magnetCharged` | Animation, son, vibration, interface                                                |
| `AbyssTheme`                         | Fond du monde 3                                                                     |

### 5.10 Alchimie (livrée au lot 8)

| Élément                                       | Responsabilité                                                  |
| --------------------------------------------- | --------------------------------------------------------------- |
| `Alchemy` (`PRIMARIES`, `mix`, `ingredients`) | Table des mélanges de lumière                                   |
| `Ball.recolour`, `Chain.recolour`             | Changement de couleur d'une bille, explosion du groupe complété |
| `ChainRecipe.palette`, `.paired`              | Couleurs tirées au choix, couleurs qui arrivent par paires      |
| `Game` (`alchemy`, `fuse`, `shooterTones`)    | Fusion au lieu d'insertion, primaires utiles au lanceur         |
| `Game.aimTarget`                              | Bille que touchera le tir (aperçu du mélange, robot)            |
| Événement `fused`                             | Effet, son, compteur `fusions` du bilan                         |
| `JewelTheme`                                  | Fond du monde 4                                                 |

### 5.11 Aiguillages (livrés au lot 9)

| Élément                                      | Responsabilité                                                         |
| -------------------------------------------- | ---------------------------------------------------------------------- |
| `ForkedRoute`, `RoutePart`, `ForkSpan`       | Tracé en lignes et fourches ; construit un `Path` pour un choix donné  |
| `Chain.setPath`, `Chain.front`               | Change de tracé (identique jusqu'à la tête), position de l'avant       |
| `Game.switches`, `Game.toggleSwitch`         | État des aiguillages, bascule tant que la chaîne ne les a pas atteints |
| `HOT_MULTIPLIER`, `Scoring` (multiplicateur) | Points doublés sur un raccourci                                        |
| `TrackRecipe` serpentin `forks`, `TrackPart` | Fourches générées pour les deux plateaux                               |
| `PathDefinition` « forked »                  | Tracé à aiguillages en données                                         |
| `VolcanoTheme`                               | Fond du monde 5                                                        |

### 5.12 Gravité et orbite (livrées au lot 10)

| Élément                                             | Responsabilité                                                          |
| --------------------------------------------------- | ----------------------------------------------------------------------- |
| `Gravity` (`acceleration`, `swallows`)              | Attraction du trou noir, adoucie au centre ; horizon qui avale les tirs |
| `Orbit`                                             | Anneau elliptique parcouru à vitesse angulaire constante                |
| `Shooter.moveTo`, `Shooter.position`                | Lanceur mobile qui garde la visée sur le point visé                     |
| `Projectile.accelerate`, `.age`, `.deflection`      | Trajectoire courbée, durée de vol, angle de déviation                   |
| `Game.aimLine`, `Game.ring`                         | Ligne de visée courbe (même intégration que le vol), rebonds à part     |
| Événement `swallowed`, `GameReport.curves`          | Tir avalé ; tirs courbés réussis (objectif « fronde gravitationnelle ») |
| `TrackRecipe` spirale `portal`                      | Spirale sans tunnel d'entrée, dans l'anneau du lanceur                  |
| `BlackHole`, `Destruction.setAttractor`, `.swallow` | Rendu du trou noir et de l'anneau, implosion des débris                 |
| `SingularityTheme`                                  | Fond du monde 6                                                         |

### 5.13 Modes Arcade (livrés au lot 10)

| Élément                                                                            | Responsabilité                                                                                                         |
| ---------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `PlayMode`, `createMode` (`src/app/modes`)                                         | Une stratégie par façon de jouer : niveau, textes, récompenses, suite ; l'écran de jeu ne teste plus le type de partie |
| `CampaignMode`, `DailyMode`, `EndlessMode`, `PuzzleMode`, `RhythmMode`, `DuelMode` | Les six modes                                                                                                          |
| `EndlessObjective`, `PuzzleObjective`, `DuelObjective`                             | Objectifs : paliers sans fin ; tirs comptés (`isFailed`) ; tir à la corde                                              |
| `Objective.isFailed`, `ObjectiveContext` (temps, tirs, billes en vol, paliers)     | Défaites autres que le trou                                                                                            |
| `Tempo`, `Groove`                                                                  | Horloge musicale, pulsation de la chaîne, fenêtre du temps, multiplicateur                                             |
| `Rival`                                                                            | Adversaire du Duel : cadence, erreur, concentration, ligne de vue, camp défendu                                        |
| `Shooter` (`choosing`, `side`), `Projectile.by`                                    | Couleur au choix (Énigmes), tirs du rival distingués                                                                   |
| `Chain.placed`, `.append`, `.shift`, `compact`                                     | Chaîne posée, regain en tête, poussée, trous refermés des deux côtés                                                   |
| `PuzzleSolver`, `generatePuzzle`                                                   | Minimum de tirs, solution, tirage des énigmes                                                                          |
| `ArcadeProgress`, `ArcadeScreen`                                                   | Records Arcade, écran des quatre modes                                                                                 |
| `SoundEngine.beat`, `.grooveUp`, `.stageUp`, `.rivalShoot`                         | Musique du Rythme et sons des modes                                                                                    |

### 5.14 Plateformes et publicités (livrées au lot 13)

| Élément                                                                         | Responsabilité                                                                               |
| ------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `PlatformAdapter` (`src/platform`)                                              | Ce que le jeu demande à son hôte : publicités, sauvegarde, signaux, langue, partage, silence |
| `StandalonePlatform`                                                            | Notre site : aucune publicité, stockage du navigateur, lien vers la page                     |
| `CrazyGamesPlatform`, `PokiPlatform`, `GameDistributionPlatform`                | Un adaptateur par SDK, qui n'échoue jamais (SDK absent, bloqueur, publicité refusée)         |
| `SimulatedPlatform`                                                             | Faux portail du développement et des tests de bout en bout                                   |
| `createPlatform`, `__PLATFORM__`, `vite build --mode <portail>`                 | Choix de la plateforme au build, code des autres retiré                                      |
| `AdPolicy`                                                                      | _Quand_ une interstitielle est permise (3 min, récompensées comprises)                       |
| `AdService`                                                                     | Publicités vues par l'interface : interstitielle, récompensée, silence pendant               |
| `GameplaySignals`                                                               | Début et fin de jeu signalés une fois chacun                                                 |
| `Game.revive`, `PlaySession.revive`, `.hold` / `.release`, `BallMotion.undrain` | Continuer après une défaite ; temps arrêté pendant une publicité                             |
| `puzzleHint`, `PlaySession.showHint`, `Scene.hint`                              | Indice d'énigme et anneau sur la bille                                                       |
| `PlayMode.continuable`                                                          | Les modes où l'on peut continuer                                                             |
| `PlayerProfile.tryOn`, `.takeLook`, `.grantShards`                              | Cosmétique prêté pour une partie, éclats doublés                                             |

### 5.15 Écran de jeu (v1.7.6)

L'écran de jeu assemble des parties qui ont chacune une seule raison de changer ; il ne prend
plus aucune décision de jeu (son script passe de 727 à 235 lignes).

| Élément                                                                                 | Responsabilité                                                                                                                                                                                                                    |
| --------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GameScreen` (`src/ui/screens`)                                                         | Assemble les parties ; enregistre la partie finie ; publicités récompensées et pauses naturelles entre deux parties                                                                                                               |
| `useGameSession` (`src/ui/game`)                                                        | La session, créée une fois l'écran posé ; la forme du plateau ; pointeur, clavier, taille et visibilité ; son et réglages ; ce que le portail en apprend (ses pauses, les publicités qui couvrent la partie, début et fin de jeu) |
| `useAnnouncements`                                                                      | Annonces du lecteur d'écran et mot d'éloge au-dessus du plateau                                                                                                                                                                   |
| `GameHud`, `GameControls`                                                               | Barre du haut (rail de gauche sur écran large), pastilles et seconde ligne ; boutons du bas (rail de droite)                                                                                                                      |
| `PausePanel`, `ResultPanel`, `game-dialog.css`                                          | Menu de pause ; résultat (score qui défile, étoiles qui sonnent, partage du défi du jour) ; styles communs aux deux                                                                                                               |
| `EndOfGame` (`src/app`)                                                                 | Règles de fin de partie : aide après trois défaites, continuer une fois, éclats doublés une fois, une minute entre deux indices, une seule offre de publicité par pause, célébration du portail                                   |
| `PlayMode` (`daily`, `ranked`, `swapLabel`, `hintable`, `par`, `finale`, `celebrates`…) | Ce que l'écran demande à son mode, au lieu de tester le type de partie                                                                                                                                                            |
| `Game.aimLine`, `Game.preview(power, line)`                                             | Ligne de visée tracée une fois par image, reprise par l'aperçu des groupes                                                                                                                                                        |
| `Game.loadTone`                                                                         | L'indice d'énigme charge sa couleur sans compter d'échange                                                                                                                                                                        |

## 6. Qualité et tests

- Tests unitaires du moteur (géométrie du chemin, insertion, correspondances, recul,
  combos, graine) et des modes.
- Tests de bout en bout Playwright : les parcours en 390 × 844 et 1280 × 800, et une matrice
  (v1.7.6) dont chaque projet est une taille : 320 × 568, 360 × 800, 393 × 659 (iPhone, barres
  de Safari visibles), 844 × 390 (téléphone couché), 768 × 1024 (tablette), 1920 × 1080,
  2560 × 1440, et le zoom du navigateur à 200 % et 400 % (1280 × 800 vu en 640 × 400 et
  320 × 200 pixels CSS). Sur chacune, chaque écran (menus, réglages, partie, pause, résultat)
  garde la page immobile, ne défile pas de côté et passe l'audit axe WCAG 2.0, 2.1 et 2.2 A et
  AA, taille des cibles comprise, la bulle de l'Observatoire avec la carte. Un balayage
  vérifie aussi chaque écran de 320 à 2560 px de large, en fenêtre haute et basse.
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
- Trois langues complètes (quatre depuis la v1.7.5, avec le russe) ; thèmes clair et
  sombre conformes.
- Effets de destruction aux trois niveaux d'intensité, respect de `prefers-reduced-motion`.

## 9. Lots et planning (provisoire)

| Lot   | Contenu                                                                                                                        |
| ----- | ------------------------------------------------------------------------------------------------------------------------------ |
| 0 ✅  | Dépôt, outillage, cahier des charges, accueil provisoire (i18n, thèmes)                                                        |
| 1 ✅  | Moteur : chemin, chaîne, tir, insertion, correspondances, recul, combos, graine                                                |
| 2 ✅  | Interface jouable : écran de jeu, rendu, commandes, HUD, pause, fin, niveau démo                                               |
| 3 ✅  | Destruction et son : bris, ondes de choc, ralentis, synthèse audio, intensités                                                 |
| 4 ✅  | Campagne : mondes, niveaux en données, étoiles, sauvegarde ; monde 1 Nébuleuse                                                 |
| 5 ✅  | Progression : éclats, objectifs, cosmétiques, thèmes débloquables ; Défi du jour ; assistance                                  |
| 6 ✅  | Monde 2 Néon : miroirs, prismes, ricochet, Colosse prisme                                                                      |
| 7 ✅  | Monde 3 Abysses : aimant, charges, Colosse abyssal                                                                             |
| 8 ✅  | Monde 4 Joaillerie : alchimie des couleurs, Colosse de cristal                                                                 |
| 9 ✅  | Monde 5 Volcan : aiguillages, raccourcis en fusion, Colosse de lave                                                            |
| 10 ✅ | Monde 6 Singularité : gravité, orbite, Colosse ultime ; modes Arcade Infini, Énigmes, Rythme, Duel                             |
| 11 ✅ | Expérience (§ 3.9) : 11.1 tir et plateau, 11.2 difficulté et aléas, 11.3 fragments et améliorations, 11.4 design et animations |
| 12 ✅ | Accessibilité, SEO, tests e2e, Lighthouse, documentation, 1.0.0 (notre site)                                                   |
| 13 ✅ | Portails : `PlatformAdapter` par portail, publicités, builds dédiés                                                            |
| 14 ✅ | Démo portfolio                                                                                                                 |

## 10. Hors périmètre (v1)

Comptes, classements en ligne, multijoueur en réseau, achats intégrés.

## 11. Évolutions envisagées

Éditeur de chemins, classements en ligne du défi du jour, application installable (PWA).

## 12. Journal des versions du document

| Version | Date       | Changements                                                                                                                                                                                                                                                        |
| ------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 0.1     | 12/10/2026 | Création : objectifs, positionnement, règles, 12 modes proposés.                                                                                                                                                                                                   |
| 0.2     | 12/10/2026 | Campagne (6 mondes, 72 niveaux), thèmes à débloquer, éclats et cosmétiques, monétisation par portails (`PlatformAdapter`), lots revus.                                                                                                                             |
| 0.3     | 12/10/2026 | Lot 0 livré : pile et versions, socle (réglages, thèmes, stockage), CSP, Lighthouse 100 × 4 mobile et ordinateur.                                                                                                                                                  |
| 0.4     | 12/10/2026 | Lot 1 livré : moteur (§ 5.3), règles de score et de génération précisées (§ 3.1).                                                                                                                                                                                  |
| 0.5     | 12/10/2026 | Lot 2 livré : couche de jeu (§ 5.4), commandes précisées (§ 3.3), niveaux en données.                                                                                                                                                                              |
| 0.6     | 12/10/2026 | Lot 3 livré : destruction détaillée (§ 3.5), réglages (§ 3.4), effets et son (§ 5.5).                                                                                                                                                                              |
| 0.7     | 12/10/2026 | Lot 4 livré : monde 1 (§ 3.2), Colosse, bonus de fin (§ 3.1), sauvegarde (§ 3.4), équilibrage par robot, architecture (§ 5.6).                                                                                                                                     |
| 0.8     | 12/10/2026 | Lot 5 livré : éclats, atelier, objectifs, défi du jour partageable, aide après 3 défaites (§ 3.2, 3.6), langues chargées à la demande (§ 4.4), architecture (§ 5.7).                                                                                               |
| 0.9     | 12/10/2026 | Lot 6 livré : monde 2 Néon (§ 3.2), règle du ricochet (§ 3.1), 14ᵉ objectif (§ 3.6), architecture des miroirs (§ 5.8).                                                                                                                                             |
| 0.10    | 12/10/2026 | Lot 7 livré : monde 3 Abysses et aimant (§ 3.2), commande (§ 3.3), plateau et objectifs (§ 3.6), architecture (§ 5.9).                                                                                                                                             |
| 0.11    | 12/10/2026 | Lot 8 livré : monde 4 Joaillerie et alchimie (§ 3.2), plateau et objectifs (§ 3.6), architecture (§ 5.10).                                                                                                                                                         |
| 0.12    | 12/10/2026 | Lot 9 livré : monde 5 Volcan et aiguillages (§ 3.2), commande (§ 3.3), plateau et objectifs (§ 3.6), architecture (§ 5.11).                                                                                                                                        |
| 0.13    | 12/10/2026 | Lot 10, première partie : monde 6 Singularité, gravité et orbite (§ 3.2), plateau et objectifs (§ 3.6), architecture (§ 5.12).                                                                                                                                     |
| 0.14    | 12/10/2026 | Lot 10 livré : modes Arcade Infini, Énigmes, Rythme et Duel (§ 3.2), commande (§ 3.3), sauvegarde (§ 3.4), objectifs (§ 3.6), architecture (§ 5.13).                                                                                                               |
| 0.15    | 13/10/2026 | Retours de test : lot 11 « Expérience » (§ 3.9) ; lots suivants renumérotés (§ 9).                                                                                                                                                                                 |
| 1.0     | 13/10/2026 | Lot 12 livré, version 1.0.0 : accessibilité (§ 4.3), référencement (§ 4.3 bis), lots 11 et 12 terminés (§ 9).                                                                                                                                                      |
| 1.1     | 13/10/2026 | Lot 13 livré, version 1.1.0 : builds portails, publicités et récompenses (§ 3.7), architecture des plateformes (§ 5.14).                                                                                                                                           |
| 1.2     | 13/10/2026 | Exigences de CrazyGames appliquées et kit de soumission (§ 3.7).                                                                                                                                                                                                   |
| 1.3     | 14/10/2026 | Refonte visuelle et sonore, version 1.2.0 (§ 3.5).                                                                                                                                                                                                                 |
| 1.4     | 14/10/2026 | Bombe offerte et geste d'apprentissage au niveau 1-1, version 1.3.0 (§ 3.5).                                                                                                                                                                                       |
| 1.5     | 22/10/2026 | Version 1.7.5 : textes revus et russe (§ 1, 2.1, 2.3, 3.7, 4.3, 4.4, 8).                                                                                                                                                                                           |
| 1.6     | 23/10/2026 | Version 1.7.6 : socle solide (premier affichage, portails, toucher, CSS moderne, matrice de tests, écran de jeu) (§ 3.5, 4.1, 4.2, 4.6, 5.1, 5.15, 6).                                                                                                             |
| 1.7     | 23/10/2026 | Version 1.8.0, étape 2 : l'entraînement construit, sa main, ses fins, son écran de fin et ses simulations (§ 3.13).                                                                                                                                                |
| 1.8     | 23/10/2026 | Version 1.8.0, étape 3 : la boucle des moments forts de l'écran titre, son worker, sa place et ses tests (§ 3.5, 3.14).                                                                                                                                            |
| 1.9     | 26/10/2026 | Version 1.8.0, étape 5 : les mesures de tension du robot, les tables de départ du monde 1 et son tableau, validé (§ 3.15).                                                                                                                                         |
| 1.10    | 26/10/2026 | Version 1.8.0, étape 7 : le premier lanceur s'équipe d'un toucher sur le panneau de victoire, son geste et ses mesures d'économie (§ 4.2).                                                                                                                         |
| 1.11    | 26/10/2026 | Version 1.8.0, étape 8 : l'Atelier en onglets et sa cabine d'essayage sur le vrai moteur, l'Observatoire en onglets par portée, le porte-monnaie partout (§ 3.16).                                                                                                 |
| 1.12    | 26/10/2026 | Version 1.8.0, étape 6, première partie : les signaux de danger plus tôt et la zone de grâce, mesurés sur le monde 1 (§ 3.15).                                                                                                                                     |
| 1.13    | 26/10/2026 | Version 1.8.0, corrections : le cadeau du jour se range (étincelles, repli, glissement de la boucle), la carte tient dans une fenêtre de navigateur (§ 3.9, 3.12, 4.2).                                                                                            |
| 1.14    | 26/10/2026 | Version 1.8.0, étape 6, seconde partie : le monde 1 réglé sur son tableau, mesuré sur 72 parties par niveau, ses étoiles recalibrées, l'écart entre les plateaux relevé (§ 3.15).                                                                                  |
| 1.15    | 27/10/2026 | Version 1.8.0 livrée, sans test de couloir faute de testeurs ; l'équilibre entre le téléphone et l'ordinateur passe à la 1.8.1.                                                                                                                                    |
| 1.16    | 27/10/2026 | Version 1.8.1, étape 1 : l'équilibre entre le téléphone et l'ordinateur, ce que la 1.8.1 retient des études publiées, ses joueurs-robots, la visée au toucher, la porte de dépôt CrazyGames et les tables de départ des 72 niveaux sur les deux plateaux (§ 3.17). |
| 1.17    | 27/10/2026 | Version 1.8.1, étape 2 : les joueurs-robots par appareil, trois nouveaux venus sur chacun, et le monde 1 remesuré sur les deux plateaux (§ 3.17).                                                                                                                  |
| 1.18    | 27/10/2026 | Version 1.8.1, étape 3 : les serpentins et les jumeaux tiennent le même tracé sur le téléphone et l'ordinateur, les tirs cachés, le plateau de chaque appareil (§ 3.17).                                                                                           |
| 1.19    | 28/10/2026 | Version 1.8.1, étape 4 : au toucher, la visée d'avant le lever du doigt, la charge qui tient sous le doigt, le Ralenti qui garde les couleurs (§ 3.17).                                                                                                            |
| 1.20    | 28/10/2026 | Version 1.8.1, étape 6 : l'écran de la défaite, ce qui manquait en vrai, une astuce et « Rejouer » d'abord (§ 3.17).                                                                                                                                               |
| 1.21    | 28/10/2026 | Version 1.8.1, étape 9 : le plateau de chaque écran relevé dans le jeu, les tableaux des six mondes validés, la règle du lent au doigt (§ 3.17).                                                                                                                   |
