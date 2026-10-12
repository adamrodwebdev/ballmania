# Cahier des charges — Ballmania

| Version | Date       | Statut                                      |
| ------- | ---------- | ------------------------------------------- |
| 0.13    | 12/10/2026 | Lot 10, monde 6 livré (Singularité, orbite) |

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
  plateau ou ne fait rien exploser casse la série. **Bonus de fin de niveau** (lot 4) :
  300 points, plus 10 points par seconde gagnée sous le temps de référence du niveau (55 %
  du temps que mettrait la chaîne à atteindre le trou sans être touchée).
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
  et les mondes bonus. Rejouer un niveau pour la 3ᵉ étoile = rejouabilité.
- **Assistance discrète** : après 3 échecs d'affilée sur un niveau, proposition d'un
  ralentissement léger (le joueur garde le choix) ; aucune difficulté cachée qui triche.
  **Livrée au lot 5** : après 3 défaites d'affilée sur un niveau de campagne, l'écran de fin
  propose « Réessayer avec de l'aide » (chaîne 15 % moins rapide pour cet essai, signalée
  par « Aide active »). Les étoiles restent attribuées normalement : l'aide est visible et
  choisie, elle ne triche pas. Pas d'aide sur le défi du jour (classement équitable).

#### Monde 1 « Nébuleuse », livré au lot 4

- **Tracés par recette** plutôt qu'en coordonnées : spirale (nombre de tours, rayons de
  départ et d'arrivée, angle de départ, sens, « carré » de 1 = ellipse à 3 = rectangle
  arrondi, 1 ou 2 bras entrelacés) ou serpentin (rangées en lacets, lanceur en bas). Une
  même recette produit **deux plateaux** : carré (1000 × 1000) pour les écrans larges et
  **portrait (1000 × 1400)** pour les téléphones tenus droits (hauteur ≥ 1,2 × largeur). En
  portrait, les billes gardent la même taille et le plateau occupe tout l'écran.
- Chaque niveau est vérifié automatiquement sur les deux plateaux : tracé dans le plateau,
  aucun chevauchement entre deux portions de tracé, place autour du lanceur, longueur
  suffisante, partie qui démarre.

| Niveau | Tracé                                    | Billes        | Couleurs | Vitesse | Conseil affiché          |
| ------ | ---------------------------------------- | ------------- | -------- | ------- | ------------------------ |
| 1      | Spirale 1,25 tour                        | 28            | 3        | 30      | Viser et tirer           |
| 2      | Spirale 1,35 tour, sens inverse          | 34            | 3        | 34      | Échanger les billes      |
| 3      | Serpentin 3 rangées                      | 36            | 3        | 38      | Réaction en chaîne       |
| 4      | Spirale 1,5 tour                         | 40            | 4        | 44      | Quatrième couleur        |
| 5      | Spirale « carrée » 1,45 tour             | 44            | 4        | 50      | —                        |
| 6      | Serpentin 3 rangées (respiration)        | 38            | 4        | 42      | —                        |
| 7      | Double spirale, 2 chaînes                | 2 × 22        | 4        | 44      | Deux chaînes, deux trous |
| 8      | Spirale 1,7 tour, sens inverse           | 50            | 4        | 58      | —                        |
| 9      | Serpentin 4 rangées                      | 52            | 4        | 48      | —                        |
| 10     | Spirale arrondie (respiration)           | 46            | 4        | 50      | —                        |
| 11     | Spirale carrée 1,65 tour                 | 54            | 5        | 68      | —                        |
| 12     | Spirale 1,6 tour + **Colosse stellaire** | 26 + renforts | 4        | 26      | Blesser le Colosse       |

- **Colosse** : il pousse la chaîne par l'arrière (c'est lui qui avance, pas la queue de
  chaîne). Une explosion à moins de 3 diamètres de bille de son corps lui retire
  « billes × profondeur » points de vie (60 au total). À chaque tiers de sa vie, il accélère
  (× 1,25 puis × 1,5), crache 6 billes devant lui et rugit ; une chaîne vide repousse
  aussitôt. Quand il tombe, toutes les billes restantes explosent en cascade. S'il atteint
  le trou, la partie est perdue.
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

| Action                          | Souris / clavier             | Tactile                                      |
| ------------------------------- | ---------------------------- | -------------------------------------------- |
| Viser                           | Pointeur                     | Glisser le doigt (ligne de visée)            |
| Tirer                           | Clic gauche, Espace          | Relâcher le doigt                            |
| Échanger bille / suivante       | Clic droit, X, C             | Toucher le lanceur ou le bouton « Échanger » |
| Armer l'aimant (Abysses)        | M, bouton « Aimant »         | Bouton « Aimant »                            |
| Basculer un aiguillage (Volcan) | Clic sur le levier, S        | Toucher le levier                            |
| Pause                           | Échap, P                     | Bouton pause (≥ 44 × 44 px)                  |
| Viser au clavier (a11y)         | Flèches gauche/droite (+Maj) | —                                            |

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
  cosmétiques possédés, historique du défi du jour. Livré au lot 4 : `CampaignProgress`
  (clé `ballmania:progress`, version 1) garde par niveau les meilleures étoiles et le
  meilleur score ; un niveau s'ouvre quand le précédent est fini ; une sauvegarde abîmée
  ou d'une version inconnue repart de zéro. Stockée via une abstraction
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

#### Livré au lot 5

**Éclats** (monnaie gagnée uniquement en jouant) :

| Source                        | Éclats                      |
| ----------------------------- | --------------------------- |
| Niveau de campagne gagné      | 10 + 15 par étoile nouvelle |
| Défi du jour, 1er essai gagné | 20 + 10 par étoile          |
| Défi du jour, 1er essai perdu | 10 (merci d'avoir joué)     |
| Objectif atteint              | 20 à 150 selon l'objectif   |

**Atelier** (cosmétiques, aucun effet sur le jeu ; aperçus dessinés par le code du jeu) :

| Emplacement        | Objets (prix en éclats)                                                                                                                                                                                                                     |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Lanceurs           | Orbite (offert), Couronne 150, Halo 250, Œil 350                                                                                                                                                                                            |
| Traînées de tir    | Aucune (offerte), Comète 80, Poussière d'étoiles 160, Prisme 260                                                                                                                                                                            |
| Signatures de bris | Verre (offert), Étoiles 180, Pixels 240, Pétales 320                                                                                                                                                                                        |
| Plateaux           | Celui du monde (par défaut), Nébuleuse, **Néon** (en finissant la Nébuleuse), **Abysses** (en finissant Néon), **Joaillerie** (en finissant les Abysses), **Volcan** (en finissant la Joaillerie), **Singularité** (en finissant le Volcan) |

Un objet acheté est aussitôt équipé. Le plateau choisi habille tous les niveaux et le défi
du jour ; « Celui du monde » suit le monde joué.

**23 objectifs** (compteurs à vie ; au lot 10 : faire exploser des billes avec 10 tirs
courbés d'au moins 45° par le trou noir, 70 éclats, terminer le Volcan, 350 éclats, et
terminer la campagne, 500 éclats ; au lot 9 : basculer 15 aiguillages, 50 éclats, et terminer
la Joaillerie, 300 éclats ; « tir en bande » ajouté au lot 6 : faire exploser un
groupe après 2 rebonds, 60 éclats ; au lot 7 : aspirer 10 billes avec l'aimant, 50 éclats, et
terminer Néon, 200 éclats ; au lot 8 : fusionner 20 fois, 60 éclats, et terminer les
Abysses, 250 éclats) : gagner un niveau (20), réaction ×3 (30) et ×5 (80),
5 et 10 tirs réussis d'affilée (40, 100), 500 et 2 000 billes détruites (50, 120), gagner
sans échanger (40), gagner alors que la chaîne a dépassé 90 % du tracé (50), 3 étoiles sur
5 niveaux (80), vaincre le Colosse (100), jouer le défi 3 jours (60), terminer la Nébuleuse
(150). Atteints automatiquement, payés aussitôt, listés avec leur progression.

**Défi du jour** : un niveau de la Nébuleuse (3 à 11, ni tutoriels ni boss) tiré par
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
  Depuis le lot 5, **chaque langue est un fichier séparé** : le visiteur ne télécharge que
  la sienne (≈ 3 Ko compressés), les autres au premier changement de langue.
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

| Lot  | Contenu                                                                                       |
| ---- | --------------------------------------------------------------------------------------------- |
| 0 ✅ | Dépôt, outillage, cahier des charges, accueil provisoire (i18n, thèmes)                       |
| 1 ✅ | Moteur : chemin, chaîne, tir, insertion, correspondances, recul, combos, graine               |
| 2 ✅ | Interface jouable : écran de jeu, rendu, commandes, HUD, pause, fin, niveau démo              |
| 3 ✅ | Destruction et son : bris, ondes de choc, ralentis, synthèse audio, intensités                |
| 4 ✅ | Campagne : mondes, niveaux en données, étoiles, sauvegarde ; monde 1 Nébuleuse                |
| 5 ✅ | Progression : éclats, objectifs, cosmétiques, thèmes débloquables ; Défi du jour ; assistance |
| 6 ✅ | Monde 2 Néon : miroirs, prismes, ricochet, Colosse prisme                                     |
| 7 ✅ | Monde 3 Abysses : aimant, charges, Colosse abyssal                                            |
| 8 ✅ | Monde 4 Joaillerie : alchimie des couleurs, Colosse de cristal                                |
| 9 ✅ | Monde 5 Volcan : aiguillages, raccourcis en fusion, Colosse de lave                           |
| 10   | Monde 6 Singularité : gravité, orbite, Colosse ultime ✅ ; modes Arcade                       |
| 11   | Accessibilité, SEO, tests e2e, Lighthouse, documentation, 1.0.0 (notre site)                  |
| 12   | Portails : `PlatformAdapter` par portail, publicités, builds dédiés                           |
| 13   | Démo portfolio                                                                                |

## 10. Hors périmètre (v1)

Comptes, classements en ligne, multijoueur en réseau, achats intégrés.

## 11. Évolutions envisagées

Éditeur de chemins, classements en ligne du défi du jour, application installable (PWA).

## 12. Journal des versions du document

| Version | Date       | Changements                                                                                                                                                          |
| ------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0.1     | 12/10/2026 | Création : objectifs, positionnement, règles, 12 modes proposés.                                                                                                     |
| 0.2     | 12/10/2026 | Campagne (6 mondes, 72 niveaux), thèmes à débloquer, éclats et cosmétiques, monétisation par portails (`PlatformAdapter`), lots revus.                               |
| 0.3     | 12/10/2026 | Lot 0 livré : pile et versions, socle (réglages, thèmes, stockage), CSP, Lighthouse 100 × 4 mobile et ordinateur.                                                    |
| 0.4     | 12/10/2026 | Lot 1 livré : moteur (§ 5.3), règles de score et de génération précisées (§ 3.1).                                                                                    |
| 0.5     | 12/10/2026 | Lot 2 livré : couche de jeu (§ 5.4), commandes précisées (§ 3.3), niveaux en données.                                                                                |
| 0.6     | 12/10/2026 | Lot 3 livré : destruction détaillée (§ 3.5), réglages (§ 3.4), effets et son (§ 5.5).                                                                                |
| 0.7     | 12/10/2026 | Lot 4 livré : monde 1 (§ 3.2), Colosse, bonus de fin (§ 3.1), sauvegarde (§ 3.4), équilibrage par robot, architecture (§ 5.6).                                       |
| 0.8     | 12/10/2026 | Lot 5 livré : éclats, atelier, objectifs, défi du jour partageable, aide après 3 défaites (§ 3.2, 3.6), langues chargées à la demande (§ 4.4), architecture (§ 5.7). |
| 0.9     | 12/10/2026 | Lot 6 livré : monde 2 Néon (§ 3.2), règle du ricochet (§ 3.1), 14ᵉ objectif (§ 3.6), architecture des miroirs (§ 5.8).                                               |
| 0.10    | 12/10/2026 | Lot 7 livré : monde 3 Abysses et aimant (§ 3.2), commande (§ 3.3), plateau et objectifs (§ 3.6), architecture (§ 5.9).                                               |
| 0.11    | 12/10/2026 | Lot 8 livré : monde 4 Joaillerie et alchimie (§ 3.2), plateau et objectifs (§ 3.6), architecture (§ 5.10).                                                           |
| 0.12    | 12/10/2026 | Lot 9 livré : monde 5 Volcan et aiguillages (§ 3.2), commande (§ 3.3), plateau et objectifs (§ 3.6), architecture (§ 5.11).                                          |
| 0.13    | 12/10/2026 | Lot 10, première partie : monde 6 Singularité, gravité et orbite (§ 3.2), plateau et objectifs (§ 3.6), architecture (§ 5.12).                                       |
