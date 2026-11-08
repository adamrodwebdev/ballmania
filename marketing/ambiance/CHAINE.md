# Quiet Orbit — le kit de la chaîne (Compte B)

Préparé le 08/11/2026 par la session de code Ballmania, pour l’utilisateur et pour NICHE. La fabrique
(`npm run ambiance`) rend les vidéos, les miniatures, les Shorts **et leurs textes** ; c’est
l’utilisateur qui crée les comptes, relit et publie. Rien n’est publié automatiquement.

## 1. Décisions à prendre par l’utilisateur

| Décision          | Recommandation                                                                            | Pourquoi                                                                                                                                                                |
| ----------------- | ----------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Nom de la chaîne  | **Quiet Orbit** (choisi par l’utilisateur le 08/11/2026)                                  | Court, calme, mémorisable ; aucune chaîne, groupe ou marque à ce nom trouvé (08/11/2026). Couvre les six mondes cosmiques, Abysses compris (« l’orbite » de la chaîne). |
| Pseudo            | **@astralquietorbit** (YouTube, 08/11/2026 : @quietorbit était pris) ; le même sur TikTok | Le même partout. Seul l’écran d’inscription dit s’il est libre : vérifier sur YouTube **et** TikTok avant d’imprimer quoi que ce soit.                                  |
| Langue            | Anglais par défaut, traduction française du titre et de la description                    | Le public de l’ambiance est mondial et cherche en anglais ; la traduction française se lit en France (YouTube Studio → Langues).                                        |
| Lien de la chaîne | https://ballmania.netlify.app                                                             | Notre site, sans publicité ni SDK : un clic, le jeu. Jamais un portail, jamais Yandex.                                                                                  |
| Plateformes       | YouTube d’abord, TikTok pour les Shorts                                                   | La vidéo longue vit sur YouTube ; TikTok n’a pas de lien cliquable avant 1 000 abonnés.                                                                                 |
| Direct 24/7       | Après ~10 h de vidéos, sur une machine distante gratuite (§ 8)                            | Pas sur le portable de l’utilisateur (chaleur, courant, disponibilité).                                                                                                 |

**Les deux autres pistes** : « Slow Nebula » est libre aussi, mais l’ambiance spatiale est pleine de
« Nebula » (SpaceAmbient, Eternal Cosmos, NebulaEcho…) ; « Deep Drift » est le plus encombré (Calm
Drift Sleep, BlueDrift HZ, Dream Drift existent déjà).

**Revue du nom** (analyse de risque, pas un avis juridique) : aucune marque « QUIET ORBIT » trouvée ;
une demande américaine « COZY ORBIT » (Quantum Mindframe, classes 41 et 16, podcasts de pleine
conscience, déposée le 23/04/2026, en cours) est proche par le mot « orbit » mais vise un autre service
et un autre pays : risque faible. À revoir avant tout dépôt de marque ou contrat (là, un avocat se
justifie).

## 2. Positionnement

**Une phrase** : des ambiances longues pour dormir, étudier et se concentrer, dont la musique et les
images sont calculées en direct par le moteur d’un jeu — sans IA générative, et jamais deux fois les
mêmes.

| Public                                 | Ce qu’il veut                                  | Ce qu’on publie                                 | Où il va ensuite  |
| -------------------------------------- | ---------------------------------------------- | ----------------------------------------------- | ----------------- |
| Dormeurs (mobile, casque, soir)        | S’endormir vite, rien qui réveille             | 1 à 3 h « pour dormir », images qui s’apaisent  | La playlist Sleep |
| Étudiants et travailleurs (ordinateur) | Un fond régulier, sans voix ni montée          | 1 à 3 h « focus » et « study »                  | La playlist Focus |
| Curieux de génératif et de jeux        | Comprendre comment c’est fait, voir l’original | La phrase de crédit, le lien du jeu, les Shorts | Le jeu, gratuit   |

**La différence qui se voit** : « no generative AI » dans un genre envahi par la musique d’IA, des
créatures qui bougent pour de bon (méduses, bancs de poissons, raies), et une musique qui évolue
sans boucle audible sur toute la durée.

## 3. Identité

- **Nom affiché** : Quiet Orbit (11 caractères ; YouTube et TikTok acceptent 30).
- **Logo** : un anneau d’orbite fin et lumineux, incliné, plus brillant devant, autour d’un point de
  lumière, avec sa petite lune. Il se lit à 98 px (taille réelle de l’avatar YouTube).
- **Police du nom** : Quicksand (Google Fonts, licence SIL OFL 1.1, utilisée seulement dans les
  images rendues ; aucun fichier de police n’est distribué).
- **Couleurs** : celles de chaque monde (fiche `looks.ts`) ; la marque elle-même est blanc d’écume
  sur bleu abyssal (#020c1a → turquoise #5ff7e6).
- **Ton** : calme, chaleureux, peu de mots ; jamais d’injonction (« abonnez-vous », « commentez »).
- **Fichiers** : `npm run ambiance -- --brand` écrit dans `marketing/ambiance/out/brand/` :
  `picture-800.png` (avatar, à recadrer en rond par YouTube) et `banner-2560x1440.png` (le nom et la
  ligne tiennent dans la zone sûre de 1 546 × 423 px). Option `--at <secondes>` pour un autre instant.

## 4. Les profils, champ par champ

À remplir **à la main, sur l’ordinateur**, quelques champs par jour (leçon d’octobre : un compte neuf
rempli d’un coup a été suspendu). Les noms et pseudos ne changent que lentement : YouTube deux fois en
14 jours, TikTok le nom tous les 7 jours et le pseudo tous les 30.

### YouTube

- **Nom** : `Quiet Orbit` · **Pseudo** : `@astralquietorbit`
- **Photo** : `picture-800.png` · **Bannière** : `banner-2560x1440.png`
- **Description** (anglais, 1 000 caractères au plus) :

  > Long ambient videos for sleep, study and focus. The music and the images are generated in real
  > time by the engine of Ball Mania, a free browser game: no generative AI, no samples, no stock
  > footage. Every video is composed from its own seed, so no two are alike, and the music evolves
  > for the whole video without looping.
  >
  > New long video every Tuesday. Deep sea, nebulae, neon grids, crystals and black holes.
  >
  > Best at low volume, with headphones or a small speaker.

- **Traduction française** (Studio → Personnalisation → Informations de base → Ajouter une langue) :

  > Des vidéos d’ambiance longues pour dormir, étudier et se concentrer. La musique et les images
  > sont générées en temps réel par le moteur de Ball Mania, un jeu gratuit dans le navigateur : sans
  > IA générative, sans échantillon, sans image d’archive. Chaque vidéo naît de sa propre graine :
  > aucune ne ressemble à une autre, et la musique évolue sans jamais boucler.
  >
  > Une nouvelle vidéo longue chaque mardi. Fonds marins, nébuleuses, grilles néon, cristaux et trous
  > noirs.
  >
  > À écouter à faible volume, au casque ou sur un petit haut-parleur.

- **Liens** : « Play Ball Mania (free) » → https://ballmania.netlify.app
- **Fonctionnalités avancées** : à activer dès la création (vérification par téléphone, par
  l’utilisateur) ; elles donnent les liens cliquables des descriptions, la vidéo associée des Shorts
  et l’épinglage des commentaires.
- **Playlists** : « Sleep · Deep Sleep Ambience », « Focus · Study & Deep Work Ambience »,
  « Deep Sea Ambience », « Space Ambience ».

### TikTok

- **Nom** : `Quiet Orbit · ambience` (22 caractères ; le mot-clé dans le nom aide la recherche)
- **Pseudo** : `astralquietorbit` (16 caractères ; le même que sur YouTube) · **Photo** : `picture-800.png`
- **Bio** (80 caractères au plus) : `Generative ambience for sleep & focus. No gen AI. Full videos on YouTube.` (73)
- Pas de lien cliquable avant 1 000 abonnés : le pseudo YouTube suffit dans la bio.

## 5. Chaque vidéo, pas à pas

La commande écrit les textes à côté des fichiers, dans `out/<humeur>-<graine>-<durée>/texts/` :

| Fichier          | Contenu                                                                         |
| ---------------- | ------------------------------------------------------------------------------- |
| `youtube.en.txt` | Titre (première ligne) puis description anglaise avec les chapitres             |
| `youtube.fr.txt` | La traduction française du titre et de la description (Studio → Langues)        |
| `shorts.en.txt`  | La légende des trois Shorts, en anglais (YouTube et TikTok)                     |
| `shorts.fr.txt`  | La même en français, si l’on veut une variante                                  |
| `pinned.en.txt`  | Le commentaire épinglé : le crédit et le lien du jeu, rien de demandé en retour |

Pour une vidéo déjà rendue : `npm run ambiance -- --mood <id> --minutes <n> --seed <s> --describe`.

**Réglages de mise en ligne (YouTube Studio)** :

- Public : **non, pas conçu pour les enfants** (sinon commentaires, fiches et playlists coupés).
- **Utilisation de l’IA : Non.** Rien n’est généré par IA : la musique est synthétisée et les images
  calculées par le code du jeu.
- Catégorie : Musique. Licence standard. Commentaires ouverts.
- Miniature : `thumbnail.jpg` (sans texte ; un mot au plus, si les tests le justifient plus tard).
- Programmation : **mardi 20:00, heure de Paris**.
- Puis : épingler le commentaire, ajouter la traduction française, ranger dans deux playlists.

**Les Shorts** (lundi, mercredi, vendredi à 12:30) : `short-1.mp4` à `short-3.mp4`, déjà bouclés sans
couture, avec la légende de `shorts.en.txt` ; sur YouTube, « vidéo associée » = la vidéo longue de la
semaine (le seul lien cliquable d’un Short). Le même fichier sur TikTok, publié depuis TikTok Studio
sur l’ordinateur, sans filigrane d’une autre application.

## 6. Le calendrier

**La semaine type (1 h humaine au plus)** :

| Quand                  | Qui             | Quoi                                                                                | Durée  |
| ---------------------- | --------------- | ----------------------------------------------------------------------------------- | ------ |
| Samedi soir            | Utilisateur     | Lancer `npm run ambiance` (la garde se met en pause s’il joue ou si le GPU chauffe) | 2 min  |
| Nuit de samedi         | Machine         | Rendu : ≈ 1 h 30 par heure de vidéo avec les pauses de chaleur                      | —      |
| Dimanche               | Utilisateur     | Relecture (début, deux jointures, fin, les Shorts), programmation YouTube et TikTok | 40 min |
| Dimanche               | NICHE           | Revue de la semaine, ligne de KPI                                                   | —      |
| Mar. 20:00             | YouTube         | La vidéo longue sort                                                                | —      |
| Lun., mer., ven. 12:30 | YouTube, TikTok | Les Shorts sortent                                                                  | —      |
| Dans l’heure           | Utilisateur     | Répondre aux premiers commentaires                                                  | 15 min |

**Les 12 premières semaines** (S1 commence quand les comptes existent) :

| Semaine | Vidéo longue                                 | Durée | Note                                                   |
| ------- | -------------------------------------------- | ----- | ------------------------------------------------------ |
| S0      | Mise en place : comptes, profils, visuels    | —     | La vidéo validée est programmée pour le mardi de S1    |
| S1      | Abysses, pour dormir (graine 1, **validée**) | 1 h   | Déjà rendue                                            |
| S2      | Nébuleuse, pour rêver                        | 1 h   | Ébauche de 3 min à valider avant le rendu              |
| S3      | Joaillerie, pour étudier                     | 1 h   | Idem                                                   |
| S4      | Abysses, pour dormir (graine 2)              | 2 h   | **Porte 1**                                            |
| S5      | Néon, pour se concentrer                     | 1 h   |                                                        |
| S6      | Singularité, concentration profonde          | 2 h   |                                                        |
| S7      | Nébuleuse, pour rêver (graine 2)             | 2 h   |                                                        |
| S8      | Abysses, pour dormir (graine 3)              | 3 h   | **Porte 2** ; bibliothèque ≈ 13 h : préparer le direct |
| S9      | Volcan, chaud et lent                        | 1 h   | Après la reprise du Volcan (le monde le moins abouti)  |
| S10     | Ce que les chiffres de S1–S9 désignent       | 2–3 h |                                                        |
| S11     | Idem                                         | 2–3 h | Direct 24/7, si décidé                                 |
| S12     | Idem                                         | 2–3 h | **Porte 3**                                            |

**À savoir** : les mondes autres que les Abysses ont reçu l’ondulation des courants, mais pas encore
de « formes qui nagent » (bancs, raies). Avant leur semaine, une ébauche de 3 min dit si l’image tient
une heure ; sinon, leur équivalent (comètes, nuées d’éclats, oiseaux de lumière…) est à faire, environ
2 à 3 h de session par monde. Une vidéo de 3 h pèse ≈ 17 Go : la fabrique ne garde que deux rendus par
humeur, et l’utilisateur efface après la mise en ligne.

## 7. Mesurer (proposition pour NICHE : section « Compte B » de `KPI.md`)

| Colonne                     | Définition                                                                                     |
| --------------------------- | ---------------------------------------------------------------------------------------------- |
| Vidéos longues, Shorts      | Nombre publié dans la semaine                                                                  |
| Heures de visionnage        | YouTube Studio, la semaine (heures « qualifiées » quand Studio les donne)                      |
| Durée moyenne de visionnage | Des vidéos longues de la semaine, en minutes                                                   |
| Taux de clic des miniatures | YouTube Studio (impressions → vues)                                                            |
| Abonnés pour 1 000 vues     | Toutes plateformes                                                                             |
| Médiane des vues des Shorts | YouTube et TikTok, relevée le dimanche soir                                                    |
| Clics vers le jeu           | « n. d. » tant que le site n’a pas de mesure ; YouTube donne les clics sur les liens de chaîne |
| Décision                    | Garder, ajuster ou arrêter, en quelques mots                                                   |

**Portes** (fin de S4, S8, S12) : la durée moyenne de visionnage des vidéos longues, la part des
spectateurs qui reviennent, et les abonnés pour 1 000 vues décident des humeurs et des durées
suivantes. Seuils à fixer par NICHE après S4, sur les premiers chiffres réels plutôt que sur des
moyennes de blogs.

**L’argent** : le Programme Partenaire n’est pas un but de la première année (1 000 abonnés et
4 000 h ; 8 000 h pour les nouveaux candidats à partir du 01/02/2027). On suit les heures qualifiées,
sans compter dessus.

## 8. Le direct 24/7

**Quand** : vers S8, avec ≈ 10 à 13 h de vidéos différentes.

**Comment** :

1. YouTube : activer le direct (vérification par téléphone, puis 24 h d’attente la première fois).
2. Une liste de lecture des vidéos de la bibliothèque, jouée en boucle par ffmpeg vers l’adresse
   RTMP de YouTube, **sans réencodage** (les fichiers sont déjà en H.264 + AAC, une image clé toutes
   les 2 s, comme YouTube le demande).
3. Les vidéos du direct se rejoignent sans fondu au noir : la fabrique ajoutera `--no-fades` (la
   musique revient déjà, en fin de vidéo, aux accords de son début), et un débit constant d’environ
   6 Mb/s pour tenir dans la bande passante d’un direct.
4. **La machine** : pas le portable de l’utilisateur (chaleur, courant, 24 h sur 24). Recommandé :
   une machine virtuelle gratuite (par exemple l’offre « Always Free » d’Oracle Cloud, qui suffit
   pour envoyer un flux déjà encodé ; elle demande une carte bancaire pour vérifier l’identité et
   peut reprendre une machine inactive). Un serveur payant (≈ 5 € par mois) contredirait la règle
   « rien avant que ça rapporte » : à décider par l’utilisateur.
5. TikTok LIVE demande 1 000 abonnés : plus tard.

Coût du lot « direct » : environ 3 à 5 h de session (`--no-fades`, débit constant, script de
diffusion, documentation), plus la mise en place par l’utilisateur de la machine et de la clé de
flux (qui ne doit jamais apparaître dans le dépôt).

## 9. Garde-fous

- **Contenu « non authentique »** (règle de monétisation de YouTube sur le contenu produit en
  série et répétitif) : une vidéo par semaine, chacune avec son humeur, sa graine et ses chapitres,
  relue par l’utilisateur ; la description explique la fabrication.
- **Vrai seulement** : « no generative AI » (vrai : le code du jeu a été écrit avec une aide d’IA,
  mais rien de ce qu’on entend ou voit n’est généré par IA ; ne jamais écrire « 100 % fait main »).
- **Jamais** d’achat de vues ou d’abonnés, de boucles d’engagement (« commentez pour… »), de
  réponses automatiques.
- **Jamais** de mention de Yandex, ni de nom ou de marque d’un autre jeu ou d’une autre chaîne dans
  les titres, mots-clés et mots-dièse.
- **Aucune musique** d’une bibliothèque extérieure : tout vient de la fabrique.

## 10. Liste de la semaine 0 (à cocher par l’utilisateur)

- [x] Choisir le nom : Quiet Orbit (08/11/2026).
- [x] Pseudo YouTube : @astralquietorbit (08/11/2026, @quietorbit était pris).
- [ ] Prendre le même pseudo sur TikTok : astralquietorbit.
- [ ] Créer la chaîne YouTube (sur l’ordinateur), activer les fonctionnalités avancées (téléphone).
- [ ] Mettre l’avatar et la bannière (`out/brand/`), la description anglaise, sa traduction, le lien.
- [ ] Créer le compte TikTok (ordinateur), nom, pseudo, photo, bio ; un jour plus tard.
- [ ] Créer les quatre playlists.
- [ ] Programmer la vidéo validée (Abysses, 1 h) pour le mardi 20:00 avec ses textes de `texts/`.
- [ ] Programmer ses trois Shorts (lundi, mercredi, vendredi 12:30) sur YouTube et TikTok.
- [ ] Dire à la session de code quand c’est fait : elle prépare l’ébauche de S2.
