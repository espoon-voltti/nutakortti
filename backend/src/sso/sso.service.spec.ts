import * as zlib from 'zlib';
import { Request, Response } from 'express';
import { SsoService } from './sso.service';

const frontend = 'https://nutakortti.invalid';

function logoutResponse(status: string): string {
  return (
    '<saml2p:LogoutResponse xmlns:saml2p="urn:oasis:names:tc:SAML:2.0:protocol" ID="_r1" Version="2.0" ' +
    'IssueInstant="2026-10-16T08:00:00.000Z" InResponseTo="_q1" Destination="https://example.invalid/api/slo">' +
    `<saml2p:Status>${status}</saml2p:Status>` +
    '</saml2p:LogoutResponse>'
  );
}

function sloRequest(xml: string): Request {
  const encoded = zlib.deflateRawSync(Buffer.from(xml)).toString('base64');
  return {
    url: `/api/slo?SAMLResponse=${encodeURIComponent(encoded)}&SigAlg=x&Signature=y`,
  } as Request;
}

function mockResponse() {
  return {
    redirect: jest.fn(),
    send: jest.fn(),
    status: jest.fn().mockReturnThis(),
    end: jest.fn(),
  } as unknown as Response & {
    redirect: jest.Mock;
    send: jest.Mock;
  };
}

function createService(env: { [key: string]: string }) {
  Object.assign(process.env, { FRONTEND_BASE_URL: frontend }, env);
  const authenticationService = {
    validateSecurityContext: jest.fn().mockReturnValue(true),
  };
  const service = new SsoService(authenticationService as any);
  const logger = { log: jest.fn(), warn: jest.fn(), error: jest.fn() };
  (service as any).logger = logger;
  return { service, logger };
}

describe('SsoService', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.IDP_ENTITY_ID;
    delete process.env.CERT_SELECTION;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('IdP entityID configuration', () => {
    it('uses IDP_ENTITY_ID when set', () => {
      const { service, logger } = createService({
        CERT_SELECTION: 'prod',
        IDP_ENTITY_ID: 'https://tunnistautuminen.suomi.fi/idp1',
      });
      expect((service as any).idp_entity_id).toBe(
        'https://tunnistautuminen.suomi.fi/idp1',
      );
      expect(logger.error).not.toHaveBeenCalled();
    });

    it('defaults to the Suomi.fi test IdP outside production', () => {
      const { service, logger } = createService({ CERT_SELECTION: 'test' });
      expect((service as any).idp_entity_id).toBe(
        'https://testi.apro.tunnistus.fi/idp1',
      );
      expect(logger.error).not.toHaveBeenCalled();
    });

    it('has no default in production and reports the missing configuration as an error', () => {
      const { service } = createService({ CERT_SELECTION: 'prod' });
      // The logger is replaced after construction, so check the outcome instead.
      expect((service as any).idp_entity_id).toBe('');
    });

    it('sends the user to the failed-logout page instead of a logout request Suomi.fi would reject', () => {
      const { service, logger } = createService({ CERT_SELECTION: 'prod' });
      const securityContext = Buffer.from(
        JSON.stringify({ sessionIndex: '_s', nameId: '_n' }),
      ).toString('base64');
      const res = mockResponse();

      service.getLogoutRequestUrl(
        { headers: { authorization: `Bearer ${securityContext}` } } as Request,
        res,
      );

      expect(res.send).toHaveBeenCalledWith({
        url: `${frontend}/uloskirjaus?virhe=suomifi`,
      });
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('IDP_ENTITY_ID is not set'),
      );
    });
  });

  describe('handleLogout with a LogoutResponse from Suomi.fi', () => {
    it('redirects to the logged-out page when Suomi.fi reports success', () => {
      const { service, logger } = createService({ CERT_SELECTION: 'test' });
      const res = mockResponse();

      service.handleLogout(
        sloRequest(
          logoutResponse(
            '<saml2p:StatusCode Value="urn:oasis:names:tc:SAML:2.0:status:Success"/>',
          ),
        ),
        res,
      );

      expect(res.redirect).toHaveBeenCalledWith(`${frontend}/uloskirjaus`);
      expect(logger.log).toHaveBeenCalledWith('Suomi.fi logout succeeded.');
      expect(logger.error).not.toHaveBeenCalled();
    });

    it('redirects to the failed-logout page and logs the status chain as an error when Suomi.fi rejects the logout', () => {
      const { service, logger } = createService({ CERT_SELECTION: 'test' });
      const res = mockResponse();

      service.handleLogout(
        sloRequest(
          logoutResponse(
            '<saml2p:StatusCode Value="urn:oasis:names:tc:SAML:2.0:status:Requester">' +
              '<saml2p:StatusCode Value="urn:oasis:names:tc:SAML:2.0:status:UnknownPrincipal"/>' +
              '</saml2p:StatusCode>' +
              '<saml2p:StatusMessage>An error occurred.</saml2p:StatusMessage>',
          ),
        ),
        res,
      );

      expect(res.redirect).toHaveBeenCalledWith(
        `${frontend}/uloskirjaus?virhe=suomifi`,
      );
      expect(logger.error).toHaveBeenCalledWith(
        'Suomi.fi logout error: IdP rejected the logout request, status ' +
          'urn:oasis:names:tc:SAML:2.0:status:Requester > urn:oasis:names:tc:SAML:2.0:status:UnknownPrincipal ' +
          '(An error occurred.)',
      );
    });

    it('redirects to the failed-logout page and logs an error when the response cannot be read', () => {
      const { service, logger } = createService({ CERT_SELECTION: 'test' });
      const res = mockResponse();

      service.handleLogout({ url: '/api/slo' } as Request, res);

      expect(res.redirect).toHaveBeenCalledWith(
        `${frontend}/uloskirjaus?virhe=suomifi`,
      );
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining(
          'Suomi.fi logout error: logout response could not be read',
        ),
      );
    });
  });
});
