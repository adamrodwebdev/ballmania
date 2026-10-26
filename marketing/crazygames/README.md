# Kit de soumission CrazyGames

Tout ce que demande le formulaire de soumission de CrazyGames (Developer Portal, « Submit a
game »), d'après leur documentation consultée le 13/10/2026 : [exigences][intro],
[couvertures et vidéos][covers], [technique][technical], [jeu][gameplay], [publicités][ads],
[qualité][quality].

## Fichiers

Générés par `npm run kit:crazygames` (Google Chrome et une connexion pour la police du titre
sont nécessaires), dans `out/` :

| Fichier                           | Format CrazyGames          | Remarques                                       |
| --------------------------------- | -------------------------- | ----------------------------------------------- |
| `cover-landscape-1920x1080.png`   | Couverture paysage 16:9    | Aussi en `.jpg`                                 |
| `cover-portrait-800x1200.png`     | Couverture portrait 2:3    | Aussi en `.jpg`                                 |
| `cover-square-800x800.png`        | Couverture carrée 1:1      | Aussi en `.jpg`                                 |
| `trailer-landscape-1920x1080.mp4` | Vidéo paysage 1080p        | H.264, 30 i/s, sans son, moins de 20 s, < 50 Mo |
| `trailer-portrait-1080x1620.mp4`  | Vidéo portrait 1080p (2:3) | Idem                                            |

Les vidéos ne sont pas versionnées (`.gitignore`) : on les régénère à l'identique, le jeu
étant déterministe. `npm run kit:crazygames -- covers` ou `-- videos` (suivi au besoin de
`landscape` ou `portrait`) ne refait qu'une partie ; `-- og` refait l'image de partage de
notre site et du README (`public/og.jpg`, 1200 × 630) d'après la couverture paysage.

Ce que respectent les couvertures : pas de bordure, aucun texte hormis le titre, pas
d'icône ni de logo, une illustration plutôt qu'une capture d'écran, une police stylisée
(Lilita One, licence SIL OFL), la même composition aux trois formats, faite de ce que montre
la première partie : sur la grille du monde Néon, une chaîne de billes roule vers le trou noir
posé à l'horizon ; le jeune Colosse stellaire en sort en rugissant et fixe le joueur, comme à
la fin de l'entraînement ; au premier plan, le Cœur d'étoile, lanceur et mascotte du jeu, vient
de tirer, et un groupe éclate. Le Colosse est celui du jeu, dessiné par son peintre et agrandi ;
chaque format place ses éléments à la main, et chacun se lit à 200 px de large, la taille des
vignettes des portails.

Ce que respectent les vidéos : elles s'ouvrent sur la couverture fixe (1 s), puis jouent les
mêmes scènes que la boucle de l'écran titre (v1.8.0, `cuts.ts`) : six de ses moments, la Nova,
le tir en bande, l'aimant, le trou noir, le Duel et la chute du Colosse, la lumière filant sur
le tracé, chacun fondu dans le suivant en 0,3 s, en 16,8 s en tout. Le vrai jeu en plein écran,
rendu image par image par le moteur du jeu à 30 images par seconde, sans accélération : le
plateau large de la boucle pour la vidéo paysage, le plateau haut d'un téléphone pour la vidéo
portrait. Un test vérifie que chaque moment atteint son sommet sur les deux plateaux avant le
fondu suivant, et que la vidéo dure de 15 à 20 s. Le mélange des couleurs et l'aiguillage
restent dans la boucle : le mélange n'atteint pas son sommet sur le plateau haut, et un
aiguillage se lit moins bien qu'une explosion. La main de la boucle joue avec le Cœur d'étoile,
la traîne prisme et l'éclat en étoiles. Pas de son, pas de curseur, pas de bandes noires, pas de
texte promotionnel ni de logo.

## Description (à coller, en anglais)

> **Ballmania** reinvents the classic marble shooter. A chain of glass marbles rolls toward
> the hole: shoot marbles to make groups of three or more of the same colour and watch them
> shatter in spectacular chain reactions.
>
> Burst the power-up marbles hidden in the chain: **Rewind** pushes the chain back,
> **Slow-down** halves its speed, the **Rainbow shot** matches any colour and the **Laser**
> pierces through four marbles.
>
> Travel through six worlds, each with its own twist: bank shots off neon mirrors, pull
> marbles out with a deep-sea magnet, mix colours in the Jewels world, flip lava switches in
> the Volcano and curve your shots around a black hole. Every world ends with a Colossus
> boss.
>
> Catch star fragments to unlock ten upgrades at the Observatory, earn shards to customise
> your launcher, trails and explosions, and brave meteor showers, solar storms, biting cold
> and headwinds. Along the way, unlock four Arcade modes: Endless, Puzzles (with a puzzle of
> the day), Rhythm and Duel against a rival, plus a new daily challenge every day, and come
> back every day for a gift of shards that grows over a seven-day streak.
>
> **Features**
>
> - 6 worlds, 72 levels and 6 bosses
> - 4 power-up marbles: Rewind, Slow-down, Rainbow shot and Laser
> - 3 difficulty levels
> - 4 Arcade modes, a daily challenge and a daily gift
> - Charged shots and an optional aim assist
> - Colour-blind friendly: every colour carries a symbol
> - Plays in English, French, Indonesian and Russian

## Commandes (à coller, en anglais)

> **Mouse / keyboard**
>
> - Aim: move the mouse, or the arrow keys (hold Shift to fine-tune)
> - Shoot: release the left button, or Space
> - Charged shot: hold the button or Space for a moment, then release
> - Swap marbles / next colour: right click, X or C
> - Magnet (Abyss world): M
> - Lava switch (Volcano world): click the lever, or S
> - Pause: P
>
> **Touch**
>
> - Aim: drag your finger; shoot: lift it
> - Charged shot: hold your finger still for a moment
> - Swap marbles: tap the launcher

## Formulaire : réponses à préparer

- **Build** : `npm run build:crazygames` (version Basic Launch, **sans aucune publicité** :
  CrazyGames les coupe pendant le Basic Launch ; la version avec publicités se construit
  avec `CRAZYGAMES_LAUNCH=full npm run build:crazygames`, seulement sur invitation au Full
  Launch), puis envoyer **le dossier** `dist-crazygames/`
  lui-même : le champ d'envoi du Developer Portal choisit un dossier (`webkitdirectory`),
  une archive zip ne finit jamais de s'envoyer. Chemins relatifs (limites : 1 500
  fichiers, 50 Mo au premier chargement, 20 Mo pour la page d'accueil mobile). Un jeu
  refusé ne reçoit pas de nouvelle version : on le soumet de nouveau par « Submit a game »
  (nouveau brouillon), avec le titre affiché dans le jeu (35 caractères au plus). Après
  trois jeux refusés, les soumissions sont suspendues environ deux semaines : ne soumettre
  qu'un jeu abouti.
- **Orientation** : paysage (le jeu s'adapte aussi au portrait sur mobile).
- **Mobile** : oui, tactile complet.
- **Progress Save / Data module** : **à cocher absolument**. Le jeu sauvegarde par le
  module de données du SDK, sans sauvegarde locale à côté (règle CrazyGames) ; sans cette
  option, le module renvoie `dataModuleDisabled`, la progression est perdue à chaque
  rechargement et la console de l'outil de QA l'affiche. Vérifier un rechargement dans
  l'outil de QA avant de soumettre.
- **Langue** : anglais complet ; le jeu suit la langue du joueur (`systemInfo.locale`) :
  français, indonésien ou russe (aussi pour le biélorusse, le kazakh et le kirghize),
  anglais par défaut.
- **Public** : tout public (CrazyGames exige la conformité PEGI 12) : aucune violence,
  aucun achat, aucune donnée personnelle collectée.

## Conformité vérifiée dans le jeu

- SDK v3 dans le `<head>` de la page (avant le jeu) : `loadingStart`, `loadingStop`,
  `gameplayStart` et `gameplayStop` (jamais pendant une pause, un menu, une fin de partie
  ou une publicité), `happytime` rare. Un onglet caché met le jeu en pause sans
  `gameplayStop` : seule la pause demandée par le joueur est signalée, comme le demande la
  documentation (l'outil de QA montre sinon un arrêt à la perte du focus). Page en anglais
  (langue, titre, description).
- Droit au jeu : sur le portail, pas d'intro de studio, et un nouveau joueur arrive
  directement dans le niveau 1-1, avec son geste d'apprentissage ; un joueur qui revient
  retrouve l'écran titre.
- Build Basic Launch (celui qu'on soumet) : aucun bouton vidéo, aucune requête
  publicitaire, pas même la détection du bloqueur ; « Continuer » (60 éclats) et
  l'indice (20 éclats) restent proposés, et un prix qu'on ne peut pas encore payer
  s'affiche grisé avec le solde. Les règles ci-dessous valent pour la version Full Launch.
- Publicités : aucune avant 3 minutes de jeu, jamais pendant le jeu ni sur un bouton de
  navigation (carte, menus) ; une publicité entre deux parties au plus toutes les 3
  minutes ; jamais de publicité au « Rejouer » d'un écran qui proposait déjà « Continuer
  (vidéo) ». Son coupé seulement au début réel de la publicité.
- Récompensées : toujours facultatives, annoncées par une icône vidéo et « Regarder une
  publicité », jamais sur l'écran de jeu actif (l'indice d'énigme est dans le menu
  pause), jamais nécessaires pour finir un niveau, rien n'est donné si la publicité
  échoue, message « réessayez plus tard » sinon. Le bouton vidéo a exactement l'allure
  des autres choix ; chaque aide s'obtient aussi en éclats (continuer : 60, indice : 20) ;
  une reprise par publicité au plus par visite ; une minute entre deux indices.
- Bloqueur de publicité ou Basic Launch (publicités coupées) : le jeu reste entier ; dès
  la première erreur `adblock` ou `adsDisabledBasicLaunch`, les boutons vidéo
  disparaissent et un message dans la page (pas une fenêtre) dit que les bonus vidéo sont
  indisponibles.
- Lisible aux cadres les plus petits (821×462, 800×450) : l'écran titre et le plateau
  s'adaptent aux écrans paysage bas ; zones de sécurité respectées (appli CrazyGames) ;
  le son reprend au premier geste après une interruption iOS.
- Silence demandé par le portail (`muteAudio`) prioritaire sur le volume du jeu.
- Mobile : `user-select: none`, pas de loupe ni de menu sur appui long, zones de sécurité
  respectées.
- Touches : les lettres suivent la disposition du clavier (M est M en AZERTY) ; pas de
  bouton plein écran maison ; P met en pause ; Échap n'est pas utilisé par le jeu (il
  quitte le plein écran du portail).
- Physique identique à toutes les fréquences d'écran (pas fixe de 1/120 s).

## Écarts assumés

- **Éclats doublés** : pas d'équivalent en éclats (doubler ses éclats avec des éclats
  n'aurait pas de sens) ; c'est un multiplicateur de fin de partie, placement que la
  documentation cite comme bon exemple.
- **Publicités bannières** : non utilisées.

[intro]: https://docs.crazygames.com/requirements/intro/
[covers]: https://docs.crazygames.com/requirements/game-covers/
[technical]: https://docs.crazygames.com/requirements/technical/
[gameplay]: https://docs.crazygames.com/requirements/gameplay/
[ads]: https://docs.crazygames.com/requirements/ads/
[quality]: https://docs.crazygames.com/requirements/quality/
