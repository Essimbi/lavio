# 10 — Sécurité et conformité

## Protection des données personnelles (Cameroun)

- Texte de référence : **loi n° 2024/017 du 23 décembre 2024 relative à la protection des données à caractère personnel**, entrée en pleine application après un délai de mise en conformité de 18 mois (juin 2026). Elle crée l'Autorité de protection des données à caractère personnel (APDP). Compléter par la loi n° 2010/012 du 21 décembre 2010 sur la cybersécurité et la cybercriminalité.
- **Rôles** : chaque pressing est *responsable du traitement* des données de ses clients ; Lavio (le Concepteur, avec l'Exploitant pour le support) est *sous-traitant*. Prévoir un **accord de sous-traitance** annexé aux conditions d'utilisation et une clause d'information à faire figurer sur le ticket (« Vos données sont utilisées pour la gestion de votre dépôt. »).
- **Hébergement et transferts** : un hébergement ou un transfert de données **hors du Cameroun** est soumis à des conditions et, selon la loi, à une autorisation préalable de l'APDP. **Point bloquant avant toute mise en production avec des données réelles** : choisir la région d'hébergement (base Neon, fonctions Vercel, Blob), la consigner dans `docs/14-hypotheses-et-questions-ouvertes.md` et faire valider les formalités par un conseil juridique. Pour le développement et la démonstration, n'utiliser que des données fictives.
- **Minimisation** : ne stocker que nom, téléphone, adresse facultative, préférences. Pas de pièce d'identité, pas de numéro de carte bancaire. Les références Mobile Money sont des numéros de transaction, pas des secrets de paiement.
- **Droits des personnes** : fonction d'export des données d'un client et d'**anonymisation** à la demande (nom et téléphone remplacés), en conservant les écritures comptables.
- **Conservation** : pièces comptables conservées au moins 10 ans (à confirmer par le conseil) ; données de licence tant que le contrat dure. À la fin d'un abonnement : export des données sous 30 jours, puis suppression ou anonymisation selon l'accord.
- Lavio ne détient ni ne transfère aucun fonds : l'application enregistre des paiements, elle n'est pas un service de paiement.

## Sécurité applicative

| Domaine | Exigence |
|---|---|
| Mots de passe | Argon2id (`@node-rs/argon2`), 10 caractères minimum, verrouillage de 15 minutes après 5 échecs, pas de mot de passe par défaut |
| Sessions | JWT d'accès 15 min ; rafraîchissement rotatif, haché en base, détection de réutilisation (révoque la famille de jetons) ; cookie `HttpOnly`, `Secure`, `SameSite=Lax` ; en-tête `X-Requested-With` exigé sur `refresh` et `logout` |
| Autorisation | Vérifiée côté serveur pour chaque route : rôle, licence, appartenance au pressing |
| Isolation | `tenant_id` issu du jeton uniquement ; filtre automatique via l'extension Prisma ; tests d'isolation obligatoires |
| Entrées | Validation stricte (DTO + `class-validator`, `whitelist` et `forbidNonWhitelisted`) ; limites de taille de corps ; pas de SQL brut concaténé |
| Sorties | Pas de `bypassSecurityTrust*` dans Angular ; échappement par défaut |
| En-têtes | `helmet` côté API ; en-têtes de sécurité côté web (CSP stricte, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`) |
| Débit | Limites sur `/auth/login`, `/public/leads`, exports ; règles de pare-feu Vercel en complément |
| Fichiers | Types et tailles contrôlés ; téléversement par jeton signé ; noms de fichiers générés ; pas d'exécution |
| Secrets | Uniquement en variables d'environnement Vercel ; jamais dans le dépôt ; rotation documentée |
| Dépendances | `pnpm audit` dans la CI, mises à jour régulières (Dependabot ou équivalent) |
| Journaux | Pino ; aucun mot de passe, jeton ni donnée personnelle superflue dans les logs |
| Audit | Table `audit_logs` en ajout seul pour les actions listées dans `05-regles-de-gestion.md` |
| Sauvegardes | Restauration à un instant donné fournie par le fournisseur de base de données ; procédure de restauration documentée et testée une fois avant la mise en production |

## Liste de contrôle avant mise en production

- [ ] Tests d'isolation entre pressings verts.
- [ ] Aucune route d'écriture accessible quand la licence est en lecture seule.
- [ ] Aucun secret dans l'historique git.
- [ ] En-têtes de sécurité vérifiés ; HTTPS partout.
- [ ] Compte `SUPER_ADMIN` créé avec un mot de passe fort, mot de passe initial changé.
- [ ] Région d'hébergement validée (voir ci-dessus).
- [ ] Restauration de sauvegarde testée.
- [ ] Mentions légales et politique de confidentialité publiées.
