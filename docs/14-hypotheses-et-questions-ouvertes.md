# 14 — Hypothèses par défaut et questions ouvertes

Quand une valeur est inconnue, **ne pas inventer** : appliquer l'hypothèse par défaut ci-dessous, la rendre **configurable** (paramètre du pressing ou de la plateforme) et l'indiquer dans le résumé de la phase. Mettre à jour ce document quand une réponse arrive.

## Hypothèses par défaut

| Sujet | Hypothèse | À confirmer avec |
|---|---|---|
| Prix du catalogue | Montants TTC (ce que paie le client) ; TVA extraite pour les factures | Responsable, comptable |
| TVA | Désactivée par défaut ; taux configurable, jamais en dur | Responsable |
| Remise nécessitant validation | Au-dessus de 10 % du sous-total | Responsable |
| Acompte | Exigé au-dessus de `[●]` FCFA, à hauteur de 50 % | Responsable |
| Délai de traitement par défaut | 2 jours, jusqu'au prochain jour de tournée | Responsable |
| Alerte « non retiré » | 30 jours après `READY` | Responsable |
| Jours de tournée | Deux jours par semaine, à choisir (par défaut mardi et vendredi) | Responsable |
| Préfixe de ticket | Aucun (numéro à 6 chiffres) | Responsable |
| Essai gratuit | 14 jours ; période de grâce 7 jours | Concepteur et Exploitant |
| Plan unique | `STANDARD`, 2 utilisateurs inclus, prix `[●]` | Concepteur et Exploitant |
| Prix des plans | `[●]` FCFA par mois et par an (jamais en dur dans le code) | Concepteur et Exploitant |
| Taux de partage | 50 % / 50 % (paramètre plateforme) | Contrat |
| Rôle de l'Exploitant | `PARTNER_VIEWER` : lecture seule | Contrat |
| Imprimante de tickets | Papier 80 mm, impression via le navigateur | Responsable (modèle exact) |
| Étiquettes | 50 × 30 mm, ou planche A4 | Responsable |
| Langue | Français ; structure prête pour l'anglais | — |
| Fuseau et monnaie | Africa/Douala ; XAF entier | — |

## Questions ouvertes

1. **Nom de domaine** (`lavio.[tld]`) et adresse e-mail de support.
2. **Région d'hébergement** (base, fonctions, stockage) et formalités liées à la loi 2024/017 : obligatoire avant toute donnée réelle.
3. **Textes légaux** : mentions légales, politique de confidentialité, conditions générales d'utilisation (Annexe 5 du contrat), accord de sous-traitance des données.
4. **Informations légales du pressing** à imprimer sur la facture : raison sociale, NIU, RCCM, adresse.
5. **Modèle exact de l'imprimante** et du PC (système d'exploitation, navigateur).
6. **Téléphone de la responsable** : Android ou iPhone (les notifications push exigent l'installation de la PWA sur iPhone).
7. **Qui effectue les tournées** et avec quel téléphone.
8. **Message WhatsApp par défaut** et horaires du service client.
9. **Politique de remboursement** d'un abonnement.
10. **Durée de conservation des photos** de dépôt.
11. **Paiement de l'utilisateur supplémentaire** : prix et facturation.

## Décisions techniques à consigner

Créer `docs/DECISIONS.md` et y noter, à chaque décision : date, contexte, choix, alternatives écartées. Exemples attendus : méthode de déploiement NestJS sur Vercel, adaptateur Prisma, bibliothèque de PDF, librairie de graphiques, stratégie d'isolation (filtre applicatif seul ou RLS en plus), prérendu de la landing.
