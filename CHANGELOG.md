# Journal des modifications

Format inspiré de [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/), versions selon
[SemVer](https://semver.org/lang/fr/).

## [1.7.2] — 2026-10-22

### Ajouté

- **Jauge d'étoiles** sous le score, en campagne et au défi du jour : une barre se remplit
  vers les points de la 2ᵉ et de la 3ᵉ étoile (la 1ʳᵉ est la victoire), et chaque étoile
  s'allume avec son carillon quand le score l'atteint ; les lecteurs d'écran l'entendent
  (« 2 étoiles à portée »). Sur un écran droit, la bande du haut lui garde une ligne : elle
  ne couvre ni la piste, ni la barre du Colosse, ni les recettes, et la série se place à
  côté d'elle.
- **La suite** sur le panneau de victoire : le bouton principal dit le niveau suivant et ce
  qu'il apporte pour la première fois (« Suivant : niveau 1-3 · Nouvelle bille : Recul »,
  un Colosse, un nouveau monde ou une mécanique), et les gains montrent la barre vers le
  prochain lanceur de l'Atelier, avec son aperçu (« Couronne · 115 / 150 éclats »).

### Modifié

- Build CrazyGames **Basic Launch** sans publicité : ni bouton, ni requête, ni détection
  du bloqueur (`CRAZYGAMES_LAUNCH=full` construit la version complète). Continuer après
  une défaite ou obtenir un indice reste possible en éclats ; un prix qu'on ne peut pas
  encore payer s'affiche grisé, avec le solde (« 60 éclats · vous en avez 0 »).
- **Première visite ménagée** : un nouveau joueur ne voit aucune publicité entre deux
  parties avant 8 minutes de visite, ni juste après une défaite. Un joueur qui revient
  garde la règle des 3 minutes.
- Panneau de victoire réordonné : objectifs atteints, puis éclats gagnés et prochain
  lanceur ; bonus de fin et record sur une ligne ; « Rejouer » et « Carte » côte à côte
  sous « Suivant ». Le panneau le plus chargé tient sans défilement de 360 × 640 à
  1280 × 720, dans les trois langues.
- Un bouton désactivé se lit comme tel (désaturé, sans relief).

### Corrigé

- Au clavier, Entrée sur le panneau de fin choisissait « Rejouer » au lieu du premier
  choix (« Suivant », « Réessayer avec de l'aide ») : le panneau s'ouvrait avant que ce
  bouton existe.
- Sur un écran large, la série sortait de l'écran sous le score ; sur un écran droit, elle
  couvrait la barre du Colosse.
- CrazyGames : si le module de sauvegarde n'est pas activé, la console le dit une fois,
  sans sauvegarde parallèle. La Nova ne joue plus d'harmoniques au-delà de ce que le son
  peut rendre (avertissements Web Audio dans la console).

## [1.7.1] — 2026-10-21

### Modifié

- Les quatre autres lanceurs de l'Atelier sont redessinés à la finition du Cœur d'étoile.
  L'**Orbite** devient une planète d'acier à anneaux et à lunes ; la **Couronne** porte sept
  pointes d'or à facettes autour d'un cœur de rubis ; le **Halo** pose un cœur de perle sur
  un disque de nuit cerclé de lumière, lisible aussi sur un plateau clair ; dans l'**Œil**
  d'obsidienne cerclé d'or, l'iris tourbillonne dans la couleur chargée. Les berceaux, les
  alvéoles et la place des billes ne changent pas : le jeu reste le même.
- L'Atelier montre chaque lanceur comme en jeu : son halo, la bille prête à partir dans le
  berceau et la bille suivante dans l'alvéole.

## [1.7.0] — 2026-10-21

### Ajouté

- Billes bonus dans la chaîne : détruites dans un groupe, elles déclenchent un pouvoir et
  rapportent 100 points. **Recul** (la chaîne recule de 8 billes), **Ralenti** (mi-vitesse
  pendant 8 s), **Tir arc-en-ciel** (la bille suivante va avec toutes les couleurs),
  **Laser** (le tir suivant traverse les 4 premières billes touchées). Une nouveauté par
  niveau dans le monde 1 (1-3, 1-6, 1-8, 1-10), puis mêlées aux mondes suivants et à
  l'Infini.
- Cadeau du jour sur l'écran titre : une série de 7 jours en éclats (15, 20, 25, 30, 40,
  50 puis 120, soit 300 par semaine), un cadeau par jour ; un jour manqué et la série
  recommence au jour 1. La carte se replie en pastille une fois le cadeau pris.

### Modifié

- Niveau 1-1, la vitrine : sa chaîne est disposée à la main pour que la première minute
  montre le meilleur du jeu. La Nova au premier tir, puis une cascade à trois étages (le
  lanceur sert la couleur qu'il faut), une bille Laser juste derrière dont le tir
  transperce la chaîne, une seconde cascade, et la supernova vers une minute de jeu. Les
  pouvoirs restent enseignés à 1-3, 1-6, 1-8 et 1-10.
- Sur un portail, un joueur qui n'a jamais joué arrive directement dans le niveau 1-1,
  avec son geste d'apprentissage, sans passer par l'écran titre : la première image est
  le jeu. Un joueur qui revient retrouve l'écran titre.
- Nouveau fond du monde 1 : une nébuleuse en couches (nuages et voiles de gaz, galaxie
  lointaine, planète géante et lune à anneaux dans les coins, étoiles proches qui dérivent,
  vignette), peinte une fois par taille d'écran. Le plateau reste un ciel de nuit en thème
  clair aussi ; l'affichage autour garde ses pastilles claires.
- Nouveau lanceur par défaut, le Cœur d'étoile : anneau d'astrolabe, pétales de cristal
  aux pointes de la couleur chargée, berceau d'or derrière la bille prête à partir. Il
  remplace l'Orbite (toujours offerte à l'Atelier), y compris pour les joueurs qui la
  portaient par défaut, et tire les billes de la scène de titre sur un écran large.
- Builds des portails : page en anglais (langue, titre et description ; « Ball Mania »
  sur Playgama), le jeu suivant ensuite la langue du joueur. Sur CrazyGames, le SDK est
  chargé dans le `<head>` de la page, avant le jeu, comme le demande leur documentation.
- Kits des portails : couvertures où le Cœur d'étoile vient de tirer la bille (CrazyGames
  et Playgama) ; bandes-annonces refaites avec la nébuleuse et les billes bonus du niveau
  1-10, jusqu'à une victoire et sa supernova ; descriptions avec les billes bonus et le
  cadeau du jour.
- Image de partage du site et du README : la couverture du jeu (spirale, trou noir, Cœur
  d'étoile) à la place de l'image provisoire de la v1.0.

### Corrigé

- Sur un portail, un onglet caché met toujours la partie en pause, mais n'est plus
  signalé comme une pause du joueur : CrazyGames ne reçoit plus de `gameplayStop` à la
  perte du focus (sa documentation l'interdit, son outil de QA le relève).
- Carte de campagne sur un écran large et bas (cadres de portail 907 × 510 et 821 × 462,
  téléphone couché, 1280 × 720) : le menu passe en colonne à gauche, et les douze niveaux
  se voient sans faire défiler la page. Ailleurs, les menus défilent avec une barre fine aux
  couleurs du jeu au lieu de la barre grise du navigateur.
- Écran titre sur téléphone : il ne défile plus quand les étoiles et les éclats s'affichent
  (les boutons ronds restent sur une ligne, le trou noir prend la place qui reste).
- La ruée du début de niveau ne repart plus quand la chaîne est ramenée en arrière (un
  recul, une relance après une défaite) : elle annulait le répit.
- La touche Échap n'est plus utilisée par le jeu : sur CrazyGames, elle sert à quitter le
  plein écran. Elle mettait le jeu en pause et, sur l'écran de fin, ramenait au menu ; la
  pause se fait désormais avec P ou le bouton, et aucune fenêtre ne se ferme sur Échap.

## [1.6.0] — 2026-10-20

### Modifié

- Victoire futuriste, à la place du plateau qui tournait en spirale dans le trou : une
  lumière blanche court le long de chaque tracé jusqu'au trou et laisse la rainure
  allumée ; le trou la rassemble puis éclate en supernova (cœur blanc, anneaux néon, onde
  qui courbe l'image, poussière d'étoiles), sur un son montant puis un accord de verre. Le
  résultat arrive plus vite (1,7 s au lieu de 2 s) sur un panneau de verre dépoli au
  contour de lumière tournant : titre balayé de lumière, score qui monte, étoiles qui se
  matérialisent avec un anneau et un carillon. Avec le mouvement réduit, une simple lueur.
- Écran immobile sur téléphone : plus de rebond ni de « tirer pour rafraîchir », rien ne
  défile vers la page du portail ; pendant une partie, la page ne défile ni ne zoome plus
  du tout. Les fenêtres de dialogue gardent leur propre défilement.
- Le conseil du début de niveau s'efface dès la fin de la partie.

## [1.5.0] — 2026-10-20

### Modifié

- Écran de jeu en plein écran, comme une application : le niveau occupe tout l'écran, le
  HUD (pause, niveau, score, son) et les boutons flottent sur ses bords, dans des bandes de
  taille fixe. Sur un écran large (téléphone couché, ordinateur), ils passent en rails sur
  les côtés pour laisser toute la hauteur au niveau.
- Le niveau ne change plus jamais de taille pendant la partie : la barre du haut ne passe
  plus sur deux lignes quand une série ou un badge apparaît, et une barre de navigateur qui
  se replie ne le réajuste plus (il garde sa taille et sa place tant qu'il tient à
  l'écran) ; seule une rotation le réajuste.
- Le niveau est ajusté à ce qui doit être vu (tracés, lanceur, miroirs, entrées), plus au
  plateau entier : sur le cadre de Playgama au téléphone (375 × 768), il prend 95 % de la
  largeur, et ses billes sont en moyenne 11 % plus grosses (jusqu'à 80 %, jamais plus
  petites) ; 22 % sur un téléphone couché, 28 % sur ordinateur.
- Deux nouveaux plateaux, haut (1000 × 1700) et large (1700 × 1000) ; chaque niveau prend
  celui qui le montre le plus grand sur l'écran. Les entrées de chaîne ne passent plus sous
  le HUD.

### Tests

- Géométrie des 72 niveaux et résolution des 30 énigmes par le moteur vérifiées sur les
  cinq plateaux ; règles d'ajustement et de stabilité du plateau testées.

## [1.4.2] — 2026-10-15

### Corrigé

- Playgama avec un bloqueur de publicité : le jeu pouvait rester figé jusqu'à 90 secondes
  après un niveau, puis ne plus jamais montrer de publicité. Sur les pages de Playgama, une
  publicité refusée par le SDK publicitaire du portail (« Playgama Ads SDK is not
  initialized ») laisse Bridge en chargement sans jamais signaler l'échec. Le jeu demande
  désormais à Bridge si les publicités sont bloquées (`checkAdBlock`) : si oui, il n'en
  propose aucune, affiche les alternatives en éclats et le message « bonus vidéo
  indisponibles ». Une publicité qui ne s'ouvre pas en 12 secondes est abandonnée, et
  aucune autre n'est demandée tant que Bridge en a une en cours.

## [1.4.1] — 2026-10-15

### Corrigé

- Playgama : le jeu se met en pause et se tait aussi pendant les publicités que le portail
  lance de lui-même (« smart ads ») et quand une publicité est déjà ouverte au chargement.
- Une interstitielle peut passer après une défaite quand seule la reprise contre des éclats
  était proposée (aucune publicité n'avait été offerte pendant cette pause).

## [1.4.0] — 2026-10-14

### Ajouté

- Portail Playgama (`npm run build:playgama`) : Bridge SDK v2 dans le `<head>` et sa
  configuration, sauvegardes et réglages par `bridge.storage` (un seul chargement au
  départ), langue du portail, son et pause du portail suivis, messages de niveau,
  interstitielles et publicités récompensées par Bridge ; titre « Ball Mania » en deux
  mots, comme sur la fiche du portail. Kit de soumission dans `marketing/playgama/`.
- Bouton de coupure du son sur l'écran titre et en jeu (réglage « muted »).

### Modifié

- Écran titre sans défilement sur les petits téléphones en portrait (360×640).
- Couvertures : titre ajusté à la largeur, format 9:16.

## [1.3.0] — 2026-10-14

### Ajouté

- Niveau 1-1 : le tout premier tir est une bombe Nova offerte (une amélioration gagnée
  bien plus tard d'habitude) ; une grosse explosion et « Nova ! » dès les premières
  secondes.
- Tutoriel en geste : une main part du lanceur, trace la visée jusqu'à la chaîne et
  relâche, jusqu'au premier tir du joueur ; image fixe en mouvement réduit.

## [1.2.1] — 2026-10-14

### Modifié

- Portails, d'après la référence complète de CrazyGames : bouton vidéo de même allure
  que les autres choix ; continuer (60 éclats) et indice (20 éclats) aussi en éclats ;
  une reprise par publicité au plus par visite ; une minute entre deux indices ; boutons
  vidéo retirés quand les publicités sont coupées (Basic Launch) ou bloquées.
- Écran titre et plateau adaptés aux écrans paysage bas (cadres de portail 821×462,
  téléphones à l'horizontale) ; zones de sécurité de l'appli CrazyGames ; le son reprend
  à chaque geste après une interruption sur iOS.

## [1.2.0] — 2026-10-14

Refonte visuelle et sonore après le refus de CrazyGames (« qualité générale ») : le jeu prend
l'allure de ses couvertures.

### Ajouté

- Écran titre de jeu : logo en lettres d'or, scène animée (spirale de billes vers un trou
  noir, tir et éclatement réguliers), grand bouton Jouer vers le prochain niveau, tuiles
  Arcade, Défi, Atelier et Observatoire, boutons musique, objectifs et réglages.
- Musique synthétisée : un thème pour les menus et un par monde, qui se resserre quand la
  chaîne approche du trou ; réglage « Musique » à part des effets sonores.
- Table de mixage (réverbération, compresseur) et explosions plus riches.
- Mot d'encouragement pour les grandes réactions en chaîne, en trois langues.
- Plateau lumineux : tracé en relief et filet de lumière vers le trou, trou en petit trou
  noir qui tourne et rougit au danger, portail d'entrée, halo de la couleur chargée.
- Lot 14, démo du portfolio : `npm run build:demo` construit dans `dist-demo/` une édition
  qui joue les deux premiers mondes (24 niveaux, deux Colosses) et les modes Infini et
  Énigmes ; les autres mondes et modes restent visibles, fermés « Dans le jeu complet ».
  Sans publicité ni SDK, CSP stricte, hébergeable dans n'importe quel sous-dossier.
- Kit de soumission CrazyGames (`marketing/crazygames/`) : description et commandes en
  anglais, trois couvertures (16:9, 2:3, 1:1) dessinées avec les billes du
  jeu, deux vidéos de 20 s au plus (paysage 1080p, portrait 2:3) tournées image par image
  par le moteur, réponses du formulaire. `npm run kit:crazygames` les régénère.
- Icône vidéo sur chaque bouton de publicité récompensée ; message dans la page quand un
  bloqueur de publicité rend les bonus vidéo indisponibles.

### Modifié

- Thème sombre « cosmos » par défaut, polices du jeu (Lilita One, Fredoka) servies avec
  lui, boutons dorés et tuiles de verre ; la langue et le thème passent dans les réglages.
- Points et multiplicateurs dans la police du jeu, qui jaillissent ; rendu allégé pour les
  appareils modestes.
- Portails : pas d'intro du studio, et « Jouer » mène un nouveau joueur directement au
  niveau 1-1 (un clic pour jouer).
- Portails : jamais de publicité en revenant à un menu, ni au « Rejouer » d'un écran qui
  proposait déjà « Continuer » ; l'indice d'énigme passe dans le menu pause (aucun bouton de
  publicité sur l'écran de jeu actif) ; pas de sélection de texte sur appui long.
- Les raccourcis lettres suivent la disposition du clavier : M, X, C, S et P marchent en
  AZERTY comme en QWERTY.

## [1.1.0] — 2026-10-13

Lot 13 : le jeu se publie sur les portails de jeux, avec des publicités respectueuses ;
notre site reste sans publicité.

### Ajouté

- Builds par portail : `npm run build:crazygames`, `build:poki`, `build:gamedistribution`
  (`build:portals` pour les trois), chacun dans `dist-<portail>/` avec le seul SDK de son
  portail, chargé depuis son CDN. Le build de notre site ne contient aucun code de portail.
- Adaptateurs CrazyGames (SDK v3 : publicités, sauvegarde dans le module de données,
  langue, liens d'invitation, silence demandé par le portail), Poki (SDK v2) et
  GameDistribution, derrière une interface `PlatformAdapter`.
- Publicités récompensées, toujours au choix : continuer après une défaite (campagne et
  Infini, une fois par partie, la chaîne recule), doubler les éclats d'une partie, indice
  dans une énigme (bille à viser entourée), essayer un cosmétique de l'atelier pour une
  partie.
- Publicité entre deux parties au plus une fois toutes les 3 minutes, jamais pendant le
  jeu ; temps et son arrêtés pendant une publicité.
- Signaux de jeu aux portails : chargement terminé, début et fin de jeu, moments de joie
  rares.
- Portail simulé pour le développement (`npm run dev:portal`) et 5 parcours de bout en
  bout du build portail ; tests unitaires des adaptateurs avec de faux SDK.
- Le défi du jour partagé depuis un portail porte le lien du portail, ou aucun lien là où
  ils sont interdits.

- Navigation en cartes à faire glisser (Swiper) pour les mondes de la campagne et les modes
  Arcade : cartes voisines qui dépassent derrière la carte active, inclinées, billes et
  emblèmes qui chevauchent le bord des cartes, pastilles nommées, flèches, clavier.
- Intro du studio AdamRodWebTech (hexagone doré qui se trace, nom écrit lettre à lettre),
  une fois par visite, à passer d'une touche ou d'un toucher, figée avec le mouvement
  réduit.

## [1.0.0] — 2026-10-13

Première version complète : six mondes (72 niveaux), quatre modes Arcade, défi du jour,
observatoire, trois langues, thèmes clair et sombre.

### Ajouté

- Cahier des charges v0.1 : objectifs, positionnement, règles communes, 12 modes proposés.
- Cahier des charges v0.2 : campagne de 6 mondes (72 niveaux) à thèmes débloquables, éclats
  et cosmétiques, monétisation par portails de jeux (`PlatformAdapter`), lots revus.
- Configuration de base du dépôt (éditeur, fins de ligne, Prettier, version de Node).
- Lot 0, outillage : Vite, Vue 3.5, TypeScript strict, vue-i18n précompilé, ESLint,
  Prettier, Vitest, Playwright (mobile 390 × 844 et ordinateur 1280 × 800), audit Lighthouse.
- Accueil provisoire en français, anglais et indonésien, thèmes clair, sombre et système,
  appliqués avant le premier affichage.
- Politique de sécurité du contenu stricte sur la page construite.
- Lot 1, moteur de jeu indépendant de l'interface : tracé à abscisse curviligne, chaînes
  (poussée du segment arrière, rappel des segments de même couleur, réactions en chaîne),
  tir et insertion, score avec profondeur de réaction et série, partie à pas fixe
  reproductible par graine, événements de domaine. 42 tests dont des invariants sur des
  parties aléatoires.
- Lot 2, jeu jouable : écran de jeu chargé à la demande, rendu Canvas 2D (billes de verre
  à symbole gravé, tracé, trou qui rougit à l'approche de la chaîne, lanceur, ligne de
  visée), commandes souris, tactile (viser en glissant, tirer en relâchant, toucher le
  lanceur pour échanger) et clavier, score et série, pause (aussi automatique en arrière-
  plan), écran de fin, niveau de démonstration en données, annonces pour lecteurs d'écran.
- Lot 3, destruction et son : billes qui se fissurent, arcs électriques, éclats de verre,
  traînées de lumière, halos, ondes de choc qui courbent l'image (WebGL2), tremblement,
  ralenti et éclair sur les réactions en chaîne, finale de victoire, secousse de défaite ;
  sons synthétisés (tir, explosion de verre, cloche dont la note monte avec la réaction,
  battement de cœur près du trou, victoire, défaite) ; vibrations ; trois intensités,
  respect de « réduire les animations », baisse automatique si l'affichage ralentit ;
  fenêtre de réglages (langue, thème, effets, volume, vibrations).
- Lot 4, campagne : carte des six mondes, monde 1 « Nébuleuse » en 12 niveaux de difficulté
  croissante (spirales, serpentins, double spirale), conseils d'introduction, plateau
  portrait pour les téléphones, fond étoilé ; Colosse stellaire (boss qui pousse la chaîne,
  barre de vie, phases, renforts, cascade finale) ; étoiles, records et déblocages
  sauvegardés ; bonus de fin de niveau ; équilibrage vérifié par un robot joueur.
- Lot 5, progression : éclats gagnés en jouant ; atelier de cosmétiques (4 lanceurs,
  4 traînées de tir, 4 signatures de bris, plateaux dont « Néon » débloqué en finissant la
  Nébuleuse) avec aperçus ; 13 objectifs ; défi du jour identique pour tous, premier essai
  compté, résultat partageable ; aide proposée après 3 défaites d'affilée ; accueil
  remanié (solde, défi, atelier, objectifs) ; langues chargées à la demande.
- Lot 6, monde 2 « Néon » : murs et prismes (fixes ou tournants) qui renvoient les tirs,
  points multipliés par 1 + rebonds, ligne de visée qui suit les rebonds, 12 niveaux dont
  le Colosse prisme, objectif « tir en bande », sons et étincelles de rebond.
- Lot 7, monde 3 « Abysses » : aimant qui aspire la bille visée et la charge dans le
  lanceur (bouton, touche M), charges rechargées par les explosions, ligne de visée en
  crochet, animation de succion, 12 niveaux dont le Colosse abyssal, plateau « Abysses »
  débloqué en finissant Néon, objectifs « pêcheur des profondeurs » et « lumière noire ».
- Lot 8, monde 4 « Joaillerie » : les couleurs se mélangent comme la lumière (rubis +
  lime = ambre, lime + violet = cyan, rubis + violet = rose) ; une primaire tirée sur une
  autre fusionne avec elle ; légende des mélanges et aperçu de la couleur obtenue au bout
  de la ligne de visée ; mélanges générés par paires ; 12 niveaux dont le Colosse de
  cristal ; plateau « Joaillerie » ; objectifs « alchimiste » et « remonter à la surface ».
- Lot 9, monde 5 « Volcan » : aiguillages à basculer (levier ou touche S) tant que la
  chaîne ne les a pas atteints, entre un raccourci en fusion (billes ×2) et un détour qui
  donne du temps ; 12 niveaux mêlant aimant et miroirs, dont le Colosse de lave ; plateau
  « Volcan » ; objectifs « aiguilleur » et « cœur de diamant ».
- Lot 10, monde 6 « Singularité » : trou noir central qui courbe les tirs (ligne de visée
  courbe fidèle au vol) et avale ceux qui passent trop près, lanceur en orbite autour de
  lui, chaînes qui sortent d'un portail ; implosion des débris ; 12 niveaux reprenant les
  mécaniques précédentes, dont le Colosse ultime ; plateau « Singularité » ; objectifs
  « fronde gravitationnelle », « cœur de magma » et « au-delà de l'horizon » ; message de
  campagne terminée.
- Lot 10, modes Arcade, ouverts monde après monde : **Infini** (chaîne sans fin à paliers,
  record), **Énigmes** (chaîne immobile, tirs comptés, couleur au choix ; 30 énigmes
  calculées par un solveur et une énigme du jour), **Rythme** (trois morceaux synthétisés,
  chaîne qui bondit sur le temps, groove jusqu'à ×4) et **Duel** (tir à la corde contre un
  rival en trois niveaux) ; écran Arcade, records sauvegardés, quatre objectifs ; l'écran
  de jeu passe par des modes de jeu (stratégies) au lieu de tester le type de partie.
- Lot 11.1, module de tir : tir au relâchement, tir chargé (maintenir 0,35 s : deux fois
  plus rapide, insensible à la gravité), jauge de charge, recul du lanceur, éclair de
  bouche, vibrations ; aide à la visée activable (bille fantôme à l'arrivée du tir, groupe
  qui explosera et sa taille) ; plateau paysage 1 400 × 1 000 sur les écrans larges, écran
  de jeu en pleine largeur.
- Lot 11.2, difficulté et aléas : trois difficultés de campagne (Explorateur, Pilote,
  Légende) qui règlent la vitesse, les aléas et les points ; billes qui tombent du ciel,
  arythmie, météo (tempête solaire, froid mordant, vents contraires et rafales massives) ;
  tracés à deux entrées ; rendu et sons de chaque aléa ; robot d'équilibrage qui lit sa
  ligne de visée.
- Lot 11.3, Observatoire : fragments d'étoiles à toucher en jeu, dix améliorations à trois
  rangs (Œil stellaire, Chronos, Onde de choc, Bille prismatique, Bouclier thermique,
  Brise-glace, Ancre, Attrape-étoiles, Nova, Seconde chance), pastille « Amélioration
  disponible » sur l'accueil et la carte, objectif « Astronome ».
- Lot 11.4, design : le trou avale le plateau en spirale à la fin d'un niveau gagné,
  ambiances animées par monde, fond des menus vivant, transitions d'écrans, listes en
  cascade, étoiles qui éclosent au bilan, total d'étoiles sur l'accueil et la carte,
  « +n étoiles » au bilan.
- Lot 12, version 1.0.0 : audits d'accessibilité axe-core (WCAG 2.1 AA) de chaque écran
  dans les deux thèmes, contrastes des badges corrigés, annonce « la chaîne approche du
  trou », parcours entièrement au clavier, absence de défilement horizontal vérifiée de
  320 à 1 920 px ; référencement : cartes Open Graph et Twitter, image de partage, données
  structurées `VideoGame`, manifeste, lien canonique, `sitemap.xml` et `robots.txt` quand
  `SITE_URL` est fourni, message sans JavaScript ; README refait ; intégration continue
  GitHub Actions.
