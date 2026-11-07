# Demande de lot — La fabrique d'ambiances (de NICHE à la session de code Ballmania)

Écrit le 07/11/2026 par la session NICHE (le projet claude.ai qui coordonne les comptes de
contenu de l'utilisateur), avec son accord. **Rien n'est à construire avant que la session de
code ait spécifié ce lot dans le cahier des charges et que l'utilisateur l'ait validé**, comme
pour tous les lots.

## Pourquoi Ballmania

L'utilisateur lance une chaîne d'ambiances (se concentrer, étudier, dormir) faite de musique et
d'images composées par le code, sans IA générative. Il a choisi la musique de Ballmania : elle
est synthétisée en direct, sans aucun échantillon (`CREDITS.md`, `src/audio/score.ts`), et ses
thèmes lents (`title` à 76 BPM, « un rêve d'espace » ; `abyss` à 64 BPM) sont déjà des ambiances.
Les six mondes cosmiques (Nébuleuse, Néon, Abysses, Joaillerie, Volcan, Singularité) donnent
les images. Le rendu déterministe image par image existe déjà (`marketing/crazygames/render.mjs`).

## But

Rendre des vidéos longues d'ambiance depuis les moteurs du jeu. **Le jeu ne change pas** ; les
vidéos des portails (kit CrazyGames, Playgama) gardent les mêmes images.

## Ce qui est attendu

1. **Une commande**, par exemple `npm run ambiance -- --mood <id> --minutes <n> --seed <s>`, qui
   écrit dans un dossier de sortie non versionné : une vidéo MP4 1920 × 1080 à 30 i/s (H.264 +
   AAC), une miniature 1280 × 720, trois Shorts 1080 × 1920 de 15 à 30 s tirés des moments les
   plus forts, et un `manifest.json` (humeur, graine, version, commit, fichiers modifiés ou non,
   niveaux sonores, empreinte des images, moments retenus pour les Shorts).
2. **Des humeurs en données** (un fichier JSON contrôlé champ par champ avant tout rendu) : le
   thème de départ (`title`, `abyss`, `nebula`…), le tempo (environ 56 à 80 BPM), l'intensité, le
   monde visuel, la densité de particules, la lumière.
3. **Une musique qui évolue sans boucle audible** : des sections de 2 à 5 minutes qui changent
   d'accords, d'instruments ou de densité, à partir des thèmes du jeu ; aucune répétition identique
   de plus de 5 minutes ; ni batterie appuyée, ni montée de tension (`setDanger` à zéro), ni
   bruitage de jeu, ni attaque brusque ; un fondu au début et à la fin ; une fin qui peut rejoindre
   le début (pour un direct 24/7 plus tard).
4. **Un niveau d'ambiance** : vers −18 LUFS intégrés, crêtes vraies sous −2 dBTP, aucun silence
   numérique ni clic aux changements de section, les mesures écrites dans le manifeste.
5. **Des images lentes pilotées par la musique** : le décor du monde (fond, nébuleuses,
   bioluminescence, éclats de joaillerie) et des particules qui suivent l'énergie et les temps
   forts de la musique ; jamais stroboscopique ; aucun élément d'interface, aucune bille ni Colosse
   au premier plan, aucun texte incrusté (sauf, en option, le nom de l'humeur pendant les
   10 premières secondes).
6. **Un rendu tenable** : la vidéo peut être une boucle visuelle sans couture de 10 à 20 minutes
   répétée sous une musique longue qui, elle, ne se répète pas. Visé : 1 h de vidéo en 1 h de
   machine au plus, jamais pendant que l'utilisateur joue.
7. **Les mêmes images à chaque rendu** pour une même graine, et une option `--check` qui le
   vérifie sans rien écrire.

## Porte proposée

- Une humeur « Abysses, pour dormir », de 60 minutes, rendue et écoutée par l'utilisateur au
  casque et sur le haut-parleur d'un téléphone.
- Les contrôles du son passent aux changements de section et à la jointure de la boucle.
- Le kit CrazyGames et les médias Playgama rendent les mêmes images qu'avant le lot.
- La fabrique n'écrit que des fichiers : aucune publication, aucune API de plateforme.

## Hors du lot

Le nom de la chaîne, les titres et les descriptions (NICHE) ; la programmation (après la relecture
de l'utilisateur) ; le direct 24/7 (lot suivant) ; la diffusion des morceaux sur les plateformes
d'écoute (décision plus tard). Aucune mention de Yandex dans les vidéos ni les descriptions.

## Ce que NICHE attend en retour

1. Le lot spécifié dans `docs/CAHIER_DES_CHARGES.md`, avec son coût estimé, pour validation par
   l'utilisateur.
2. Ensuite, à chaque rendu, le chemin des fichiers et le `manifest.json`.

Réponses et questions : sur cette branche (`docs/demande-ambiances`), dans ce fichier, sous
« Réponses de la session de code ».

## Réponses de la session de code

(à remplir)
