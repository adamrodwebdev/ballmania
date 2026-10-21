# Kit de soumission Playgama

Réponses du formulaire du tableau de bord Playgama (Dashboard › Add Game), d'après le wiki
développeur consulté le 14/10/2026. Le titre est en deux mots, **Ball Mania**, le même dans
le jeu (build Playgama) et dans le formulaire : Playgama demande 2 à 4 mots et refuse un
titre qui diffère entre le jeu et la fiche.

## Fichiers

- Archive : `npm run build:playgama`, puis
  `python scripts/zip-build.py dist-playgama marketing/playgama/out/ball-mania-1.6.0.zip`
  (`index.html` à la racine, chemins à barres obliques ; le `Compress-Archive` de Windows
  PowerShell 5.1 écrit des barres obliques inverses qui cassent le jeu une fois décompressé).
- Couvertures (`npm run kit:crazygames -- playgama`, dans `out/`) :
  `cover-square-800x800`, `cover-portrait-1080x1920`, `cover-landscape-1920x1080`, en PNG
  et en JPG (moins de 10 Mo chacune).

## Formulaire

- **Title** : Ball Mania
- **Game Engine** : js (JavaScript sans moteur)
- **Supported Devices** : iOS, Android, Desktop
- **Screen Orientation** : landscape et portrait
- **Game Languages** : English, French, Indonesian
- **Game Features** : aucune (ni classement, ni multijoueur, ni achats)
- **Distribution** : partenaires par défaut, aucune exclusion

**Description** (anglais) :

> Ball Mania is a marble shooter with a cosmic twist. A chain of glass marbles rolls toward
> a black hole: shoot marbles to make groups of three or more of the same colour and set off
> spectacular chain reactions. Travel through six worlds, each with its own mechanic: bank
> shots off neon mirrors, a deep-sea magnet, colour alchemy, lava switches and shots that
> curve around a black hole. Every world ends with a Colossus boss. Burst the power-up
> marbles for a Rewind, a Slow-mo, a Rainbow shot or a Laser. Earn upgrades, unlock
> cosmetics, collect a daily gift, and play four Arcade modes plus a daily challenge.

**How to play** (anglais) :

> Aim at the chain and release to shoot. Make groups of three or more marbles of the same
> colour to destroy them; the gaps close and can explode again in chain reactions. Stop the
> chain before it reaches the hole to win the level. Mouse: move to aim, release the button
> to shoot, hold it to charge a stronger shot, right click to swap marbles. Keyboard: arrow
> keys to aim, Space to shoot, X to swap, P to pause. Touch: drag to aim, lift your finger
> to shoot, tap the shooter to swap.

**Question sur l'outil d'IA** : le code et le jeu ont été écrits avec Claude Code (modèle
Claude Opus 5.5) sous la direction de l'auteur ; les visuels sont dessinés par le code
(Canvas), sans image générée par IA ; la musique et les sons sont synthétisés en direct.

## Conformité vérifiée (revue du 14/10/2026)

- Bridge SDK v2 dans le `<head>`, `playgama-bridge-config.json` à côté d'`index.html` ;
  `bridge.initialize()` attendu avant tout ; aucune autre requête externe (polices dans le
  build).
- Sauvegardes et réglages par `bridge.storage`, chargés en un seul appel au démarrage.
- Langue du portail (`platform.language`), repli sur l'anglais ; langue changeable par
  l'icône engrenage, langues écrites dans leur propre langue.
- `game_ready` quand l'écran titre est jouable ; `level_started`, `level_paused`,
  `level_resumed`, `level_completed`, `level_failed`.
- Son et pause du portail suivis (`AUDIO_STATE_CHANGED`, `PAUSE_STATE_CHANGED`, valeur de
  départ appliquée) ; bouton de coupure du son sur l'écran titre et en jeu ; silence quand
  l'onglet est caché.
- Pause et silence pendant toute publicité plein écran, y compris celles que Playgama
  lance de lui-même (états `INTERSTITIAL_STATE_CHANGED` / `REWARDED_STATE_CHANGED` suivis en
  permanence, `interstitialState` lu au démarrage).
- Bloqueur de publicité : `checkAdBlock` au démarrage ; si les publicités sont bloquées,
  aucune n'est proposée (alternatives en éclats, message dans la page). Une publicité qui
  reste « en chargement » est abandonnée au bout de 12 s : sur les pages de Playgama, le
  SDK publicitaire absent (« Playgama Ads SDK is not initialized ») ne renvoie jamais
  d'échec à Bridge.
- Interstitielles seulement entre deux parties, au plus toutes les 3 minutes ; publicités
  récompensées au choix, annoncées (icône vidéo, « Regarder une publicité »), récompense
  seulement à l'état `rewarded`, aussi disponibles en éclats.
- Aucune barre de défilement, rien de coupé à 360×640, 375×768 (cadre de Playgama au
  téléphone), 390×844, 915×412, 1280×720 et 1920×1080 ; pas de sélection de texte sur appui
  long ; aucun lien externe.
- Jeu en plein écran (v1.5.0) : le niveau occupe tout l'écran, 95 % de la largeur au
  téléphone, HUD et boutons dans des bandes de taille fixe (rails sur les côtés dès 3:2) ;
  le niveau ne change jamais de taille pendant la partie, seule une rotation le réajuste.
