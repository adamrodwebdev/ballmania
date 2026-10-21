# Feuille de route

Le détail des versions livrées est dans le [journal des modifications](CHANGELOG.md) ; le
cahier des charges (`docs/CAHIER_DES_CHARGES.md`) décrit le jeu tel qu'il est.

## v1.7.1 — Lanceurs de l'Atelier (livrée le 21/10/2026)

**But** : mettre les quatre autres lanceurs de l'Atelier (Orbite, Couronne, Halo, Œil) au
niveau du Cœur d'étoile, à côté duquel ils paraissaient fades, avant la soumission à
CrazyGames : c'est la 1.7.1 qui part, la 1.7.0 n'ayant pas encore été soumise. Planche des
cinq lanceurs validée le 21/10/2026 (en grand, en jeu sur plateau sombre et clair, en
vignette d'Atelier). Les aperçus de l'Atelier montrent désormais les billes du lanceur.

## v1.7.0 — Nouvelle soumission à CrazyGames (livrée le 21/10/2026)

**But** : passer la revue qualité de CrazyGames, qui a refusé la v1.1 (« The overall quality
of the game does not yet meet the expectations of our platform »), et viser ses repères
du lancement limité : 80 % des joueurs qui jouent au moins une minute, 10 minutes de jeu
en moyenne, 10 à 15 % de retour le lendemain. Mesures de départ sur le bac à sable de
Playgama (v1.4.2, 101 parties) : 61 % de sessions perdues avant 30 s de jeu, 3 min 35 s
de jeu en moyenne.

**Public et plateformes** : joueurs de CrazyGames et de Playgama, ordinateur et téléphone,
paysage et portrait ; notre site garde son écran titre et son intro.

| Étape                   | Contenu                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | Fini quand                                                                                                                    |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| 1. Droit au jeu         | Sur un portail, un nouveau joueur arrive directement dans le niveau 1-1 (geste d'apprentissage), sans passer par l'écran titre ; un joueur qui revient retrouve l'écran titre.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | Profil neuf, build CrazyGames : la première image jouable est le niveau 1-1 ; `gameplayStart` part ; test de bout en bout.    |
| 2. Fond du monde 1      | Nébuleuse en couches : nuages colorés, galaxie lointaine, planètes dans les marges, trois plans d'étoiles qui dérivent, vignette ; ciel de nuit dans les deux thèmes (seul l'affichage passe en clair, en pastilles claires) ; sillon sombre bordé de violet sous la chaîne ; peint une fois par taille, mouvement réduit respecté ; le tracé reste le plus lisible.                                                                                                                                                                                                                                                                                                                   | Maquette validée ; captures 907×510 et 390×844 ; 60 i/s sur le profil modeste ; Lighthouse ≥ 95.                              |
| 3. Lanceur              | Le concept A « Cœur d'étoile » (choisi le 21 octobre 2026) : pétales de cristal, berceau doré, pointes allumées de la couleur chargée ; il devient le lanceur par défaut et la mascotte des couvertures ; sur ordinateur, le tir de la scène de titre part de lui ; les cosmétiques existants restent.                                                                                                                                                                                                                                                                                                                                                                                 | Maquette validée ; visée, tir et échange lisibles ; couvertures refaites.                                                     |
| 4. Billes bonus         | Des billes à pouvoir arrivent dans la chaîne ; détruites dans un groupe, elles déclenchent leur effet : **recul** de la chaîne, **ralenti**, **tir arc-en-ciel** (la bille suivante va avec toutes les couleurs), **laser** (le tir suivant traverse et détruit les premières billes touchées). Une nouveauté par niveau dans le monde 1 : Recul au 1-3, Ralenti au 1-6 (demi-vitesse pendant 8 s), Arc-en-ciel au 1-8, Laser au 1-10 (les 4 premières billes touchées) ; le conseil sur les réactions en chaîne passe du 1-3 au 1-5 ; ensuite mêlées aux mécaniques des mondes ; campagne, Infini et défi du jour, pas les Énigmes, le Rythme ni le Duel. Économie inchangée (§ 3.6). | Maquette validée ; robot joueur : chaque niveau reste gagnable, et pas trivial ; tests unitaires des effets.                  |
| 5. Récompense du jour   | « Cadeau du jour » : série de 7 jours en éclats (15, 20, 25, 30, 40, 50 puis 120, soit 300 par semaine ; retour au jour 1 après un jour manqué), sur une carte non bloquante de l'écran titre, repliée en pastille une fois le cadeau pris.                                                                                                                                                                                                                                                                                                                                                                                                                                            | Maquette validée ; une seule prise par jour et par sauvegarde ; tests.                                                        |
| 6. Conformité et médias | Échap n'est plus utilisé par le jeu (il quitte le plein écran sur CrazyGames ; pause sur P), fait ; SDK CrazyGames dans le `<head>` du build ; HTML des builds de portail en anglais ; bandes-annonces paysage et portrait refaites (nouvel écran, billes bonus, victoire) ; couvertures avec le nouveau lanceur.                                                                                                                                                                                                                                                                                                                                                                      | Revue de modération (`game-moderator-review`) sans échec ; vidéos ≤ 20 s, sans son.                                           |
| 7. Livraison            | Traductions FR et ID des nouveaux textes, CHANGELOG, build CrazyGames et kit, mise à jour de Playgama.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | Tests unitaires et de bout en bout verts, Lighthouse ≥ 95 dans les quatre catégories ; la soumission est faite par l'éditeur. |

Maquettes validées le 21 octobre 2026 : jeu sur ordinateur et téléphone dans les deux thèmes, lanceurs, billes
bonus, écran titre et cadeau du jour.

Ajouts décidés pendant la livraison (21/10/2026) : carte de campagne sans défilement sur les
écrans larges et bas, barre de défilement aux couleurs du jeu (maquette validée) ; niveau 1-1
en vitrine (Nova, cascade à trois étages, Laser, supernova en une minute) ; aucun
`gameplayStop` quand l'onglet est caché (règle CrazyGames).

En parallèle : demander à CrazyGames (developer-relations@crazygames.com) les raisons
précises du refus ; leur réponse peut réordonner les étapes.

**Laissé pour plus tard** : boutique de bonus, pubs récompensées pour des bonus (lancement
complet seulement), nouveaux mondes.
