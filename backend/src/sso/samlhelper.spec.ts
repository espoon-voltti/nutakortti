import * as crypto from 'crypto';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as zlib from 'zlib';
import { SAMLHelper } from './samlhelper';

// Samples follow the shape the Suomi.fi (Shibboleth) IdP produces: saml2p/saml2
// prefixes, Issuer, Status. They carry no personal data.
const responseAttributes =
  'ID="_r1" Version="2.0" IssueInstant="2026-10-16T08:00:00.000Z" InResponseTo="_q1" Destination="https://example.invalid/api/slo"';
const issuer =
  '<saml2:Issuer xmlns:saml2="urn:oasis:names:tc:SAML:2.0:assertion">https://testi.apro.tunnistus.fi/idp1</saml2:Issuer>';

function logoutResponse(status: string, prefix = 'saml2p'): string {
  return (
    `<${prefix}:LogoutResponse xmlns:${prefix}="urn:oasis:names:tc:SAML:2.0:protocol" ${responseAttributes}>` +
    issuer +
    `<${prefix}:Status>${status}</${prefix}:Status>` +
    `</${prefix}:LogoutResponse>`
  );
}

// Redirect binding: the XML is deflated, base64 encoded and URL encoded into
// the SAMLResponse query parameter.
function sloRedirectUrl(xml: string): string {
  const encoded = zlib.deflateRawSync(Buffer.from(xml)).toString('base64');
  return `/api/slo?SAMLResponse=${encodeURIComponent(encoded)}&SigAlg=x&Signature=y`;
}

const success = logoutResponse(
  '<saml2p:StatusCode Value="urn:oasis:names:tc:SAML:2.0:status:Success"/>',
);

// What Suomi.fi answers when it does not recognise the session, e.g. because
// the NameQualifier does not match its own entityID.
const requesterUnknownPrincipal = logoutResponse(
  '<saml2p:StatusCode Value="urn:oasis:names:tc:SAML:2.0:status:Requester">' +
    '<saml2p:StatusCode Value="urn:oasis:names:tc:SAML:2.0:status:UnknownPrincipal"/>' +
    '</saml2p:StatusCode>' +
    '<saml2p:StatusMessage>An error occurred.</saml2p:StatusMessage>',
);

const successWithSamlpPrefix = logoutResponse(
  '<samlp:StatusCode Value="urn:oasis:names:tc:SAML:2.0:status:Success"/>',
  'samlp',
);

const options = {
  idp_entity_id: 'https://tunnistautuminen.suomi.fi/idp1',
  sp_entity_id: 'https://nuoriespoojasenkortti.espoo.fi',
};

describe('SAMLHelper.readLogoutStatus', () => {
  const helper = new SAMLHelper('', 'https://idp.invalid/SLO', options);

  it('recognises a successful logout', () => {
    expect(helper.readLogoutStatus(sloRedirectUrl(success))).toEqual({
      success: true,
      codes: ['urn:oasis:names:tc:SAML:2.0:status:Success'],
    });
  });

  it('returns the whole status code chain and the status message of a rejected logout', () => {
    expect(
      helper.readLogoutStatus(sloRedirectUrl(requesterUnknownPrincipal)),
    ).toEqual({
      success: false,
      codes: [
        'urn:oasis:names:tc:SAML:2.0:status:Requester',
        'urn:oasis:names:tc:SAML:2.0:status:UnknownPrincipal',
      ],
      message: 'An error occurred.',
    });
  });

  it('does not depend on the namespace prefix', () => {
    expect(
      helper.readLogoutStatus(sloRedirectUrl(successWithSamlpPrefix)).success,
    ).toBe(true);
  });

  it('throws when the SAMLResponse parameter is missing', () => {
    expect(() => helper.readLogoutStatus('/api/slo')).toThrow(
      'SAMLResponse parameter missing',
    );
  });

  it('throws when the SAMLResponse does not parse', () => {
    expect(() =>
      helper.readLogoutStatus('/api/slo?SAMLResponse=not-deflated-xml'),
    ).toThrow();
  });

  it('throws when the response has no status code', () => {
    expect(() =>
      helper.readLogoutStatus(sloRedirectUrl(logoutResponse(''))),
    ).toThrow('no StatusCode');
  });
});

describe('SAMLHelper.fixMissingXMLAttributes', () => {
  const { privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
  });
  const helper = new SAMLHelper(
    privateKey.export({ type: 'pkcs8', format: 'pem' }).toString(),
    'https://idp.invalid/SLO',
    options,
  );

  // What saml2-js produces: a LogoutRequest whose NameID has no attributes.
  const logoutRequest =
    '<samlp:LogoutRequest xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol" xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion" ' +
    'ID="_a" Version="2.0" IssueInstant="2026-10-16T08:00:00.000Z" Destination="https://idp.invalid/SLO">' +
    '<saml:Issuer>https://nuoriespoojasenkortti.espoo.fi</saml:Issuer>' +
    '<saml:NameID>_transient</saml:NameID>' +
    '<samlp:SessionIndex>_s</samlp:SessionIndex>' +
    '</samlp:LogoutRequest>';

  it('qualifies the NameID with the configured IdP and SP entityIDs and signs the request', () => {
    const encoded = zlib
      .deflateRawSync(Buffer.from(logoutRequest))
      .toString('base64');
    const fixedUrl = helper.fixMissingXMLAttributes(
      `https://idp.invalid/SLO?SAMLRequest=${encodeURIComponent(encoded)}`,
    );

    const query = new URL(fixedUrl).searchParams;
    const xml = zlib
      .inflateRawSync(Buffer.from(query.get('SAMLRequest'), 'base64'))
      .toString();
    expect(xml).toContain(
      'NameQualifier="https://tunnistautuminen.suomi.fi/idp1"',
    );
    expect(xml).toContain(
      'SPNameQualifier="https://nuoriespoojasenkortti.espoo.fi"',
    );
    expect(xml).toContain(
      'Format="urn:oasis:names:tc:SAML:2.0:nameid-format:transient"',
    );
    expect(xml).toContain('>_transient</saml:NameID>');
    expect(query.get('SigAlg')).toBe(
      'http://www.w3.org/2001/04/xmldsig-more#rsa-sha256',
    );
    expect(query.get('Signature')).toBeTruthy();
  });
});

// pixl-xml reads the file named by any string that does not start with '<', so
// a SAMLResponse that inflates to a path must be rejected before parsing. The
// files here hold valid messages, so reading them would change the result.
describe('SAMLHelper redirect message decoding', () => {
  const helper = new SAMLHelper('', 'https://idp.invalid/SLO', options);
  let dir: string;
  let responseFile: string;
  let requestFile: string;

  beforeAll(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'samlhelper-'));
    responseFile = path.join(dir, 'response.xml');
    fs.writeFileSync(responseFile, success);
    requestFile = path.join(dir, 'request.xml');
    fs.writeFileSync(
      requestFile,
      '<samlp:LogoutRequest xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol" ID="_from_disk"/>',
    );
  });

  afterAll(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  function encode(content: string): string {
    return zlib.deflateRawSync(Buffer.from(content)).toString('base64');
  }

  it('does not read a file named by the SAMLResponse', () => {
    expect(() => helper.readLogoutStatus(sloRedirectUrl(responseFile))).toThrow(
      'SAML message is not XML',
    );
  });

  it('does not read a file named by the SAMLRequest', () => {
    expect(helper.getSAMLRequestId(encode(requestFile))).toBe('');
    expect(helper.getSAMLRequestId(encode('  ' + requestFile))).toBe('');
  });

  it('still reads the ID of a SAMLRequest', () => {
    expect(
      helper.getSAMLRequestId(encode(fs.readFileSync(requestFile, 'utf8'))),
    ).toBe('_from_disk');
  });

  it('accepts whitespace before the XML', () => {
    expect(helper.readLogoutStatus(sloRedirectUrl('\n  ' + success))).toEqual({
      success: true,
      codes: ['urn:oasis:names:tc:SAML:2.0:status:Success'],
    });
  });

  it('refuses to inflate an oversized message', () => {
    const oversized = success.replace(
      '<saml2p:Status>',
      `<!--${' '.repeat(300 * 1024)}--><saml2p:Status>`,
    );
    expect(() => helper.readLogoutStatus(sloRedirectUrl(oversized))).toThrow(
      'Cannot create a Buffer larger than',
    );
    expect(helper.getSAMLRequestId(encode(oversized))).toBe('');
  });
});
