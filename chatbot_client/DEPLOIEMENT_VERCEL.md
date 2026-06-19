# Guide de Déploiement sur Vercel et Tunneling de Base de Données

Ce guide fournit la procédure technique pour déployer l'application Chatbot Client d'AeroServe sur la plateforme Vercel et établir une connexion avec une base de données MySQL locale via un tunnel Ngrok. Ce protocole est optimisé pour les présentations académiques et les démonstrations de projet.

---

## 1. Migration de la Base de Données vers l'Environnement Local

Avant de configurer la liaison réseau, les données précédemment hébergées sur le serveur externe (AlwaysData) doivent être rapatriées sur le serveur MySQL local (WampServer, XAMPP, Laragon ou conteneur autonome).

### Procédure d'exportation et d'importation :
1. Exécuter la commande d'exportation depuis le terminal pour générer un fichier de sauvegarde de la base de données distante :
   ```bash
   mysqldump -h mysql-billelz.alwaysdata.net -u billelz_admin -p billelz_aeroserve > database_backup.sql
   ```
2. Saisir le mot de passe de connexion associé à la base de données externe lors de la demande.
3. Démarrer le service MySQL local sur le port par défaut `3306`.
4. Créer une nouvelle base de données locale nommée `aeroserve` en utilisant la console de gestion MySQL ou phpMyAdmin :
   ```sql
   CREATE DATABASE aeroserve;
   ```
5. Importer le fichier de sauvegarde dans la base de données locale :
   ```bash
   mysql -u root -p aeroserve < database_backup.sql
   ```

---

## 2. Configuration du Tunnel TCP (Pinggy ou Bore)

Vercel hébergeant le chatbot sur une infrastructure cloud publique, il est nécessaire d'établir un canal de communication sécurisé (tunnel) pour lui permettre d'accéder au port de base de données local de la machine de présentation. Comme Ngrok requiert désormais une vérification par carte bancaire pour le trafic TCP sur son offre gratuite, nous utilisons à la place **Pinggy** (via SSH sans installation) ou **Bore** (sans limite de temps).

### Option A : Activation du tunnel avec Pinggy (Recommandé - Sans installation)
Pinggy utilise le client SSH intégré de votre système pour créer le tunnel. **Note :** La version gratuite de Pinggy limite la session à 60 minutes.

1. Ouvrir le terminal (Invite de commandes CMD ou PowerShell sur Windows, ou Terminal sur macOS/Linux).
2. Lancer la commande suivante :
   ```bash
   ssh -p 443 -R0:localhost:3306 tcp.pinggy.io
   ```
3. Si un message de sécurité SSH s'affiche (*Are you sure you want to continue connecting?*), saisir `yes` et valider.
4. Dans la console, repérer l'adresse de redirection générée sous la forme suivante :
   `tcp.pinggy.io:12345` (où `12345` est le port dynamique attribué).
5. Extraire le nom d'hôte (`tcp.pinggy.io`) et le numéro de port (`12345`). Ces informations seront utilisées pour la configuration sur Vercel.

### Option B : Activation du tunnel avec Bore (Alternative sans limite de temps)
Bore est un outil open-source très léger qui ne possède pas de limite de temps de session.

1. Télécharger l'utilitaire Bore pour votre système (sur [trybore.com](https://trybore.com)).
2. Lancer la commande suivante dans le dossier contenant le fichier `bore` (ou `bore.exe`) :
   ```bash
   bore local 3306 --to bore.pub
   ```
3. Repérer l'adresse de redirection générée sous la forme suivante :
   `bore.pub:54321` (où `54321` est le port dynamique attribué).
4. Extraire le nom d'hôte (`bore.pub`) et le numéro de port (`54321`). Ces informations seront utilisées pour la configuration sur Vercel.

---

## 3. Déploiement de l'Application sur Vercel

Le processus de déploiement compile l'application Next.js et génère l'URL publique finale accessible aux utilisateurs.

### Procédure de déploiement :
1. Accéder au tableau de bord de [Vercel](https://vercel.com) et se connecter avec le compte de stockage de code (GitHub).
2. Cliquer sur le bouton d'importation de projet et sélectionner le dépôt contenant le code source d'AeroServe.
3. Dans la section de configuration du répertoire source (Root Directory), spécifier le dossier `chatbot_client` afin d'éviter la compilation de l'intégralité du dépôt à la racine.
4. Développer la section des variables d'environnement pour y injecter les paramètres de connexion définis à l'étape suivante.

---

## 4. Configuration des Variables d'Environnement sur Vercel

Les variables d'environnement suivantes doivent être renseignées dans l'interface de Vercel pour établir la connexion avec la base de données locale et le moteur d'intelligence artificielle :

| Nom de la variable | Valeur requise | Rôle |
|---|---|---|
| `DB_HOST` | `tcp.pinggy.io` (ou `bore.pub`) | Nom d'hôte réseau généré par le tunnel |
| `DB_PORT` | `12345` (port dynamique) | Port réseau attribué dynamiquement par le tunnel |
| `DB_USER` | `root` (ou utilisateur local) | Identifiant d'accès au serveur de base de données local |
| `DB_PASSWORD` | (laisser vide si aucun) | Mot de passe du serveur MySQL local |
| `DB_NAME` | `aeroserve` | Nom de la base de données importée localement |
| `GROQ_API_KEY` | Clé API d'accès Groq | Clé d'authentification pour les appels au modèle Llama 3.3 |

### Note technique sur la persistance du tunnel :
Les tunnels gratuits (Pinggy ou Bore) attribuent un port dynamique différent à chaque fois que la commande d'initialisation du tunnel est lancée. Lors de chaque nouvelle session de présentation, il est impératif de modifier la valeur de la variable `DB_PORT` (et éventuellement `DB_HOST` si vous changez d'outil) dans les paramètres de Vercel avec le nouveau port fourni, puis de relancer un déploiement (Redeploy) pour appliquer les changements.

---

## 5. Liaison Finale et Utilisation du QR Code

Une fois le déploiement sur Vercel validé, la plateforme fournit une URL publique (par exemple : `https://aeroserve-chatbot.vercel.app`).

1. Copier cette URL publique de production.
2. Utiliser un outil de génération de QR Code pour associer cette adresse à un code graphique.
3. Intégrer ce QR Code sur le support de présentation ou l'imprimer. Lors de la soutenance, le jury pourra scanner ce code avec son smartphone pour utiliser l'interface du chatbot, qui exécutera ses requêtes de manière invisible directement sur le serveur local de la machine de présentation.
