// The unit tests instantiate AppModule, whose AdSsoService builds a SAML client
// in its constructor. The mock config is self-contained; the real one needs the
// AD_SAML_* environment.
process.env.AD_MOCK = process.env.AD_MOCK || 'true';
