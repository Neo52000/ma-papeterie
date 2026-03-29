# Variables d'environnement — Brevo CRM

Variables requises pour l'intégration Brevo (contact sync + emails transactionnels).

## Configuration

Ces variables doivent etre ajoutees dans **Supabase Dashboard > Edge Functions > Secrets**.
Elles ne sont **jamais** exposees cote frontend.

| Variable | Description | Exemple |
|----------|-------------|---------|
| `BREVO_API_KEY` | Cle API Brevo v3 (Settings > API Keys dans Brevo) | `xkeysib-abc123...` |
| `BREVO_LIST_ID_CLIENTS` | ID de la liste "Clients confirmes" dans Brevo | `3` |
| `BREVO_TEMPLATE_ORDER_CONFIRM` | ID du template email de confirmation de commande | `1` |

## Edge Functions concernees

- `brevo-sync-contact` : utilise `BREVO_API_KEY` + `BREVO_LIST_ID_CLIENTS`
- `brevo-send-transactional` : utilise `BREVO_API_KEY` + `BREVO_TEMPLATE_ORDER_CONFIRM`

## Obtenir les valeurs

1. **BREVO_API_KEY** : Brevo > Settings > SMTP & API > API Keys > Generate a new API key
2. **BREVO_LIST_ID_CLIENTS** : Brevo > Contacts > Lists > copier l'ID de la liste cible
3. **BREVO_TEMPLATE_ORDER_CONFIRM** : Brevo > Campaigns > Templates > copier l'ID du template

## Attributs Brevo synchronises

Le contact Brevo est mis a jour avec les attributs suivants :

| Attribut | Type | Description |
|----------|------|-------------|
| `PRENOM` | Text | Prenom du client (depuis display_name) |
| `NOM` | Text | Nom du client (depuis display_name) |
| `DERNIER_ACHAT` | Date | Date de la derniere commande confirmee |
| `NB_COMMANDES` | Number | Nombre total de commandes confirmees |
| `MONTANT_TOTAL_TTC` | Number | Montant cumule TTC des commandes confirmees |

Ces attributs doivent etre crees dans Brevo > Contacts > Settings > Contact attributes.
