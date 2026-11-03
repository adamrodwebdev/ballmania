# Kit de soumission Yandex Games

Réponses du brouillon de la console des jeux de Yandex (version 1.9.0), d'après la fiche de
référence `references/yandex-games.md` (exigences du 9 octobre 2026, relue le 03/11/2026). Le titre
est **Ball Mania** dans toutes les langues, le même dans le jeu (build Yandex) et dans chaque
champ et visuel de la fiche (règle 5.1.3) ; un titre latin peut servir à toutes les langues.

## Fichiers

- Archive : `npm run build:yandex`, puis
  `python scripts/zip-build.py dist-yandex marketing/yandex/out/ball-mania-1.9.0.zip`. Le script
  ne garde aucune archive sans `index.html` à la racine ou avec un nom de fichier qui contient
  une espace ou un caractère hors ASCII (règle 1.22), et donne la taille décompressée (100 Mo
  au plus, règle 1.21).
- Visuels : `npm run kit:crazygames -- yandex` écrit dans `out/` l'icône `icon-512x512.png` et
  la couverture `cover-800x470.png`, sans capture du jeu (règle 5.6), ni bord, ni coin arrondi,
  ni interface du jeu (8.3.3, 8.3.4), avec le titre « Ball Mania » ; puis la vidéo horizontale
  obligatoire `trailer-landscape-1920x1080.mp4` et la verticale `trailer-vertical-1080x1920.mp4`,
  de moins de 28 s, la couverture une seconde puis les moments du jeu (70 % de jeu au moins,
  5.1.1.3). Les vidéos ne sont pas versionnées.
- Captures : `npm run build:yandex`, puis `node marketing/yandex/shots.mjs ru` (et `en`, `fr`,
  `id`) écrit dans `out/` quatre captures de vraie partie par langue, le HUD dans la langue de
  l'onglet de la fiche : deux d'ordinateur en 1920 × 1080 (miroirs néon, trou noir) et deux de
  téléphone en 1080 × 1920 (alchimie des couleurs, aimant), côté long de 1 280 à 2 560 px,
  100 % de jeu (5.1.1.2). Le script joue le build Yandex contre une doublure du SDK, avec toute
  la campagne ouverte. Les captures ne sont pas versionnées.

## Onglet « Общее » (général)

- **Архив** : l'archive ci-dessus.
- **Поддерживаемые платформы** : ordinateur, téléphone (iOS et Android). Pas la télévision :
  le jeu ne se finit pas aux seules flèches d'une télécommande (1.6.3).
- **Ориентация** : « Любая » (les deux), le jeu se réorganise en portrait comme en paysage.
- **Игра переведена на** : russe, anglais, français, indonésien ; chaque langue bascule en
  entier avec le SDK (règle 2.14, vérifiée par `e2e/yandex.spec.ts`).
- **Возрастной рейтинг** : 6+ (décidé le 03/11/2026). Aucune violence réaliste, mais des
  explosions de billes et un boss, le Colosse, qui rugit et disparaît dans les étincelles : le
  0+ exclut ce qui peut effrayer un jeune enfant, explosions comprises (2.7).
- **Категории** (deux au plus, 2.3, premier motif de refus) : « Аркады » et « Головоломки »
  (décidé le 03/11/2026). Le jeu est un tir de billes en temps réel (la chaîne avance), avec
  des énigmes à coups comptés.
- **Ключевые слова** (minuscules, 100 caractères au plus) :
  `шарики, стрелялка шариками, три в ряд, цепочка шаров, головоломка, аркада, космос`
- **Игра использует облачные сохранения** : coché (`player.setData()`, règle 1.11).
- **Комментарий разработчика** (lu par les modérateurs seulement) : voir plus bas.

## Onglet « Описание и продвижение » (texte par langue)

Limites : « Об игре » et « Как играть » de 100 à 1 000 caractères ; « Описание для SEO » de 50
à 160, commençant par un mot-clé ou un appel à l'action et finissant par « . » ou « ! » ;
« Короткое описание » 70 au plus, sans répéter le titre ni dire « бесплатная ». Aucun mot
« бесплатно », « лучший », « топ » ou « free », « best », « top » ; aucun lien ni autre jeu
nommé (8.2.2, 8.4.2). Les noms des modes, des bonus et de la monnaie sont ceux du jeu.

### Русский

- **Название** : Ball Mania
- **Короткое описание** : Собирайте шарики по цвету и устраивайте цепные взрывы в космосе
- **Описание для SEO** : Стреляйте шариками, собирайте три в ряд и запускайте цепные реакции в шести космических мирах с боссами!

**Об игре** :

> Цепочка стеклянных шариков катится к чёрной дыре. Стреляйте шариками, собирайте группы из трёх
> и больше шаров одного цвета и смотрите, как сомкнувшиеся ряды взрываются цепными реакциями. 72
> уровня в шести мирах, и в каждом своя особенность: рикошеты от неоновых зеркал, магнит морских
> глубин, алхимия цветов, лавовые стрелки, которые меняют путь цепочки, и чёрная дыра,
> искривляющая выстрелы. Каждый мир завершает босс — Колосс. Разбивайте шарики с бонусами:
> «Перемотка», «Стазис», «Радужный выстрел» и «Лазер». Зарабатывайте звёзды и осколки, покупайте
> улучшения и украшения, забирайте подарок дня, проходите испытание дня и открывайте четыре
> аркадных режима: «Бесконечность», «Головоломки», «Ритм» и «Дуэль».

**Как играть** :

> Стреляйте шариками в цепочку и собирайте группы из трёх и больше шаров одного цвета: они
> лопаются, разрыв смыкается, и новые совпадения взрываются следом. Уничтожьте все шарики, пока
> цепочка не докатилась до дыры, чтобы пройти уровень. Мышь: наводите курсор, чтобы целиться,
> отпустите кнопку, чтобы выстрелить, удерживайте её для усиленного выстрела, правая кнопка —
> сменить шар. Касание: ведите пальцем, чтобы целиться, отпустите, чтобы выстрелить, задержите
> палец для усиленного выстрела, коснитесь пушки, чтобы сменить шар. Клавиатура: стрелки —
> прицел (с Shift — точнее), Пробел — выстрел, X — сменить шар, P — пауза.

### English

- **Title** : Ball Mania
- **Short description** : Match marbles by colour and set off cosmic chain reactions
- **SEO description** : Marble shooter: match three of a colour, set off chain reactions and beat six cosmic worlds with bosses!

**About the game** :

> A chain of glass marbles rolls toward a black hole. Shoot marbles into it to make groups of
> three or more of the same colour, and watch the gaps close into chain reactions. 72 levels
> across six worlds, each with its own twist: bank shots off neon mirrors, a deep-sea magnet,
> colour alchemy, lava switches that reroute the chain, and a black hole that bends your shots.
> Every world ends with a Colossus boss. Burst power-up marbles for a Rewind, a Stasis, a
> Rainbow shot or a Laser. Earn stars and shards, buy upgrades and cosmetics, collect a daily
> gift, take on the daily challenge and unlock four Arcade modes: Endless, Puzzles, Rhythm and
> Duel.

**How to play** :

> Shoot marbles into the chain to make groups of three or more of the same colour: they burst,
> the gap closes, and new matches burst in turn. Destroy every marble before the chain reaches
> the hole to win the level. Mouse: move to aim, release the button to shoot, hold it to charge
> a stronger shot, right-click to swap marbles. Touch: drag to aim, lift your finger to shoot,
> hold it still to charge, tap the launcher to swap. Keyboard: arrow keys to aim (Shift for
> precision), Space to shoot, X to swap, P to pause.

### Français

- **Titre** : Ball Mania
- **Description courte** : Associez les billes par couleur et déclenchez des réactions en chaîne
- **Description SEO** : Tirez des billes, alignez-en trois de la même couleur et déclenchez des réactions en chaîne dans six mondes cosmiques !

**À propos du jeu** :

> Une chaîne de billes de verre roule vers un trou noir. Tirez des billes pour former des
> groupes de trois ou plus de la même couleur, et regardez les brèches se refermer en réactions
> en chaîne. 72 niveaux dans six mondes, chacun avec son idée : tirs en bande sur des miroirs
> néon, un aimant des grands fonds, l'alchimie des couleurs, des aiguillages de lave qui
> détournent la chaîne et un trou noir qui courbe vos tirs. Chaque monde se termine par un boss,
> le Colosse. Faites éclater les billes bonus pour un Recul, une Stase, un Tir arc-en-ciel ou un
> Laser. Gagnez des étoiles et des éclats, achetez améliorations et cosmétiques, récupérez le
> cadeau du jour, relevez le défi du jour et débloquez les quatre modes Arcade : Infini,
> Énigmes, Rythme et Duel.

**Comment jouer** :

> Tirez des billes dans la chaîne pour former des groupes de trois ou plus de la même couleur :
> ils éclatent, la brèche se referme et de nouvelles associations éclatent à leur tour.
> Détruisez toutes les billes avant que la chaîne n'atteigne le trou pour gagner le niveau.
> Souris : bougez pour viser, relâchez le bouton pour tirer, maintenez-le pour un tir chargé,
> clic droit pour échanger les billes. Tactile : glissez pour viser, levez le doigt pour tirer,
> gardez-le immobile pour charger, touchez le lanceur pour échanger. Clavier : flèches pour
> viser (Maj pour affiner), Espace pour tirer, X pour échanger, P pour la pause.

### Bahasa Indonesia

- **Judul** : Ball Mania
- **Deskripsi singkat** : Cocokkan bola berdasarkan warna dan picu reaksi berantai kosmik
- **Deskripsi SEO** : Tembak bola, kumpulkan tiga bola sewarna, dan picu reaksi berantai di enam dunia kosmik penuh bos!

**Tentang game** :

> Rantai bola kaca bergulir menuju lubang hitam. Tembakkan bola untuk membentuk kelompok tiga
> atau lebih dengan warna yang sama, lalu lihat celahnya menutup menjadi reaksi berantai. 72
> level di enam dunia, masing-masing dengan keunikannya: pantulan dari cermin neon, magnet laut
> dalam, alkimia warna, persimpangan lava yang mengubah jalur rantai, dan lubang hitam yang
> membelokkan tembakan. Setiap dunia ditutup oleh bos, sang Kolosus. Pecahkan bola bonus untuk
> mendapatkan Mundur, Stasis, Tembakan pelangi, atau Laser. Kumpulkan bintang dan kepingan, beli
> peningkatan dan kosmetik, ambil hadiah harian, jajal tantangan harian, dan buka empat mode
> Arkade: Tanpa Akhir, Teka-teki, Irama, dan Duel.

**Cara bermain** :

> Tembakkan bola ke rantai untuk membentuk kelompok tiga atau lebih dengan warna yang sama:
> kelompok itu pecah, celahnya menutup, dan kecocokan baru ikut pecah. Hancurkan semua bola
> sebelum rantai mencapai lubang untuk memenangkan level. Mouse: gerakkan untuk membidik,
> lepaskan tombol untuk menembak, tahan untuk tembakan yang lebih kuat, klik kanan untuk menukar
> bola. Layar sentuh: geser untuk membidik, angkat jari untuk menembak, tahan jari agar tembakan
> terisi, sentuh penembak untuk menukar. Keyboard: panah untuk membidik (Shift agar lebih
> presisi), Spasi untuk menembak, X untuk menukar, P untuk jeda.

## Commentaire pour les modérateurs

En russe, la langue des modérateurs, puis en anglais (2 048 caractères au plus en tout).

> Игра хранит прогресс в данных игрока (`player.setData`): изменения одного момента игры
> уходят вместе, не чаще раза в 4 секунды. Настройки звука и экрана хранятся в браузере.
> Полноэкранная реклама — только между партиями, после нажатия кнопки игроком, и никогда в
> первые минуты нового игрока. Видео за вознаграждение — только по выбору игрока: продолжить
> после поражения, удвоить осколки за партию, подсказка в головоломке, примерить украшение;
> продолжение и подсказку можно получить и за осколки. Покупок нет. Игра говорит на языке SDK
> (русский, английский, французский, индонезийский), пока игрок не выберет другой в
> настройках.

> The game keeps the player's progress in the player data (`player.setData`): the changes of
> one moment of play leave together, at most once every 4 seconds. Sound and display settings
> stay in the browser. Fullscreen ads only between two games, after the player presses a
> button, never in a new player's first minutes. Rewarded videos only when the player chooses
> one: continue after a defeat, double the shards of a game, a puzzle hint, try a cosmetic; the
> continue and the hint can also be bought with shards. No purchases. The game speaks the SDK's
> language (Russian, English, French, Indonesian) until the player picks another one in the
> settings.

## Conformité

La revue du build Yandex (étape 6) se fait avec la compétence de revue des portails, sur
l'archive finale ; ses résultats s'ajoutent ici.
