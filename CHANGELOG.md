# Journal des modifications

Format inspiré de [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/), versions selon
[SemVer](https://semver.org/lang/fr/).

## [Non publié]

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
