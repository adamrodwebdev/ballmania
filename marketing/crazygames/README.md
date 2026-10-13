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
étant déterministe. `npm run kit:crazygames -- covers` ou `-- videos` ne refait qu'une
partie.

Ce que respectent les couvertures : pas de bordure, aucun texte hormis le titre, pas
d'icône ni de logo, une illustration plutôt qu'une capture d'écran, une police stylisée
(Lilita One, licence SIL OFL), la même composition aux trois formats.

Ce que respectent les vidéos : elles s'ouvrent sur la couverture fixe (1 s), puis montrent
le vrai jeu en plein écran (rendu image par image par le moteur du jeu, sans accélération),
quatre mondes dont une victoire avec le trou qui avale le plateau. Pas de son, pas de
curseur, pas de bandes noires, pas de texte promotionnel ni de logo. Les moments filmés
sont choisis automatiquement : un robot joue avec toutes les améliorations et les
cosmétiques les plus voyants, et l'on garde les secondes où le plus de billes explosent.

## Description (à coller, en anglais)

> **Ballmania** reinvents the classic marble shooter. A chain of glass marbles rolls toward
> the hole: shoot marbles to make groups of three or more of the same colour and watch them
> shatter in spectacular chain reactions.
>
> Travel through six worlds, each with its own twist: bank shots off neon mirrors, pull
> marbles out with a deep-sea magnet, mix colours in the Jewel world, flip lava switches in
> the Volcano and curve your shots around a black hole. Every world ends with a Colossus
> boss.
>
> Catch star fragments to unlock ten upgrades at the Observatory, earn shards to customise
> your shooter, trails and explosions, and brave meteor showers, solar storms, biting cold
> and headwinds. Along the way, unlock four Arcade modes: Endless, Puzzles (with a puzzle of
> the day), Rhythm and Duel against a rival, plus a new daily challenge every day.
>
> **Features**
>
> - 6 worlds, 72 levels and 6 bosses
> - 3 difficulty levels
> - 4 Arcade modes and a daily challenge
> - Charged shots and an optional aim assist
> - Colour-blind friendly: every colour carries a symbol
> - Plays in English, French and Indonesian

Version française, si le formulaire propose d'autres langues :

> **Ballmania** réinvente le tir de billes. Une chaîne de billes de verre roule vers le
> trou : tirez des billes pour former des groupes de trois de la même couleur et regardez-les
> voler en éclats dans des réactions en chaîne spectaculaires.
>
> Traversez six mondes, chacun avec sa mécanique : ricochets sur des miroirs néon, aimant
> des abysses, mélange des couleurs en Joaillerie, aiguillages de lave dans le Volcan, tirs
> courbés autour d'un trou noir. Chaque monde se termine par un Colosse.
>
> Attrapez des fragments d'étoiles pour débloquer dix améliorations à l'Observatoire,
> gagnez des éclats pour personnaliser lanceur, traînées et explosions, et affrontez pluies
> de météores, tempêtes solaires, froid mordant et vents contraires. Débloquez en chemin
> quatre modes Arcade : Infini, Énigmes (avec l'énigme du jour), Rythme et Duel contre un
> rival, plus un défi du jour.

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
> - Swap marbles: tap the shooter

## Formulaire : réponses à préparer

- **Build** : `npm run build:crazygames`, puis zipper le **contenu** de `dist-crazygames/`
  (l'`index.html` à la racine de l'archive). Chemins relatifs, 42 fichiers, 665 Ko en
  tout (limites : 1 500 fichiers, 50 Mo au premier chargement, 20 Mo pour la page
  d'accueil mobile).
- **Orientation** : paysage (le jeu s'adapte aussi au portrait sur mobile).
- **Mobile** : oui, tactile complet.
- **Progress Save / Data module** : à cocher. Le jeu sauvegarde par le module de données
  du SDK ; sans cette option, le module renvoie `dataModuleDisabled` et la progression
  n'est pas gardée.
- **Langue** : anglais complet ; le jeu suit la langue du joueur (`systemInfo.locale`),
  anglais par défaut.
- **Public** : tout public (CrazyGames exige la conformité PEGI 12) : aucune violence,
  aucun achat, aucune donnée personnelle collectée.

## Conformité vérifiée dans le jeu

- SDK v3 : `loadingStart`, `loadingStop`, `gameplayStart` et `gameplayStop` (jamais
  pendant une pause, un menu, une fin de partie ou une publicité), `happytime` rare.
- En un clic dans le jeu : sur le portail, pas d'intro de studio, et « Jouer » mène un
  nouveau joueur directement au niveau 1-1.
- Publicités : aucune avant 3 minutes de jeu, jamais pendant le jeu ni sur un bouton de
  navigation (carte, menus) ; une publicité entre deux parties au plus toutes les 3
  minutes ; jamais de publicité au « Rejouer » d'un écran qui proposait déjà « Continuer
  (vidéo) ». Son coupé seulement au début réel de la publicité.
- Récompensées : toujours facultatives, annoncées par une icône vidéo et « Regarder une
  publicité », jamais sur l'écran de jeu actif (l'indice d'énigme est dans le menu
  pause), jamais nécessaires pour finir un niveau, rien n'est donné si la publicité
  échoue, message « réessayez plus tard » sinon.
- Bloqueur de publicité : le jeu reste entier ; un message dans la page (pas une fenêtre)
  explique que les bonus vidéo sont indisponibles.
- Silence demandé par le portail (`muteAudio`) prioritaire sur le volume du jeu.
- Mobile : `user-select: none`, pas de loupe ni de menu sur appui long, zones de sécurité
  respectées.
- Touches : les lettres suivent la disposition du clavier (M est M en AZERTY) ; pas de
  bouton plein écran maison ; P met en pause (Échap aussi, mais il quitte le plein écran
  du portail : la fiche n'indique que P).
- Physique identique à toutes les fréquences d'écran (pas fixe de 1/120 s).

## Écarts assumés

- **Alternative en monnaie du jeu** aux récompensées (recommandée par CrazyGames) : non
  proposée. Les éclats n'achètent que des cosmétiques, jamais d'aide (cahier des charges
  § 3.6) ; on garde cette règle.
- **Publicités bannières** : non utilisées.

[intro]: https://docs.crazygames.com/requirements/intro/
[covers]: https://docs.crazygames.com/requirements/game-covers/
[technical]: https://docs.crazygames.com/requirements/technical/
[gameplay]: https://docs.crazygames.com/requirements/gameplay/
[ads]: https://docs.crazygames.com/requirements/ads/
[quality]: https://docs.crazygames.com/requirements/quality/
