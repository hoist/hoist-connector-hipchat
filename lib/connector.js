'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _get = function get(object, property, receiver) { if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

var _oauthConnector = require('@hoist/oauth-connector');

var _requestPromise = require('request-promise');

var _requestPromise2 = _interopRequireDefault(_requestPromise);

var _moment = require('moment');

var _moment2 = _interopRequireDefault(_moment);

var _lodash = require('lodash');

var _logger = require('@hoist/logger');

var _logger2 = _interopRequireDefault(_logger);

var _config = require('config');

var _config2 = _interopRequireDefault(_config);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var overrides = {};
var apiBaseUri = 'https://api.hipchat.com/v2';
/**
 * A Hoist Connector for connecting to GitHub
 * @extends {OAuthConnectorBase}
 */

var HipChat = function (_OAuth2ConnectorBase) {
  _inherits(HipChat, _OAuth2ConnectorBase);

  /**
   * create a new connector
   * @param {object} configuration - the configuration properties to use
   */

  function HipChat(configuration) {
    _classCallCheck(this, HipChat);

    var _this = _possibleConstructorReturn(this, Object.getPrototypeOf(HipChat).call(this, (0, _lodash.merge)({}, configuration, overrides)));

    _this._configuration = configuration;
    _this._logger = _logger2.default.child({
      cls: _this.constructor.name
    });
    return _this;
  }

  /**
   * @override
   */


  _createClass(HipChat, [{
    key: 'receiveBounce',
    value: function receiveBounce(authorization) {
      var authStep = authorization.get('currentStep');
      if (!authStep) {
        //no authorization has been done yet so lets get the authorization url and redirect the user there
        var configuration = {
          "description": this._configuration.description,
          "key": "io.hoist." + authorization.key,
          "name": this._configuration.name,
          "vendor": {
            "name": this._configuration.vendorName,
            "url": this._configuration.vendorUrl
          },
          "links": {
            "self": 'https://' + _config2.default.get('Hoist.domains.bouncer') + '/info/' + authorization.key
          },
          "capabilities": {
            "hipchatApiConsumer": {
              "scopes": this._configuration.scopes.split(','),
              "fromName": this._configuration.name
            },
            "installable": {
              "allowGlobal": true,
              "allowRoom": true,
              "callbackUrl": 'https://' + _config2.default.get('Hoist.domains.bouncer') + '/configure/' + authorization.key,
              "installedUrl": 'https://' + _config2.default.get('Hoist.domains.bouncer') + '/bounce'
            },
            "webhook": [{
              "name": '' + this._configuration.webhookName,
              "pattern": '' + this._configuration.webhookPattern,
              "event": "room_message",
              "url": 'https://' + _config2.default.get('Hoist.domains.endpoint') + '/connector/' + authorization.key
            }]
          }
        };
        this._logger.info({
          configuration: configuration
        });
        return authorization.redirect('https://www.hipchat.com/addons/install?url=data:application/json;base64,' + new Buffer(JSON.stringify(configuration)).toString('base64'));
      } else {
        return authorization.done();
      }
    }
  }, {
    key: 'authorize',
    value: function authorize(authorization) {
      this._authorization = authorization;
      this._configureClient({
        clientId: authorization.get('clientId'),
        clientSecret: authorization.get('clientSecret'),
        baseSite: 'https://www.hipchat.com/'
      });
      _get(Object.getPrototypeOf(HipChat.prototype), 'authorize', this).call(this, authorization);
    }
  }, {
    key: 'intercept',
    value: function intercept(authorization) {
      return authorization.raise(this._configuration._connectorKey + ':new:message', authorization.payload);
    }
  }, {
    key: 'get',
    value: function get(path) {
      var uri = '' + apiBaseUri + path;
      return this._performRequest('GET', uri).then(function (result) {
        return JSON.parse(result);
      });
    }
  }, {
    key: 'post',
    value: function post(path, body) {
      var uri = '' + apiBaseUri + path;
      return this._performRequest('POST', uri, body).then(function (result) {
        if (result && result.length > 0) {
          return JSON.parse(result);
        }
      });
    }
  }, {
    key: 'patch',
    value: function patch(path, body) {
      var uri = '' + apiBaseUri + path;
      return this._performRequest('PATCH', uri, body).then(function (result) {
        return JSON.parse(result);
      });
    }
  }, {
    key: 'delete',
    value: function _delete(path) {
      var uri = '' + apiBaseUri + path;
      return this._performRequest('DELETE', uri);
    }
  }, {
    key: '_performRequest',
    value: function _performRequest() {
      var _this2 = this;

      for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
        args[_key] = arguments[_key];
      }

      var expiresAt = this._authorization.get('ExpiresAt');
      return Promise.resolve().then(function () {
        if ((0, _moment2.default)().isAfter(expiresAt)) {
          return _this2._refreshAccessToken(_this2._authorization);
        }
      }).then(function () {
        var _get2;

        return (_get2 = _get(Object.getPrototypeOf(HipChat.prototype), '_performRequest', _this2)).call.apply(_get2, [_this2].concat(args));
      });
    }
  }, {
    key: '_refreshAccessToken',
    value: function _refreshAccessToken(authorization) {
      var _this3 = this;

      return (0, _requestPromise2.default)({
        method: 'GET',
        url: apiBaseUri + '/capabilities',
        json: true
      }).then(function (response) {

        return (0, _requestPromise2.default)({
          method: 'POST',
          url: response.capabilities.oauth2Provider.tokenUrl,
          auth: {
            username: authorization.get('clientId'),
            password: authorization.get('clientSecret')
          },
          body: {
            grant_type: 'client_credentials',
            scope: _this3._configuration.scopes.split(',')
          },
          json: true
        });
      }).then(function (response) {
        return authorization.set('AccessToken', response['access_token']).then(function () {
          return authorization.set('ExpiresAt', (0, _moment2.default)().utc().add(response['expires_in'], 'seconds').toDate());
        }).then(function () {
          return authorization.setDisplayProperty('GroupName', response['group_name']);
        });
      });
    }
  }, {
    key: 'configure',
    value: function configure(authorization) {
      var _this4 = this;

      this._logger.info({
        payload: authorization.payload,
        configuration: this._configuration
      }, 'configure');
      return authorization.set('clientId', authorization.payload.oauthId).then(function () {
        return authorization.set('clientSecret', authorization.payload.oauthSecret);
      }).then(function () {
        return authorization.set('groupId', authorization.payload.groupId);
      }).then(function () {
        return authorization.set('CapabilitiesUrl', authorization.payload.capabilitiesUrl);
      }).then(function () {
        return _this4._refreshAccessToken(authorization).then(function () {
          return authorization.set('currentStep', 'configured');
        });
      }).then(function () {
        return authorization.done();
      });
    }
  }]);

  return HipChat;
}(_oauthConnector.OAuth2ConnectorBase);

exports.default = HipChat;
//# sourceMappingURL=connector.js.map
