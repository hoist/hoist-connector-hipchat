import {
  OAuth2ConnectorBase
}
from '@hoist/oauth-connector';
import request from 'request-promise';
import moment from 'moment';
import {
  merge
}
from 'lodash';
import logger from '@hoist/logger';
import config from 'config';
let overrides = {

};
let apiBaseUri = `https://api.hipchat.com/v2`;
/**
 * A Hoist Connector for connecting to GitHub
 * @extends {OAuthConnectorBase}
 */
export default class HipChat extends OAuth2ConnectorBase {

  /**
   * create a new connector
   * @param {object} configuration - the configuration properties to use
   */
  constructor(configuration) {
    super(merge({}, configuration, overrides));
    this._configuration = configuration;
    this._logger = logger.child({
      cls: this.constructor.name
    });
  }

  /**
   * @override
   */
  receiveBounce(authorization) {
    var authStep = authorization.get('currentStep');
    if (!authStep) {
      //no authorization has been done yet so lets get the authorization url and redirect the user there
      let configuration = {
        "description": this._configuration.description,
        "key": "io.hoist." + authorization.key,
        "name": this._configuration.name,
        "vendor": {
          "name": this._configuration.vendorName,
          "url": this._configuration.vendorUrl
        },
        "links": {
          "self": `https://${config.get('Hoist.domains.bouncer')}/info/${authorization.key}`
        },
        "capabilities": {
          "hipchatApiConsumer": {
            "scopes": this._configuration.scopes.split(','),
            "fromName": this._configuration.name
          },
          "installable": {
            "allowGlobal": true,
            "allowRoom": true,
            "callbackUrl": `https://${config.get('Hoist.domains.bouncer')}/configure/${authorization.key}`,
            "installedUrl": `https://${config.get('Hoist.domains.bouncer')}/bounce`
          },
          "webhook": [{
            "name": `${this._configuration.webhookName}`,
            "pattern": `${this._configuration.webhookPattern}`,
            "event": "room_message",
            "url": `https://${config.get('Hoist.domains.endpoint')}/connector/${authorization.key}`
          }]
        }
      };
      this._logger.info({
        configuration
      });
      return authorization.redirect(`https://www.hipchat.com/addons/install?url=data:application/json;base64,${new Buffer(JSON.stringify(configuration)).toString('base64')}`)
    } else {
      return authorization.done();
    }
  }
  authorize(authorization) {
    this._authorization = authorization;
    this._configureClient({
      clientId: authorization.get('clientId'),
      clientSecret: authorization.get('clientSecret'),
      baseSite: `https://www.hipchat.com/`
    });
    super.authorize(authorization);
  }
  intercept(authorization) {
    return authorization.raise(this._configuration._connectorKey + ':new:message', authorization.payload);
  }
  get(path) {
    let uri = `${apiBaseUri}${path}`;
    return this._performRequest('GET', uri).then((result) => {
      return JSON.parse(result[0]);
    });
  }
  post(path, body) {
    let uri = `${apiBaseUri}${path}`;
    return this._performRequest('POST', uri, body).then((result) => {
      if (result && result[0] && result[0].length > 0) {
        return JSON.parse(result[0]);
      }
    });
  }
  patch(path, body) {
    let uri = `${apiBaseUri}${path}`;
    return this._performRequest('PATCH', uri, body).then((result) => {
      return JSON.parse(result[0]);
    });
  }
  delete(path) {
    let uri = `${apiBaseUri}${path}`;
    return this._performRequest('DELETE', uri);
  }
  _performRequest(...args) {
    let expiresAt = this._authorization.get('ExpiresAt');
    return Promise.resolve()
      .then(() => {
        if (moment().isAfter(expiresAt)) {
          return this._refreshAccessToken(this._authorization);
        }
      }).then(() => {
        return super._performRequest(...args);
      });

  }
  _refreshAccessToken(authorization) {
    return request({
        method: 'GET',
        url: `${apiBaseUri}/capabilities`,
        json: true
      })
      .then((response) => {

        return request({
          method: 'POST',
          url: response.capabilities.oauth2Provider.tokenUrl,
          auth: {
            username: authorization.get('clientId'),
            password: authorization.get('clientSecret')
          },
          body: {
            grant_type: 'client_credentials',
            scope: this._configuration.scopes.split(',')
          },
          json: true
        });
      }).then((response) => {
        return authorization.set('AccessToken', response['access_token'])
          .then(() => {
            return authorization.set('ExpiresAt', moment().utc().add(response['expires_in'], 'seconds').toDate());
          }).then(() => {
            return authorization.setDisplayProperty('GroupName', response['group_name']);
          });
      });
  }
  configure(authorization) {
    this._logger.info({
      payload: authorization.payload,
      configuration: this._configuration
    }, 'configure');
    return authorization.set('clientId', authorization.payload.oauthId)
      .then(() => {
        return authorization.set('clientSecret', authorization.payload.oauthSecret);
      }).then(() => {
        return authorization.set('groupId', authorization.payload.groupId);
      }).then(() => {
        return authorization.set('CapabilitiesUrl', authorization.payload.capabilitiesUrl);
      }).then(() => {
        return this._refreshAccessToken(authorization).then(() => {
          return authorization.set('currentStep', 'configured');
        });
      }).then(() => {
        return authorization.done();
      });
  }
}
