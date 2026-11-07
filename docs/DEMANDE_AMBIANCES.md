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

Écrit le 07/11/2026. Le lot est spécifié au § 3.18 du cahier des charges (lot 15), avec son coût :
**25 à 33 h de session, ≈ 5 h de machine la nuit, ≈ 1 h de l'utilisateur** (coût revu avec la direction artistique) sur une à deux
semaines. **Validé par l'utilisateur le 07/11/2026** (voir « Décisions de l'utilisateur » ci-dessous).

### Ce qui est repris tel quel

La commande, les sorties, les humeurs en données contrôlées, les sections de 2 à 5 min sans
batterie ni tension, −18 LUFS et −2 dBTP, aucune publication, le jeu et les kits inchangés (un
test de CI y veille), la porte « Abysses, pour dormir » de 60 min.

### Désaccords argumentés et alternatives

1. **La boucle visuelle de 10 à 20 min : je propose de ne pas boucler.** Une boucle ne peut pas
   suivre une musique qui ne se répète pas (point 5 de la demande), et une vidéo d'une heure faite
   de quatre fois le même quart d'heure est exactement ce que YouTube range dans le contenu « non
   authentique » (produit en série, répétitif), qui ferme la monétisation. Le décor du jeu étant
   peint une fois et animé par des fonctions du temps, le rendu image par image tient
   vraisemblablement le budget (estimé 0,3 à 0,6 h de machine par heure de vidéo). Un essai le
   mesure en premier ; la boucle de 15 min reste le repli s'il ne passe pas.
2. **« Une fin qui rejoint le début » et « un fondu au début et à la fin » se contredisent dans un
   même fichier.** Proposé : la musique revient en fin de vidéo aux accords et aux voix de sa
   première section (la jointure existe dans la partition), et les fondus s'appliquent à l'export.
   Le fichier sans fondus (`--no-fades`) viendra avec le lot du direct 24/7, qui enchaînera de toute
   façon plusieurs vidéos.
3. **Les Shorts : 20 s bouclés sans couture plutôt que 15 à 30 s coupés.** Un Short qui tourne en
   boucle sans à-coup compte des vues répétées (l'écoute dépasse 100 %), ce qui pèse dans leur
   diffusion. « Les moments les plus forts » d'une ambiance pour dormir, ce sont ici les plus
   lumineux et les plus riches, pris dans trois sections différentes.
4. **La musique du jeu n'est pas jouée par le lecteur du jeu.** `MusicPlayer` joue en temps réel,
   tire son bruit et sa réverbération au hasard (`Math.random()`) et porte la tension : le rendre
   déterministe et hors ligne changerait le jeu. La fabrique reprend la partition (`THEMES`) et
   ses propres voix lentes, stéréo et sans batterie. Le son « vient du moteur de Ball Mania » au
   sens de ses thèmes et de sa synthèse, ce que dit honnêtement la phrase de crédit.
5. **Le déterminisme est garanti sur une même machine, pas d'une machine à l'autre.** Mêmes pixels
   et même PCM pour une même graine avec les mêmes versions de Chrome et de ffmpeg ; l'encodeur
   matériel peut changer quelques octets du MP4 sans rien changer à l'image. Les empreintes du
   manifeste portent donc sur les pixels et le son avant encodage, et `--check` recalcule un
   échantillon (12 images, 3 sections, une jointure : ≈ 2 min) plutôt que toute l'heure, qui
   coûterait une heure de machine.
6. **Le haut-parleur du téléphone n'entend pas les Abysses.** Le thème `abyss` vit autour de 65 et
   130 Hz, sous ce que rend un téléphone. Proposé : des harmoniques sur la basse et le verre au
   médium, vérifiés à l'écoute de la porte. Sans cela, la porte au téléphone échouerait.
7. **−18 LUFS : d'accord pour dormir, à régler par humeur.** YouTube baisse ce qui dépasse
   −14 LUFS mais ne remonte pas ce qui est en dessous : à −18, la vidéo joue 4 dB plus bas que les
   autres, ce qui sert le sommeil mais moins une humeur « focus ». Le champ `loudness` va de −20 à
   −14, −18 par défaut.
8. **Une ébauche avant le rendu long.** Six images fixes et 2 min de son, regardées et écoutées
   (15 min) avant de rendre l'heure : on ne juge l'ennui d'une ambiance qu'à l'oreille, et deux
   tours de retouches sont comptés dans le coût.

### Questions à l'utilisateur

1. **Les images** : valides-tu les décors des six mondes sans billes, sans Colosse et sans
   interface, avec ce que la fabrique ajoute (caméra lente, particules en profondeur, lumière qui
   suit la musique) ? Le décor des Abysses est sobre (rayons, fond, plancton) : sur une heure, ces
   ajouts portent l'image.
2. **Image par image** (recommandé) **ou boucle visuelle de 15 min** ?
3. **Shorts bouclés de 20 s** (recommandé) **ou coupes de 15 à 30 s** ?
4. **Les jeux à surveiller** : `witcher3` et lesquels encore (noms des processus) ? La fabrique se
   met en pause d'elle-même tant qu'ils tournent ou que la machine dépasse 80 °C (GPU).
5. **Le lancement** : à la main le soir (recommandé, 2 min par semaine), ou chaque nuit par le
   Planificateur de tâches de Windows (un réglage permanent de la machine) ?
6. **Le disque** : une heure de vidéo pèse ≈ 5,4 Go ; la fabrique ne garde que les deux derniers
   rendus de chaque humeur. Ça te va ?

### Pour NICHE

- **Monétisation de YouTube** : la règle du contenu « non authentique » vise les chaînes qui
  publient en série des vidéos presque identiques. Une vidéo par semaine, chacune avec son humeur
  et sa graine, relue par l'utilisateur, et une description qui explique la fabrication sont la
  meilleure parade. La fabrique donne pour cela le plan de chaque vidéo dans le manifeste
  (sections, accords, voix), de quoi écrire des descriptions qui diffèrent vraiment.
- La miniature sort sans texte, pour que NICHE pose le sien.
- Aucune mention de Yandex : la fabrique n'écrit aucun texte hormis, en option, le nom de l'humeur.

### Décisions de l'utilisateur (07/11/2026)

- Les six questions : **les choix recommandés sont retenus** (décors des six mondes sans billes,
  sans Colosse ni interface ; image par image ; Shorts bouclés de 20 s ; `witcher3` surveillé, la
  liste se complète dans `guard.json` ; lancement à la main le soir ; deux rendus gardés par
  humeur).
- **Les images doivent donner envie de rêver** : gros effets, dynamisme, belles couleurs. Le
  § 3.18 reçoit une direction artistique de monteur : un plan par section avec son mouvement de
  caméra, cinq plans de profondeur, trois étalonnages par monde, un effet signature par monde
  (étoile qui naît, aurores de néon, méduses de lumière, cristaux irisés, rivières de lave, disque
  d'un trou noir lointain), halos et rayons volumétriques. Pour dormir, l'ouverture est la plus
  riche, puis les effets baissent jusqu'à mi-vidéo sans s'arrêter. Aucun flash, quels que soient
  les effets.
- Coût revu : **25 à 33 h de session, ≈ 5 h de machine**, 0,5 à 0,9 h de machine par heure de
  vidéo (estimé, mesuré par l'essai en premier).
