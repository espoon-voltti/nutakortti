/* tslint:disable variable-name */

import * as crypto from 'crypto';
import * as url from 'url';
import * as zlib from 'zlib';
import * as xmlbuilder from 'xmlbuilder2';
import * as XML from 'pixl-xml';
import { assignIn } from 'lodash';

export interface SAMLHelperOptions {
  // entityID of the Suomi.fi IdP, from its metadata. Differs between the test
  // and production environments.
  idp_entity_id: string;
  // Our own entityID as registered with Suomi.fi.
  sp_entity_id: string;
}

export const SAML_STATUS_SUCCESS = 'urn:oasis:names:tc:SAML:2.0:status:Success';

// The status of a LogoutResponse: the top-level StatusCode followed by any
// nested ones (e.g. Requester > UnknownPrincipal) and the optional
// StatusMessage. None of these contain personal data.
export interface LogoutStatus {
  success: boolean;
  codes: string[];
  message?: string;
}

export class SAMLHelper {
  private_key: string;
  sso_logout_url: string;
  private readonly idp_entity_id: string;
  private readonly sp_entity_id: string;

  constructor(
    private_key: string,
    sso_logout_url: string,
    options: SAMLHelperOptions,
  ) {
    this.private_key = private_key;
    this.sso_logout_url = sso_logout_url;
    this.idp_entity_id = options.idp_entity_id;
    this.sp_entity_id = options.sp_entity_id;
  }

  /*
  According to Suomi.fi documentation, the NameID element should have the following three attributes:

    Format="urn:oasis:names:tc:SAML:2.0:nameid-format:transient" (a constant)
    NameQualifier=(the IdP entityID, e.g. "https://testi.apro.tunnistus.fi/idp1" in the test environment)
    SPNameQualifier=(Espoo EntityID)

  If these attributes are not provided, the StatusCode in the Response SAML will be erroneous.
  Saml2-js builds the XML using xmlbuilder but does not provide a way at the moment for giving extra attributes.
  We modify the contents manually and take care of base64 encoding, zlib deflating, modifying the XML, and signing.
  */
  fixMissingXMLAttributes(logout_url: string): string {
    // url parses %2B from the query string as spaces, so we replace them with +
    const old_saml_request = url
      .parse(decodeURIComponent(logout_url), true)
      .query.SAMLRequest.toString()
      .replace(/ /g, '+');
    const deflated = Buffer.from(old_saml_request, 'base64');
    const xml_string = zlib.inflateRawSync(deflated).toString();
    const xml_json = XML.parse(xml_string, { preserveAttributes: true });

    const fixed_xml = xmlbuilder
      .create({
        'samlp:LogoutRequest': {
          '@xmlns:samlp': xml_json._Attribs['xmlns:samlp'],
          '@xmlns:saml': xml_json._Attribs['xmlns:saml'],
          '@ID': xml_json._Attribs.ID,
          '@Version': xml_json._Attribs.Version,
          '@IssueInstant': xml_json._Attribs.IssueInstant,
          '@Destination': xml_json._Attribs.Destination,
          'saml:Issuer': xml_json['saml:Issuer'],
          'saml:NameID': {
            '@Format': 'urn:oasis:names:tc:SAML:2.0:nameid-format:transient',
            '@NameQualifier': this.idp_entity_id,
            '@SPNameQualifier': this.sp_entity_id,
            '#text': xml_json['saml:NameID'],
          },
          'samlp:SessionIndex': xml_json['samlp:SessionIndex'],
        },
      })
      .end();

    const new_saml_request = zlib.deflateRawSync(fixed_xml).toString('base64');
    const query = this._signSamlRequest(new_saml_request);
    const new_logout_url = url.parse(this.sso_logout_url, true);
    new_logout_url.query = assignIn(query, new_logout_url.query);
    new_logout_url.search = null;
    new_logout_url.query = query;
    return url.format(new_logout_url);
  }

  // Reads the status of the LogoutResponse the IdP redirected the browser back with.
  // Throws if the SAMLResponse parameter is missing or does not parse; a
  // non-success status is a normal return value so that the caller can log it.
  readLogoutStatus(req_url: string): LogoutStatus {
    const response = url.parse(req_url, true).query.SAMLResponse;
    if (!response) {
      throw new Error('SAMLResponse parameter missing from logout redirect');
    }
    const deflated = Buffer.from(response.toString(), 'base64');
    const xml_string = zlib.inflateRawSync(deflated).toString();
    const logout_response = XML.parse(xml_string, { preserveAttributes: true });

    // The status is nested like this (Suomi.fi uses the saml2p prefix, the
    // SAML specification does not promise any particular prefix):
    // <saml2p:Status>
    //   <saml2p:StatusCode Value="urn:oasis:names:tc:SAML:2.0:status:Requester">
    //     <saml2p:StatusCode Value="urn:oasis:names:tc:SAML:2.0:status:UnknownPrincipal"/>
    //   </saml2p:StatusCode>
    //   <saml2p:StatusMessage>An error occurred.</saml2p:StatusMessage>
    // </saml2p:Status>
    const status = childByLocalName(logout_response, 'Status');
    const codes: string[] = [];
    let status_code = childByLocalName(status, 'StatusCode');
    while (status_code && status_code._Attribs && status_code._Attribs.Value) {
      codes.push(status_code._Attribs.Value);
      status_code = childByLocalName(status_code, 'StatusCode');
    }
    if (codes.length === 0) {
      throw new Error('LogoutResponse has no StatusCode');
    }
    const message = childByLocalName(status, 'StatusMessage');
    return {
      success: codes[0] === SAML_STATUS_SUCCESS,
      codes,
      ...(typeof message === 'string' ? { message } : {}),
    };
  }

  getSAMLRequestId(saml_request: string): string {
    let id = '';
    try {
      const deflated = Buffer.from(saml_request, 'base64');
      const xml_string = zlib.inflateRawSync(deflated).toString();
      const xml_json = XML.parse(xml_string, { preserveAttributes: true });
      id = xml_json._Attribs.ID;
    } catch {
      // Fall through
    }
    return id;
  }

  private _signSamlRequest(saml_request: string) {
    const saml_request_data = 'SAMLRequest=' + encodeURIComponent(saml_request);
    const sigalg_data =
      '&SigAlg=' +
      encodeURIComponent('http://www.w3.org/2001/04/xmldsig-more#rsa-sha256');
    const sign = crypto.createSign('RSA-SHA256');
    sign.update(saml_request_data + sigalg_data);

    let samlQueryString;
    samlQueryString = {};
    samlQueryString.SAMLRequest = saml_request;
    samlQueryString.SigAlg =
      'http://www.w3.org/2001/04/xmldsig-more#rsa-sha256';
    samlQueryString.Signature = sign.sign(this.private_key, 'base64');
    return samlQueryString;
  }
}

// pixl-xml keeps the namespace prefix in the key ("saml2p:Status").
function childByLocalName(node: any, local_name: string): any {
  if (!node || typeof node !== 'object') {
    return undefined;
  }
  const key = Object.keys(node).find(
    (k) => k === local_name || k.endsWith(':' + local_name),
  );
  return key === undefined ? undefined : node[key];
}
