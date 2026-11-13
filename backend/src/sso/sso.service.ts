/* tslint:disable variable-name */

import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Request, Response } from 'express';
import * as saml2 from 'saml2-js';
import * as fs from 'fs';
import * as url from 'url';
import {
  LogoutStatus,
  SAMLHelper,
  SAML_STATUS_UNKNOWN_PRINCIPAL,
} from './samlhelper';
import { AcsDto, SecurityContextDto } from '../authentication/dto';
import { AuthenticationService } from '../authentication/authentication.service';

const SAML_STATUS_REQUESTER = 'urn:oasis:names:tc:SAML:2.0:status:Requester';

// Read SFI IDP certs from SUOMIFI_IDP_CERT_<year> env vars (injected from SSM;
// the year scheme makes IdP key rollover an infra-only change).
// saml2-js expects raw base64 — strip PEM headers if present.
// Falls back to cert files a developer has placed in certs/ (gitignored) for
// local development against the Suomi.fi test environment.
function sfiIdpCerts(certSelection: string): string[] {
  const fromEnv = Object.entries(process.env)
    .filter(([k]) => k.startsWith('SUOMIFI_IDP_CERT_'))
    .map(([, v]) => (v ?? '').replace(/-----[^\n]+-----/g, '').replace(/\s+/g, ''))
    .filter(Boolean);
  if (fromEnv.length > 0) return fromEnv;
  return [1, 2]
    .map((n) => `certs/tunnistus-${certSelection}-${n}.cer`)
    .filter((path) => fs.existsSync(path))
    .map((path) => fs.readFileSync(path).toString().trim());
}

// The service's own certificate: SP_CERT env var (injected by infra), or a
// locally placed file (gitignored) for development.
function spCertificate(certSelection: string): string {
  if (process.env.SP_CERT) {
    return process.env.SP_CERT.replace(/\\n/g, '\n');
  }
  const localFile = `certs/nutakortti-${certSelection}.cer`;
  return fs.existsSync(localFile)
    ? fs.readFileSync(localFile).toString()
    : '';
}

const TEST_IDP_ENTITY_ID = 'https://testi.apro.tunnistus.fi/idp1';

// Suomi.fi requires the single logout request to carry the IdP's entityID as
// the NameQualifier of the NameID. The test and production IdPs have different
// entityIDs, so production must get it from the environment (nutakortti-infra):
// the test default would make Suomi.fi reject every production logout.
function suomifiIdpEntityId(cert_selection: string): string {
  if (process.env.IDP_ENTITY_ID) {
    return process.env.IDP_ENTITY_ID;
  }
  return cert_selection === 'prod' ? '' : TEST_IDP_ENTITY_ID;
}

@Injectable()
export class SsoService {
  private readonly entity_id: string;
  private readonly idp_entity_id: string;
  private readonly sp: saml2.ServiceProvider;
  private readonly idp: saml2.IdentityProvider;
  private readonly samlHelper: SAMLHelper;
  private readonly frontend_base_url: string;
  private readonly logger = new Logger('SSO Service');

  constructor(private readonly authenticationService: AuthenticationService) {
    // This is for local testing if you have the private key.
    let pkey = '';
    if (fs.existsSync('./certs/nutakortti-test_private_key.pem')) {
      pkey = fs
        .readFileSync('certs/nutakortti-test_private_key.pem')
        .toString();
    }

    // NOTE: Default configuration variables refer to AWS and Suomi.fi-tunnistus test environments.
    const cert_selection = process.env.CERT_SELECTION || 'test';
    this.entity_id =
      process.env.SP_ENTITY_ID || 'https://nutakortti-test.vantaa.fi';
    this.frontend_base_url =
      process.env.FRONTEND_BASE_URL || 'http://localhost:3001';

    const sp_options = {
      entity_id: this.entity_id,
      private_key: !!process.env.SP_PKEY
        ? process.env.SP_PKEY.replace(/\\n/g, '\n')
        : pkey,
      certificate: spCertificate(cert_selection),
      assert_endpoint:
        process.env.SP_ASSERT_ENDPOINT ||
        'https://api.mobiilinuta-admin-test.com/api/acs',
      sign_get_request: true,
      allow_unencrypted_assertion: false,
    };
    this.sp = new saml2.ServiceProvider(sp_options);

    const idp_options = {
      sso_login_url:
        process.env.SSO_LOGIN_URL ||
        'https://testi.apro.tunnistus.fi/idp/profile/SAML2/Redirect/SSO',
      sso_logout_url:
        process.env.SSO_LOGOUT_URL ||
        'https://testi.apro.tunnistus.fi/idp/profile/SAML2/Redirect/SLO',
      certificates: sfiIdpCerts(cert_selection),
    };
    this.idp = new saml2.IdentityProvider(idp_options);

    if (!sp_options.certificate || idp_options.certificates.length === 0) {
      this.logger.warn(
        'Suomi.fi SSO is not fully configured (missing SP_CERT or SUOMIFI_IDP_CERT_* certificates); SSO endpoints will fail',
      );
    }

    this.idp_entity_id = suomifiIdpEntityId(cert_selection);
    if (!this.idp_entity_id) {
      this.logger.error(
        'Suomi.fi logout configuration error: IDP_ENTITY_ID is not set and CERT_SELECTION=prod has no default; Suomi.fi logout will fail until it is set',
      );
    }

    this.samlHelper = new SAMLHelper(
      sp_options.private_key,
      idp_options.sso_logout_url,
      { idp_entity_id: this.idp_entity_id, sp_entity_id: this.entity_id },
    );
  }

  // The page that tells the user the service session has ended.
  private logoutDonePageUrl(): string {
    return `${this.frontend_base_url}/uloskirjaus`;
  }

  // The page that tells the user the service session has ended but Suomi.fi
  // single logout did not succeed, and what to do about it.
  private logoutFailedPageUrl(): string {
    return `${this.frontend_base_url}/uloskirjaus?virhe=suomifi`;
  }

  getLoginRequestUrl(res: Response) {
    this.sp.create_login_request_url(
      this.idp,
      {},
      (err, login_url, request_id) => {
        this.logger.log('Created login request, ID: ' + request_id);
        if (this._handleError(err, res)) return;

        res.send({ url: login_url });
      },
    );
  }

  handleLoginResponse(req: Request, res: Response) {
    const options = { request_body: req.body };
    const response = this.sp.post_assert(
      this.idp,
      options,
      (err, saml_response) => {
        // If the user cancels the authentication or SAML response status is not success, there will be an error.
        if (this._handleError(err, res)) return;

        this.logger.log(
          'Got login response, session index: ' +
            saml_response.user.session_index,
        );

        // For eIDAS logins the surname comes from a different attribute.
        const user_surname =
          this._getUserAttribute(
            saml_response.user.attributes,
            'http://eidas.europa.eu/attributes/naturalperson/CurrentFamilyName',
          ) ||
          this._getUserAttribute(
            saml_response.user.attributes,
            'urn:oid:2.5.4.4',
          );

        const acs_data = {
          sessionIndex: saml_response.user.session_index,
          nameId: saml_response.user.name_id,
          // Note: there might be several names, separated by spaces in a single string.
          firstName: this._getUserAttribute(
            saml_response.user.attributes,
            'http://eidas.europa.eu/attributes/naturalperson/CurrentGivenName',
          ),
          lastName: user_surname,
          zipCode: this._getUserAttribute(
            saml_response.user.attributes,
            'urn:oid:1.2.246.517.2002.2.6',
          ),
        } as AcsDto;

        const sc = this.authenticationService.generateSecurityContext(acs_data);
        const querystr = Buffer.from(JSON.stringify(sc))
          .toString('base64')
          .replace(/\+/g, '-')
          .replace(/\//g, '_')
          .replace(/\=+$/, '');
        const redirectUrl = `${this.frontend_base_url}/hakemus?sc=${querystr}`;
        res.redirect(redirectUrl);
      },
    );
  }

  getLogoutRequestUrl(req: Request, res: Response) {
    let sc_token: any = {};
    const token = req.headers.authorization;
    if (token.startsWith('Bearer ')) {
      const b64sc = token.slice(7, token.length);
      const binsc = Buffer.from(b64sc, 'base64').toString();
      sc_token = JSON.parse(binsc);
    }
    if (!sc_token) {
      this._handleError(new Error('Security context missing.'), res);
      return;
    }
    const sc = {
      sessionIndex: sc_token.sessionIndex,
      nameId: sc_token.nameId,
      firstName: sc_token.firstName,
      lastName: sc_token.lastName,
      zipCode: sc_token.zipCode,
      expiryTime: sc_token.expiryTime,
      signedString: sc_token.signedString,
    } as SecurityContextDto;

    if (!this.authenticationService.validateSecurityContext(sc)) {
      this._handleError(new Error('Security context invalid.'), res);
      return;
    }

    // The frontend has already dropped the service session. Without the IdP
    // entityID the logout request would be rejected, so send the user straight
    // to the page that tells what to do.
    if (!this.idp_entity_id) {
      this.logger.error(
        'Suomi.fi logout error: IDP_ENTITY_ID is not set, cannot create a logout request',
      );
      res.send({ url: this.logoutFailedPageUrl() });
      return;
    }

    const options = {
      name_id: sc_token.nameId,
      session_index: sc_token.sessionIndex,
    };

    this.sp.create_logout_request_url(this.idp, options, (err, logout_url) => {
      if (this._handleError(err, res)) return;

      this.logger.log(
        'Created logout request URL, session index: ' + options.session_index,
      );
      let fixed_logout_url = '';
      try {
        fixed_logout_url = this.samlHelper.fixMissingXMLAttributes(logout_url);
      } catch (ex) {
        this._handleError(ex.message, res);
        return;
      }

      res.send({ url: fixed_logout_url });
    });
  }

  // When SP initiates a logout and response comes from IdP, request will have a SAMLResponse.
  // When IdP initiates a logout, request will have a SAMLRequest.
  handleLogout(req: Request, res: Response) {
    const query = url.parse(req.url, true).query;
    const idp_initiated = 'SAMLRequest' in query;

    // We have to respond to the request if IdP-initiated.
    // NOTE: if going strictly along the specs, we should also logout the client at this point.
    // However, since the login info is stored only on client side, we do nothing here except
    // respond to the request. The security vulnerability attack vector this implies is
    // negligible in this case, so it's not worth complicating the system with backend login info.
    if (idp_initiated) {
      const request_id = this.samlHelper.getSAMLRequestId(
        query.SAMLRequest.toString(),
      );
      const options = {
        in_response_to: request_id,
      };
      this.sp.create_logout_response_url(
        this.idp,
        options,
        (err, response_url) => {
          this.logger.log(
            'Created logout response URL for request ID: ' +
              options.in_response_to,
          );
          res.redirect(response_url);
        },
      );
    } else {
      res.redirect(this.handleLogoutResponse(req.url));
    }
  }

  // The service session was already ended by the frontend before the Suomi.fi
  // round trip, so the user always lands on a logged-out page.
  //
  // Success means the Suomi.fi session ended too.
  //
  // Requester > UnknownPrincipal is how Suomi.fi answers when it has no
  // single-login session for the user any more, and that is routine: Suomi.fi
  // ends its SSO session after about 32 minutes, while our security context is
  // valid for 3600 s, so a user logging out 32-60 minutes after login still
  // sends a logout request; and eIDAS logins never leave a Suomi.fi session to
  // end at all. There is nothing left to log out of, so this is the normal
  // logged-out outcome. A NameQualifier that does not match the IdP entityID
  // produces exactly the same answer, which is why it is still logged as a
  // warning; that misconfiguration is checked separately at startup
  // (IDP_ENTITY_ID in the constructor).
  //
  // Any other status, or a response that cannot be read, means the Suomi.fi
  // session may still be alive: the user is told so and it is logged as an error.
  private handleLogoutResponse(req_url: string): string {
    let status: LogoutStatus;
    try {
      status = this.samlHelper.readLogoutStatus(req_url);
    } catch (ex) {
      this.logger.error(
        'Suomi.fi logout error: logout response could not be read: ' +
          ex.message,
      );
      return this.logoutFailedPageUrl();
    }
    const statusText =
      status.codes.join(' > ') + (status.message ? ` (${status.message})` : '');
    if (status.success) {
      this.logger.log('Suomi.fi logout succeeded.');
      return this.logoutDonePageUrl();
    }
    if (
      status.codes[0] === SAML_STATUS_REQUESTER &&
      status.codes.slice(1).includes(SAML_STATUS_UNKNOWN_PRINCIPAL)
    ) {
      this.logger.warn(
        `Suomi.fi had no session to end (expired or eIDAS login), status ${statusText}. ` +
          'A wrong NameQualifier (IdP entityID) would produce the same status.',
      );
      return this.logoutDonePageUrl();
    }
    this.logger.error(
      `Suomi.fi logout error: IdP rejected the logout request, status ${statusText}`,
    );
    return this.logoutFailedPageUrl();
  }

  private _getUserAttribute(
    user_attributes: { [attr: string]: string | string[] },
    attribute: string,
  ): string {
    const val =
      attribute in user_attributes ? user_attributes[attribute] : [''];
    return Array.isArray(val) ? val.join(' ') : '';
  }

  private _handleError(err: Error, res: Response): boolean {
    if (err != null) {
      this.logger.log('Error: ' + err);
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).send(err);
      res.end();
      return true;
    }
    return false;
  }
}
