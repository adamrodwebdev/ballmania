# Test de couloir (1.8.0, étape 4)

**But** : voir sur des inconnus si les trois premières minutes accrochent sans un mot
d'explication, et noter où l'on hésite, où l'on sourit, où l'on décroche. Le test prépare la
porte de dépôt CrazyGames (10 à 20 sessions, 25 % au-delà de 3 minutes) sans la remplacer.

**Fini quand** : notes écrites ; corrections décidées avec l'auteur avant le réglage du
monde 1 (étapes 5 et 6).

## Ce qu'on veut savoir

1. **Le premier geste** : la personne trouve-t-elle seule comment viser et tirer ? En combien
   de secondes ?
2. **Les moments forts** : la Nova, la cascade, le rebond sur le néon, le tir courbé, la
   supernova et la promesse du Colosse font-ils réagir ?
3. **La main et les phrases** : sont-elles suivies, ignorées, ou gênantes ?
4. **Le rythme** : les durées réelles d'E1, E2, E3 et du 1-1, comparées au tableau du cahier
   des charges (§ 3.13 : 45 à 60 s, 50 à 70 s, 60 à 80 s, puis 60 à 90 s pour le 1-1). Le
   robot nouveau venu va environ deux fois plus vite. Ces durées le recalent à l'étape 5.
5. **Les sorties** : quelqu'un s'arrête-t-il, et où ? Quelqu'un touche-t-il « Passer » ?
6. **Le passage au 1-1** : l'écran de fin et « Continuer » sont-ils compris ? Le 1-1
   paraît-il trop simple après l'entraînement ?

## Qui

- Trois à cinq personnes qui n'ont jamais vu Ballmania ni vu le jeu se faire : au moins deux
  sur téléphone et deux sur ordinateur, à la souris.
- Si possible une personne qui ne joue jamais, et une de 13 à 17 ans (le public des
  portails), avec l'accord d'un parent.
- Aucun nom : T1 à T5. Aucune vidéo ni voix enregistrée sans l'accord de la personne (et d'un
  parent pour un mineur).

## Matériel

- **Le build des portails sur le réseau de la maison** : `npm run couloir` construit le
  portail simulé, puis le sert à toutes les machines du réseau sur le port 4190. Ouvrir
  l'adresse « Network » qu'il affiche (`http://192.168.….:4190`) sur le téléphone, connecté au
  même Wi-Fi. Au premier lancement, Windows peut demander d'autoriser Node.js : réseaux privés
  seulement. Arrêter le serveur après le test (Ctrl + C).
- **Une fenêtre privée par personne** (navigation privée sur le téléphone) : chacun arrive en
  nouveau joueur, entraînement compris. La première image doit être la vitrine E1.
- **Le son allumé**, à volume moyen. Luminosité haute, téléphone chargé ; une souris sur
  l'ordinateur.
- **Le carnet de couloir**, sur un autre appareil : https://claude.ai/artifact/LSfYqmfP13kyav5Pra8Ri8
  (page privée de l'auteur). Chaque toucher note l'instant et la vitrine en cours. Le carnet
  fait lui-même la synthèse, et Claude peut en lire les notes. Sans le carnet, la grille
  ci-dessous sur papier.

## Déroulé, une dizaine de minutes par personne

1. **Le cadre**, et rien d'autre : « Je teste un jeu, pas toi. Je ne peux pas t'aider : je
   regarde seulement ce qui est clair ou pas. Tu peux arrêter quand tu veux. » Ne pas dire le
   genre du jeu, les commandes ni le but.
2. **Donner l'appareil** sur la première image du jeu, et toucher « Démarrer » dans le carnet
   au moment où la personne la voit.
3. **Se taire**, et regarder ses mains et son visage plutôt que l'écran. Si elle demande quoi
   faire : « Fais comme tu le sentirais », et noter « Demande de l'aide ». Au bout de 30 s
   d'un blocage complet seulement : « Essaie de toucher l'écran », et le noter.
4. **La laisser jouer** jusqu'à la fin du 1-1, ou trois minutes après l'entraînement, ou
   jusqu'à ce qu'elle s'arrête d'elle-même. Noter le moment exact de l'arrêt : c'est la
   donnée la plus précieuse.
5. **Cinq questions**, dans cet ordre, sans les reformuler ni relancer, en notant ses mots :
   - « Raconte-moi ce qui s'est passé. »
   - « Qu'est-ce que tu as préféré ? »
   - « Qu'est-ce qui t'a gêné ou paru flou ? »
   - « Tu continuerais ? Pourquoi ? »
   - « Ça te fait penser à quel jeu ? »

   Pour la dernière, noter le nom tel quel, sans en suggérer un.

## La grille

**Repères**, un instant chacun (mm:ss depuis « Démarrer ») :

| Repère                             | Cible (§ 3.13)       |
| ---------------------------------- | -------------------- |
| Premier tir                        | dans les premières s |
| La Nova explose                    | vers 4 s             |
| Cascade                            | vers 8 s             |
| Fin d'E1 (carte « Étape 2 sur 3 ») | 45 à 60 s            |
| Premier rebond sur le néon         | —                    |
| Fin d'E2 (carte « Étape 3 sur 3 ») | E2 en 50 à 70 s      |
| Premier tir courbé                 | —                    |
| Promesse du Colosse                | E3 en 60 à 80 s      |
| « Continuer » vers le 1-1          | 2 min 45 à 3 min 40  |
| Fin du 1-1                         | le 1-1 en 60 à 90 s  |

**Signes**, chaque fois qu'ils arrivent, avec l'instant :

- hésite (plus de 3 s sans geste) ;
- sourit ou s'exclame ;
- bloqué ;
- demande de l'aide ;
- mauvais geste (tire sans viser, cherche un bouton…) ;
- lit la phrase ;
- touche « Passer » ;
- s'arrête.

## De la note à la correction

- **Le soir même** : une ligne par problème, avec le nombre de personnes, la gravité
  (bloquant, gênant ou détail) et la correction proposée.
- **La règle** : un problème vu chez deux personnes ou plus, ou bloquant chez une seule, se
  corrige ; le reste se note.
- **Les corrections** se décident avec l'auteur, avant le réglage du monde 1. Les durées
  réelles recalent le robot nouveau venu (étape 5).

## Résultats

_À remplir après le test._

| Personne | Appareil | Âge | Joue | E1  | E2  | E3  | 1-1 | S'arrête | Moments qui font réagir | Blocages |
| -------- | -------- | --- | ---- | --- | --- | --- | --- | -------- | ----------------------- | -------- |

**Corrections décidées** :
