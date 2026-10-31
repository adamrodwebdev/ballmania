# Originalité et provenance de Ballmania

À joindre à toute réponse quand un portail ou un titulaire de droits conteste le jeu : ce qui
vient du genre, ce qui est propre à Ballmania, et d'où vient chaque élément. Mis à jour à
chaque version (version 1.8.1, le 31/10/2026).

## Ce qui vient du genre

Ballmania est un tir de billes en chaîne, un genre né en 1998 sur borne d'arcade et repris
depuis par des centaines de jeux : une chaîne roule vers un trou, le joueur tire des billes
pour former des groupes de trois, et les vides qui se referment déclenchent des réactions en
chaîne. Ces règles sont de libre parcours. Ballmania n'emprunte à aucun jeu ses personnages,
ses décors, ses dessins, ses sons ni ses noms.

## Ce qui est propre à Ballmania

- **Un univers cosmique en six mondes** : Nébuleuse, Néon, Abysses, Joaillerie, Volcan et
  Singularité, des billes de verre gravées d'un symbole, un tracé de lumière et un trou noir
  au bout du tracé.
- **Des lanceurs dessinés pour le jeu** : le Cœur d'étoile, l'Orbite, la Couronne, le Halo et
  l'Œil.
- **Des mécaniques à lui** : les tirs en bande sur les miroirs, l'aimant, l'alchimie des
  couleurs, les aiguillages de lave, la gravité et le lanceur en orbite, les Colosses, le tir
  chargé et la zone de grâce ; l'entraînement, les quatre modes Arcade (Infini, Énigmes,
  Rythme, Duel), le défi du jour, l'Atelier et l'Observatoire.
- **Des noms à lui** : les billes bonus Recul, Stase, Tir arc-en-ciel et Laser, la Nova, les
  Colosses. Aucun texte, aucune fiche ni aucun nom de fichier ne nomme un autre jeu : un test
  y veille (`tests/i18n/otherGames.test.ts`).

## Provenance

| Élément                                 | Origine                                       | Preuve                                                                   |
| --------------------------------------- | --------------------------------------------- | ------------------------------------------------------------------------ |
| Code                                    | écrit pour le jeu, depuis le 12/10/2026       | l'historique daté du dépôt public, github.com/adamrodwebdev/ballmania    |
| Règles, niveaux et équilibrage          | conçus et mesurés pour le jeu                 | le cahier des charges daté (`docs/CAHIER_DES_CHARGES.md`) et ses mesures |
| Couvertures, image de partage et vidéos | dessinées par notre code, avec le vrai moteur | `marketing/crazygames/cover.ts`, `trailer.ts`                            |
| Musique et bruitages                    | synthétisés en direct, sans échantillon       | `src/audio`                                                              |
| Polices                                 | Lilita One, Fredoka et Nunito, sous OFL 1.1   | `CREDITS.md`, `LICENSES/OFL-1.1.txt`                                     |

## Si une réclamation arrive

1. Noter le délai du portail : CrazyGames attend une réponse étayée dans un délai raisonnable,
   Playgama suspend le jeu le temps de son enquête.
2. Répondre avec ce document, le lien vers l'historique daté du dépôt et des captures du jeu.
3. Aucune contre-notification sans avocat ; une mise en demeure ou une action en justice
   passent d'abord par un avocat.
