# Certificates

No certificates are committed to this repository. The deployed environments
receive them through environment variables, provisioned by
[nutakortti-infra](https://github.com/espoon-voltti/nutakortti-infra):

* `SUOMIFI_IDP_CERT_<year>` — the Suomi.fi Tunnistus IdP certificates, one per
  signing-key year so IdP key rollover is an infra-only change. Injected from
  SSM parameters `/{env}/nutakortti/suomifi/idp-certificate-<year>`, which the
  shared `voltti-infra/bin/update-sfi-idp-certs.py` keeps up to date from the
  Suomi.fi metadata.
* `SP_CERT` — this service's own SAML certificate (public), registered with the
  Suomi.fi IdP. The certificate files live in nutakortti-infra under
  `saml/suomifi/`.
* `SP_PKEY` — the corresponding private key, from an SSM SecureString.

## Local development

The Suomi.fi login cannot run against the real IdP locally without the real
key material. If you have it, place the files in this directory — they are
gitignored — and the service falls back to them when the environment variables
are not set:

* `tunnistus-test-1.cer`, `tunnistus-test-2.cer` — IdP certificates
* `nutakortti-test.cer` — SP certificate
* `nutakortti-test_private_key.pem` — SP private key; when present together
  with the SP certificate, the local dev server also starts in HTTPS mode
  (see `main.ts`)

Without them the service starts normally and logs a warning; only the
Suomi.fi SSO endpoints are non-functional.
