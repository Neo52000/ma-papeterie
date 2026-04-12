Validate Shopify GraphQL queries and mutations using the Shopify AI Toolkit.

After writing any Shopify GraphQL code, validate it before returning to the user:

```bash
node .shopify-ai-toolkit/skills/shopify-admin/scripts/validate.mjs --model admin --client-name ma-papeterie --client-version 1.0.0 --artifact-id $ARGUMENTS --revision 1
```

DO NOT return GraphQL code until validate.mjs exits 0.
If validation fails, search for the error details and retry (up to 3 attempts).
